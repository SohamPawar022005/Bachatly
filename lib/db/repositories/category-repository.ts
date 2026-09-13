import { db } from '@/lib/db/client'
import type { CategoryRow } from '@/lib/db/types'
import { escapeLike } from '@/lib/search/normalize'
import { cuid } from '@/lib/utils/id'

const CATEGORY_SELECT = `
  c.id, c.name, c.slug, c.description, c."imageUrl", c."sortOrder", c."parentId", c."createdAt"
`

export async function listCategories(): Promise<CategoryRow[]> {
  return db.query<CategoryRow>(
    `SELECT ${CATEGORY_SELECT} FROM categories c ORDER BY c."sortOrder" ASC, c.name ASC`,
  )
}

export interface CategoryWithCounts extends CategoryRow {
  productCount: number
  cheapestPrice: number | null
  children?: CategoryRow[]
}

export async function listCategoriesWithCounts(): Promise<CategoryWithCounts[]> {
  return db.query<CategoryWithCounts>(
    `SELECT ${CATEGORY_SELECT},
            (SELECT count(*)::int FROM products p WHERE p."categoryId" = c.id) AS "productCount",
            (SELECT min(p."lowestPrice") FROM products p WHERE p."categoryId" = c.id) AS "cheapestPrice"
     FROM categories c
     WHERE c."parentId" IS NULL
     ORDER BY c."sortOrder" ASC, c.name ASC`,
  )
}

export async function findCategoryBySlug(slug: string): Promise<CategoryRow | null> {
  return db.queryOne<CategoryRow>(`SELECT ${CATEGORY_SELECT} FROM categories c WHERE c.slug = $1`, [slug])
}

export async function findCategoryById(id: string): Promise<CategoryRow | null> {
  return db.queryOne<CategoryRow>(`SELECT ${CATEGORY_SELECT} FROM categories c WHERE c.id = $1`, [id])
}

export async function listSubcategories(parentId: string): Promise<CategoryRow[]> {
  return db.query<CategoryRow>(
    `SELECT ${CATEGORY_SELECT} FROM categories c WHERE c."parentId" = $1 ORDER BY c.name ASC`,
    [parentId],
  )
}

export async function createCategory(input: {
  name: string
  slug: string
  description?: string | null
  imageUrl?: string | null
  sortOrder?: number
  parentId?: string | null
}): Promise<CategoryRow> {
  return (await db.queryOne<CategoryRow>(
    `INSERT INTO categories AS c (id, name, slug, description, "imageUrl", "sortOrder", "parentId", "createdAt")
     VALUES ($1,$2,$3,$4,$5,$6,$7, now())
     RETURNING ${CATEGORY_SELECT}`,
    [cuid(), input.name, input.slug, input.description ?? null, input.imageUrl ?? null, input.sortOrder ?? 0, input.parentId ?? null],
  ))!
}

export async function updateCategory(
  id: string,
  patch: Partial<Omit<CategoryRow, 'id' | 'createdAt'>>,
): Promise<CategoryRow | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let index = 1
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    fields.push(`"${key}" = $${index++}`)
    values.push(value)
  }
  if (fields.length === 0) return findCategoryById(id)
  values.push(id)
  return db.queryOne<CategoryRow>(
    `UPDATE categories SET ${fields.join(', ')} WHERE id = $${index} RETURNING ${CATEGORY_SELECT}`,
    values,
  )
}

export async function searchCategories(query: string, limit = 5): Promise<CategoryRow[]> {
  return db.query<CategoryRow>(
    `SELECT ${CATEGORY_SELECT} FROM categories c
     WHERE c.name ILIKE $1 ORDER BY similarity(lower(c.name), $2) DESC LIMIT $3`,
    [`%${escapeLike(query)}%`, query.toLowerCase(), limit],
  )
}
