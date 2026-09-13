import { searchProducts } from '@/lib/db/repositories/product-repository'
import { findCategoryBySlug, listSubcategories } from '@/lib/db/repositories/category-repository'
import { ERROR_CODES, notFound } from '@/lib/api/errors'
import { enrichSearchRows, type SearchItem } from './search-service'
import { searchQuerySchema } from '@/lib/validation/schemas'
import { toTsQuery } from '@/lib/search/normalize'

export interface CategoryPage {
  id: string
  name: string
  slug: string
  description: string | null
  imageUrl: string | null
  subcategories: Array<{ name: string; slug: string }>
  products: {
    items: SearchItem[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    sort: string
  }
  bestDeals: SearchItem[]
}

/**
 * Category page. A parent category includes the products of its subcategories,
 * so /categories/mobiles also shows everything filed under /categories/smartphones.
 */
export async function getCategoryPage(slug: string, query: Record<string, unknown> = {}): Promise<CategoryPage> {
  const category = await findCategoryBySlug(slug)
  if (!category) throw notFound('Category', ERROR_CODES.CATEGORY_NOT_FOUND)

  const subcategories = await listSubcategories(category.id)
  const slugs = [category.slug, ...subcategories.map((s) => s.slug)]
  const parsed = searchQuerySchema.parse(query)

  const page = await searchProducts(
    {
      query: parsed.q,
      categorySlugs: slugs,
      brands: parsed.brand,
      retailerSlugs: parsed.retailer,
      minPrice: parsed.minPrice,
      maxPrice: parsed.maxPrice,
      minRating: parsed.minRating,
      minDiscount: parsed.minDiscount,
      freeDelivery: parsed.freeDelivery,
      inStockOnly: parsed.inStockOnly,
      sort: parsed.sort,
      page: parsed.page,
      pageSize: parsed.pageSize,
    },
    { tsQuery: toTsQuery(parsed.q) },
  )

  const dealPage = await searchProducts(
    { query: '', categorySlugs: slugs, sort: 'discount', pageSize: 6 },
    { tsQuery: '' },
  )

  const [items, bestDeals] = await Promise.all([enrichSearchRows(page.items), enrichSearchRows(dealPage.items)])

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    imageUrl: category.imageUrl,
    subcategories: subcategories.map((s) => ({ name: s.name, slug: s.slug })),
    products: {
      items,
      total: page.total,
      page: page.page,
      pageSize: page.pageSize,
      totalPages: page.totalPages,
      sort: page.sort,
    },
    bestDeals,
  }
}
