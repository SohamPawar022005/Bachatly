import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { getCategoryPage } from '@/services/category-service'

/** GET /api/categories/:slug */
export const GET = withApi(async (req: NextRequest, ctx: { params: Promise<{ slug: string }> }) => {
  const { slug } = await ctx.params
  const page = await getCategoryPage(slug, Object.fromEntries(req.nextUrl.searchParams.entries()))
  return ok(page)
})
