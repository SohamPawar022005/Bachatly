/**
 * Slug helpers.
 *
 * Kept in its own module (rather than next to the id generator) because forms
 * and validation schemas use it in the browser, and those modules must never
 * pull server-only code into a client bundle.
 */

/** Slugify helper used for canonical product URLs. */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96)
}
