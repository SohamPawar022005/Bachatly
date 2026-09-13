import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/** Passwords are never stored or logged in plain text. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  if (!hash) return false
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}
