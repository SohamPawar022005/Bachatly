import { db } from '@/lib/db/client'
import { cuid } from '@/lib/utils/id'

export type UserRole = 'USER' | 'ADMIN'

export interface UserRow {
  id: string
  name: string
  email: string
  passwordHash: string
  image: string | null
  role: UserRole
  createdAt: Date
  updatedAt: Date
}

const USER_SELECT = `u.id, u.name, u.email, u."passwordHash", u.image, u.role, u."createdAt", u."updatedAt"`

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return db.queryOne<UserRow>(`SELECT ${USER_SELECT} FROM users u WHERE lower(u.email) = lower($1)`, [email])
}

export async function findUserById(id: string): Promise<UserRow | null> {
  return db.queryOne<UserRow>(`SELECT ${USER_SELECT} FROM users u WHERE u.id = $1`, [id])
}

export async function createUser(input: {
  name: string
  email: string
  passwordHash: string
  role?: UserRole
  image?: string | null
}): Promise<UserRow> {
  return (await db.queryOne<UserRow>(
    `INSERT INTO users AS u (id, name, email, "passwordHash", image, role, "createdAt", "updatedAt")
     VALUES ($1,$2,lower($3),$4,$5,COALESCE($6::"Role", 'USER'), now(), now())
     RETURNING ${USER_SELECT}`,
    [cuid(), input.name, input.email, input.passwordHash, input.image ?? null, input.role ?? 'USER'],
  ))!
}

export async function updateUser(id: string, patch: Partial<Pick<UserRow, 'name' | 'image' | 'role'>>): Promise<UserRow | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let index = 1
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    fields.push(`"${key}" = $${index++}`)
    values.push(value)
  }
  if (fields.length === 0) return findUserById(id)
  fields.push(`"updatedAt" = now()`)
  values.push(id)
  return db.queryOne<UserRow>(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${index} RETURNING ${USER_SELECT}`,
    values,
  )
}

export async function listUsers(params: { query?: string; limit?: number; offset?: number }): Promise<{
  items: Array<Omit<UserRow, 'passwordHash'> & { favoriteCount: number; alertCount: number }>
  total: number
}> {
  const values: unknown[] = []
  let where = ''
  if (params.query?.trim()) {
    values.push(`%${params.query.trim().toLowerCase()}%`)
    where = `WHERE lower(u.name) LIKE $1 OR lower(u.email) LIKE $1`
  }
  const limit = params.limit ?? 25
  const offset = params.offset ?? 0
  const items = await db.query<Omit<UserRow, 'passwordHash'> & { favoriteCount: number; alertCount: number }>(
    `SELECT u.id, u.name, u.email, u.image, u.role, u."createdAt", u."updatedAt",
            (SELECT count(*)::int FROM favorites f WHERE f."userId" = u.id) AS "favoriteCount",
            (SELECT count(*)::int FROM price_alerts pa WHERE pa."userId" = u.id AND pa."isActive") AS "alertCount"
     FROM users u ${where}
     ORDER BY u."createdAt" DESC
     LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, offset],
  )
  const total = await db.queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM users u ${where}`, values)
  return { items, total: total?.n ?? 0 }
}

export async function countUsers(): Promise<number> {
  const row = await db.queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM users`)
  return row?.n ?? 0
}
