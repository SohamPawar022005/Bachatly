/** Tiny helpers for working with a PostgreSQL connection URL. */

export interface DbUrlParts {
  connectionString: string
  host: string
  port: number
  user: string
  password: string
  database: string
}

export function parseDbUrl(url: string): DbUrlParts {
  const parsed = new URL(url)
  return {
    connectionString: url,
    host: parsed.hostname || '127.0.0.1',
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username || 'postgres'),
    password: decodeURIComponent(parsed.password || ''),
    database: parsed.pathname.replace(/^\//, '') || 'postgres',
  }
}

/** Connection string for the maintenance database (`postgres`). */
export function maintenanceUrl(url: string): string {
  const parsed = new URL(url)
  parsed.pathname = '/postgres'
  return parsed.toString()
}

export function urlForDatabase(url: string, database: string): string {
  const parsed = new URL(url)
  parsed.pathname = `/${database}`
  return parsed.toString()
}
