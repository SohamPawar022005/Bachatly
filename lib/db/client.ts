import type { DatabaseClient, Row } from './types'
import { getPool } from './pool'

/**
 * Database client resolution.
 *
 * Order:
 *  1. `BACHATLY_DB_ADAPTER=pg`  -> always node-postgres
 *  2. `BACHATLY_DB_ADAPTER=prisma` -> always Prisma (throws if unavailable)
 *  3. unset -> try Prisma, silently fall back to node-postgres
 *
 * The Prisma client is loaded lazily and through a non-statically-analysable
 * specifier because `generated/prisma/client` only exists after
 * `prisma generate` has run.
 */

type AnyPrisma = {
  $queryRawUnsafe: <T>(sql: string, ...params: unknown[]) => Promise<T>
  $executeRawUnsafe: (sql: string, ...params: unknown[]) => Promise<number>
  $transaction: <T>(fn: (tx: AnyPrisma) => Promise<T>) => Promise<T>
}

let resolved: DatabaseClient | null = null
let resolvePromise: Promise<DatabaseClient> | null = null

function pgClient(): DatabaseClient {
  const pool = getPool()
  const self: DatabaseClient = {
    driver: 'pg',
    async query<T = Row>(sql: string, params: readonly unknown[] = []) {
      const res = await pool.query(sql, params as unknown[])
      return res.rows as T[]
    },
    async queryOne<T = Row>(sql: string, params: readonly unknown[] = []) {
      const res = await pool.query(sql, params as unknown[])
      return (res.rows[0] as T) ?? null
    },
    async execute(sql: string, params: readonly unknown[] = []) {
      const res = await pool.query(sql, params as unknown[])
      return res.rowCount ?? 0
    },
    async transaction<T>(work: (tx: DatabaseClient) => Promise<T>) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        const tx: DatabaseClient = {
          driver: 'pg',
          async query<R = Row>(sql: string, params: readonly unknown[] = []) {
            const res = await client.query(sql, params as unknown[])
            return res.rows as R[]
          },
          async queryOne<R = Row>(sql: string, params: readonly unknown[] = []) {
            const res = await client.query(sql, params as unknown[])
            return (res.rows[0] as R) ?? null
          },
          async execute(sql: string, params: readonly unknown[] = []) {
            const res = await client.query(sql, params as unknown[])
            return res.rowCount ?? 0
          },
          transaction: (inner) => inner(tx),
        }
        const result = await work(tx)
        await client.query('COMMIT')
        return result
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    },
  }
  return self
}

function prismaClient(prisma: AnyPrisma): DatabaseClient {
  const self: DatabaseClient = {
    driver: 'prisma',
    async query<T = Row>(sql: string, params: readonly unknown[] = []) {
      return prisma.$queryRawUnsafe<T[]>(sql, ...params)
    },
    async queryOne<T = Row>(sql: string, params: readonly unknown[] = []) {
      const rows = await prisma.$queryRawUnsafe<T[]>(sql, ...params)
      return rows[0] ?? null
    },
    async execute(sql: string, params: readonly unknown[] = []) {
      return prisma.$executeRawUnsafe(sql, ...params)
    },
    async transaction<T>(work: (tx: DatabaseClient) => Promise<T>) {
      return prisma.$transaction(async (tx) => {
        const txClient: DatabaseClient = {
          driver: 'prisma',
          async query<R = Row>(sql: string, params: readonly unknown[] = []) {
            return tx.$queryRawUnsafe<R[]>(sql, ...params)
          },
          async queryOne<R = Row>(sql: string, params: readonly unknown[] = []) {
            const rows = await tx.$queryRawUnsafe<R[]>(sql, ...params)
            return rows[0] ?? null
          },
          async execute(sql: string, params: readonly unknown[] = []) {
            return tx.$executeRawUnsafe(sql, ...params)
          },
          transaction: (inner) => inner(txClient),
        }
        return work(txClient)
      })
    },
  }
  return self
}

async function loadPrisma(): Promise<AnyPrisma | null> {
  try {
    // Runtime-only specifier: intentionally not statically analysable so that
    // builds succeed before `prisma generate` has been run.
    const segments = ['../../generated', 'prisma', 'client']
    const specifier = segments.join('/')
    const mod = (await import(/* webpackIgnore: true */ specifier)) as {
      PrismaClient?: new (opts: unknown) => AnyPrisma
    }
    if (!mod.PrismaClient) return null
    // Prefer the Prisma driver adapter when available (required by Prisma 7).
    let instance: AnyPrisma
    try {
      const adapterSegments = ['@prisma', 'adapter-pg']
      const adapterMod = (await import(
        /* webpackIgnore: true */ adapterSegments.join('/')
      )) as { PrismaPg?: new (url: string) => unknown }
      if (!adapterMod.PrismaPg) throw new Error('adapter missing')
      instance = new mod.PrismaClient({ adapter: new adapterMod.PrismaPg(process.env.DATABASE_URL!) })
    } catch {
      instance = new mod.PrismaClient({})
    }
    // Fail fast if the client cannot actually talk to the database.
    await instance.$queryRawUnsafe<{ ok: number }[]>('SELECT 1 as ok')
    return instance
  } catch {
    return null
  }
}

export async function getDb(): Promise<DatabaseClient> {
  if (resolved) return resolved
  if (!resolvePromise) {
    resolvePromise = (async () => {
      const pref = process.env.BACHATLY_DB_ADAPTER
      if (pref === 'pg') {
        resolved = pgClient()
        return resolved
      }
      const prisma = await loadPrisma()
      if (prisma) {
        resolved = prismaClient(prisma)
      } else {
        if (pref === 'prisma') {
          throw new Error(
            'BACHATLY_DB_ADAPTER=prisma but no generated Prisma Client was found. Run `pnpm prisma generate`.',
          )
        }
          console.info(
          '[bachatly:db] Prisma Client not generated — using the node-postgres adapter. Run `pnpm prisma generate` to switch to Prisma.',
        )
        resolved = pgClient()
      }
      return resolved
    })()
  }
  return resolvePromise
}

/** Convenience wrapper for one-shot calls: `await db.query(...)`. */
export const db = {
  query<T = Row>(sql: string, params?: readonly unknown[]) {
    return getDb().then((c) => c.query<T>(sql, params))
  },
  queryOne<T = Row>(sql: string, params?: readonly unknown[]) {
    return getDb().then((c) => c.queryOne<T>(sql, params))
  },
  execute(sql: string, params?: readonly unknown[]) {
    return getDb().then((c) => c.execute(sql, params))
  },
  transaction<T>(work: (tx: DatabaseClient) => Promise<T>) {
    return getDb().then((c) => c.transaction(work))
  },
  driver(): Promise<'prisma' | 'pg'> {
    return getDb().then((c) => c.driver)
  },
}
