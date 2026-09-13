/**
 * Applies prisma/migrations/*.sql directly through node-postgres.
 *
 * This exists for environments where the Prisma CLI cannot run (its engine
 * binaries are fetched from binaries.prisma.sh, which is unreachable in
 * air-gapped sandboxes). The result is the same database that
 * `prisma migrate dev` produces:
 *
 *  - identical SQL (the migration files are the single source of truth)
 *  - a populated `_prisma_migrations` bookkeeping table with Prisma-compatible
 *    sha256 checksums, so `prisma migrate deploy` later reports "no pending
 *    migrations" instead of re-applying them.
 *
 * In a standard environment, prefer: `pnpm prisma migrate dev`.
 */
import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import pg from 'pg'
import { maintenanceUrl, parseDbUrl } from '../lib/utils/db-url'

const ROOT = path.resolve(import.meta.dirname, '..')
const MIGRATIONS_DIR = path.join(ROOT, 'prisma/migrations')

async function ensureDatabase() {
  const DATABASE_URL = process.env.DATABASE_URL
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set')
  const { database, user } = parseDbUrl(DATABASE_URL)
  const admin = new pg.Client({ connectionString: maintenanceUrl(DATABASE_URL) })
  await admin.connect()
  try {
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])
    if (existing.rowCount === 0) {
      console.log(`Creating database "${database}" ...`)
      await admin.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`)
    } else {
      console.log(`Database "${database}" exists (owner ${user})`)
    }
  } finally {
    await admin.end()
  }
}

async function main() {
  await ensureDatabase()
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL, options: '-c timezone=utc' })
  await client.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      );
    `)

    const dirs = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort()

    if (dirs.length === 0) {
      console.log('No migrations found.')
      return
    }

    for (const name of dirs) {
      const file = path.join(MIGRATIONS_DIR, name, 'migration.sql')
      if (!fs.existsSync(file)) {
        console.warn(`Skipping ${name}: migration.sql missing`)
        continue
      }
      const sql = fs.readFileSync(file, 'utf8')
      const checksum = crypto.createHash('sha256').update(sql).digest('hex')
      const already = await client.query(
        `SELECT checksum FROM "_prisma_migrations" WHERE migration_name = $1 AND rolled_back_at IS NULL`,
        [name],
      )
      if (already.rowCount && already.rowCount > 0) {
        const previous = (already.rows[0] as { checksum: string }).checksum
        if (previous !== checksum) {
          throw new Error(
            `Migration ${name} changed after it was applied (checksum mismatch). Create a new migration instead of editing an applied one.`,
          )
        }
        console.log(`· ${name} — already applied`)
        continue
      }
      console.log(`· applying ${name} ...`)
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query(
          `INSERT INTO "_prisma_migrations"
             (id, checksum, finished_at, migration_name, applied_steps_count)
           VALUES ($1, $2, now(), $3, 1)`,
          [crypto.randomUUID(), checksum, name],
        )
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }

    const tables = await client.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    )
    const trgm = await client.query(
      `SELECT count(*)::int AS n FROM pg_extension WHERE extname = 'pg_trgm'`,
    )
    console.log(
      `Done. ${tables.rows[0] ? (tables.rows[0] as { n: number }).n : 0} public tables, pg_trgm ${
        trgm.rows[0] && (trgm.rows[0] as { n: number }).n > 0 ? 'enabled' : 'MISSING'
      }.`,
    )
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('Database bootstrap failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
