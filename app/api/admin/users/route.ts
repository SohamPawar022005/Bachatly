import type { NextRequest } from 'next/server'

import { withApi } from '@/lib/api/route'
import { ok } from '@/lib/api/respond'
import { adminListUsers } from '@/services/admin-service'

/** GET /api/admin/users */
export const GET = withApi(
  async (req: NextRequest) => {
    const params = req.nextUrl.searchParams
    const result = await adminListUsers({
      q: params.get('q') ?? undefined,
      page: params.get('page') ? Number(params.get('page')) : undefined,
      pageSize: params.get('pageSize') ? Number(params.get('pageSize')) : undefined,
    })
    return ok(result)
  },
  { auth: 'admin' },
)
