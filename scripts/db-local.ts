/**
 * Local PostgreSQL for offline development.
 *
 * The sandboxed / air-gapped development environment used to build Bachatly has
 * no system PostgreSQL and no Docker. `@embedded-postgres/linux-x64` ships real
 * PostgreSQL binaries through npm, so this script boots a genuine PostgreSQL
 * server in `.pgdata/` — no Docker, no root, no external services.
 *
 *   pnpm db:up      -> initdb (if needed) + start + wait until ready
 *   pnpm db:down    -> stop
 *
 * In a normal environment you can ignore this and use Docker/Neon instead:
 *   docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:17
 */
import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import pg from 'pg'
import { parseDbUrl } from '../lib/utils/db-url'

const ROOT = path.resolve(import.meta.dirname, '..')
const DATA_DIR = path.join(ROOT, '.pgdata')
const LOG_FILE = path.join(ROOT, 'pg.log')
const PKG = path.join(ROOT, 'node_modules/@embedded-postgres/linux-x64/native')

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:5433/bachatly'
const { host, port, user, password } = parseDbUrl(DATABASE_URL)

function bin(name: string): string {
  const candidate = path.join(PKG, 'bin', name)
  if (!fs.existsSync(candidate)) {
    throw new Error(
      `Embedded PostgreSQL not found at ${candidate}. Install optional deps with \`pnpm install\` (Linux x64 only) or use Docker instead.`,
    )
  }
  return candidate
}

function run(name: string, args: string[]) {
  const res = spawnSync(bin(name), args, {
    stdio: 'inherit',
    env: { ...process.env, PGDATA: DATA_DIR },
  })
  if (res.status !== 0) throw new Error(`${name} exited with ${res.status}`)
}

async function isUp(): Promise<boolean> {
  const client = new pg.Client({
    host,
    port,
    user,
    password: password || undefined,
    database: 'postgres',
    connectionTimeoutMillis: 1500,
  })
  try {
    await client.connect()
    await client.query('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    await client.end().catch(() => undefined)
  }
}

async function waitForUp(timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (await isUp()) return true
    await new Promise((r) => setTimeout(r, 500))
  }
  return false
}

async function up() {
  if (await isUp()) {
    console.log(`PostgreSQL already running at ${host}:${port}`)
    return
  }
  if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log(`Initialising PostgreSQL cluster in ${DATA_DIR} ...`)
    fs.mkdirSync(DATA_DIR, { recursive: true })
    run('initdb', ['-D', DATA_DIR, '-U', user, '--auth=trust', '-E', 'UTF8', '--locale=C'])
  }
  console.log(`Starting PostgreSQL on ${host}:${port} ...`)
  run('pg_ctl', ['-D', DATA_DIR, '-l', LOG_FILE, '-o', `-p ${port} -k /tmp -c listen_addresses=${host}`, '-w', 'start'])
  const ok = await waitForUp()
  if (!ok) throw new Error(`PostgreSQL did not become ready. See ${LOG_FILE}`)
  console.log(`PostgreSQL ready: postgresql://${user}@${host}:${port}/`)
  console.log(`Next: pnpm db:bootstrap && pnpm db:seed`)
}

function down() {
  if (!fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log('No local cluster found — nothing to stop.')
    return
  }
  run('pg_ctl', ['-D', DATA_DIR, '-m', 'fast', 'stop'])
  console.log('PostgreSQL stopped.')
}

async function main() {
  const command = process.argv[2] ?? 'up'
  if (command === 'up') await up()
  else if (command === 'down') down()
  else {
    console.error(`Unknown command "${command}". Use: up | down`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
