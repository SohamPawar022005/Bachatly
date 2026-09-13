import { NextResponse } from 'next/server'

import type { ErrorCode } from './errors'

/** Every successful response has the shape { success: true, data }. */
export function ok<T>(data: T, init?: ResponseInit & { status?: number }) {
  return NextResponse.json({ success: true, data }, { status: init?.status ?? 200, ...init })
}

/** Every failure has the shape { success: false, error: { code, message } }. */
export function fail(code: ErrorCode, message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && process.env.NODE_ENV !== 'production' ? { details } : {}),
      },
    },
    { status },
  )
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export function paginate<T>(input: { items: T[]; total: number; page: number; pageSize: number }): Paginated<T> {
  return {
    items: input.items,
    total: input.total,
    page: input.page,
    pageSize: input.pageSize,
    totalPages: Math.max(1, Math.ceil(input.total / input.pageSize)),
  }
}
