import { db } from '@/lib/db/client'
import type { DatabaseClient, RetailerRow } from '@/lib/db/types'
import { withClient } from '@/lib/db/query-helpers'

const BASE_COLUMNS = `
  r.id, r.name, r.slug, r."logoUrl", r."websiteUrl", r."brandColor", r."isActive",
  r."affiliateNetwork", r."affiliateId", r."affiliateUrlTemplate", r."createdAt", r."updatedAt"
`

export async function listRetailers(client?: DatabaseClient): Promise<RetailerRow[]> {
  const c = await withClient(client)
  return c.query<RetailerRow>(`SELECT ${BASE_COLUMNS} FROM retailers r ORDER BY r.name ASC`)
}

export async function listActiveRetailers(): Promise<RetailerRow[]> {
  return db.query<RetailerRow>(
    `SELECT ${BASE_COLUMNS} FROM retailers r WHERE r."isActive" = true ORDER BY r.name ASC`,
  )
}

export async function findRetailerById(id: string): Promise<RetailerRow | null> {
  return db.queryOne<RetailerRow>(`SELECT ${BASE_COLUMNS} FROM retailers r WHERE r.id = $1`, [id])
}

export async function findRetailerBySlug(slug: string): Promise<RetailerRow | null> {
  return db.queryOne<RetailerRow>(`SELECT ${BASE_COLUMNS} FROM retailers r WHERE r.slug = $1`, [slug])
}

export interface CreateRetailerInput {
  id: string
  name: string
  slug: string
  logoUrl?: string | null
  websiteUrl: string
  brandColor?: string
  isActive?: boolean
  affiliateNetwork?: string | null
  affiliateId?: string | null
  affiliateUrlTemplate?: string | null
}

export async function createRetailer(input: CreateRetailerInput): Promise<RetailerRow> {
  return (
    (await db.queryOne<RetailerRow>(
      `INSERT INTO retailers AS r (id, name, slug, "logoUrl", "websiteUrl", "brandColor", "isActive",
                              "affiliateNetwork", "affiliateId", "affiliateUrlTemplate", "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), now())
       RETURNING ${BASE_COLUMNS}`,
      [
        input.id, input.name, input.slug, input.logoUrl ?? null, input.websiteUrl,
        input.brandColor ?? '#111827', input.isActive ?? true,
        input.affiliateNetwork ?? null, input.affiliateId ?? null, input.affiliateUrlTemplate ?? null,
      ],
    ))!
  )
}

export async function updateRetailer(
  id: string,
  patch: Partial<Omit<CreateRetailerInput, 'id'>>,
): Promise<RetailerRow | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let index = 1
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    fields.push(`"${key}" = $${index++}`)
    values.push(value)
  }
  if (fields.length === 0) return findRetailerById(id)
  fields.push(`"updatedAt" = now()`)
  values.push(id)
  return db.queryOne<RetailerRow>(
    `UPDATE retailers SET ${fields.join(', ')} WHERE id = $${index} RETURNING ${BASE_COLUMNS}`,
    values,
  )
}
