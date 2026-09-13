'use client'

/**
 * Typed API client for the browser.
 * Unwraps the { success, data } / { success, error } envelope and throws an
 * ApiError the UI can render.
 */

export class ApiError extends Error {
  code: string
  status: number
  details?: unknown

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

interface Envelope<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string; details?: unknown }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    },
    credentials: 'same-origin',
  })
  let payload: Envelope<T> | null = null
  try {
    payload = (await response.json()) as Envelope<T>
  } catch {
    payload = null
  }
  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.error?.code ?? 'REQUEST_FAILED',
      payload?.error?.message ?? `Request failed (${response.status})`,
      response.status,
      payload?.error?.details,
    )
  }
  return payload.data as T
}

export const api = {
  get: <T,>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T,>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
}
