import pg from 'pg'

/**
 * node-postgres connection pool.
 *
 * All timestamps are handled in UTC: `timestamp(3)` columns (the type Prisma
 * emits for DateTime) are parsed by node-postgres using the process timezone,
 * so TZ is pinned here to keep round-trips deterministic across environments.
 */
if (!process.env.TZ) process.env.TZ = 'UTC'

const { Pool } = pg

let pool: pg.Pool | null = null

export function getPool(connectionString = process.env.DATABASE_URL): pg.Pool {
  if (!pool) {
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set — cannot connect to PostgreSQL.')
    }
    pool = new Pool({
      connectionString,
      max: Number(process.env.PGPOOL_MAX ?? 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Prisma treats PG DateTime as UTC; keep the client aligned.
      options: '-c timezone=utc',
    })
    pool.on('error', (err) => {
      console.error('[bachatly:db] idle client error', err.message)
    })
  }
  return pool
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}
