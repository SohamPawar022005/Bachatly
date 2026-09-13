/**
 * Collision-resistant, roughly monotonic id generator.
 *
 * Prisma generates `cuid()` values client-side; because this project performs
 * inserts through explicit SQL (see lib/db), ids are generated here so rows
 * created by the app and by `prisma/seed.ts` share one format:
 *   c + 8 (time) + 4 (counter) + 4 (fingerprint) + 8 (random)   = 25 chars
 *
 * Environment-agnostic on purpose: this module is reachable from client
 * bundles (validation schemas → forms), so it must not touch Node-only globals
 * such as `process`. Entropy comes from WebCrypto, which exists in Node 19+ and
 * in every browser we support, with a Math.random() fallback.
 */

const BLOCK_SIZE = 4

/** Uniform base36 block of `size` characters, drawn from WebCrypto when available. */
function randomBlock(size: number): string {
  const crypto = globalThis.crypto
  let out = ''
  while (out.length < size) {
    let value: number
    if (crypto?.getRandomValues) {
      // 36**4 fits comfortably in a uint32, so draw four characters at a time.
      value = crypto.getRandomValues(new Uint32Array(1))[0] % 36 ** BLOCK_SIZE
      out += value.toString(36).padStart(BLOCK_SIZE, '0')
    } else {
      value = Math.floor(Math.random() * 36 ** BLOCK_SIZE)
      out += value.toString(36).padStart(BLOCK_SIZE, '0')
    }
  }
  return out.slice(0, size)
}

/** Per-module entropy, standing in for the pid/host fingerprint of a classic cuid. */
const fingerprint = randomBlock(BLOCK_SIZE)

let counter = Number.parseInt(randomBlock(BLOCK_SIZE), 36) % 36 ** BLOCK_SIZE

function pad(value: number, size: number): string {
  return value.toString(36).padStart(size, '0').slice(-size)
}

export function cuid(): string {
  counter = (counter + 1) % 36 ** BLOCK_SIZE
  const time = pad(Date.now(), 8)
  const random = randomBlock(8)
  return `c${time}${pad(counter, BLOCK_SIZE)}${fingerprint}${random}`
}

/** Re-exported so existing server callers keep a single import path. */
export { slugify } from '@/lib/utils/slug'
