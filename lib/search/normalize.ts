/**
 * Query normalisation.
 *
 * The same product is typed in many ways:
 *   "iPhone16", "iPhone 16", "apple iphone 16", "IPHONE  16", "iphone sixteen"
 * All of these must normalise to a comparable token set.
 */

/** Words that carry no discriminating signal and are dropped from queries. */
export const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'of', 'in', 'on', 'to', 'at', 'by',
  'best', 'price', 'prices', 'buy', 'online', 'india', 'new', 'latest', 'deal', 'deals',
])

/** Retailer/marketing noise stripped from retailer titles before matching. */
export const TITLE_NOISE = new Set([
  'official', 'india', 'warranty', 'brand', 'new', 'launch', 'only', 'exclusive',
  'bestseller', 'pack', 'combo', 'offer', 'free', 'delivery', 'shipping', 'original',
  'genuine', 'certified', 'imported', 'refurbished',
  // Marketplace keyword stuffing (Meesho and similar feeds).
  'latest', 'model', 'best', 'quality', 'premium', 'design', 'product', 'mobile',
  'phone', 'item', 'color', 'colour', 'size', 'for', 'with',
])

const NUMBER_WORDS: Record<string, string> = {
  zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7',
  eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13',
  fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18',
  nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50', sixty: '60',
  sixtyfour: '64', sixtetwo: '128', hundred: '100',
  fiftyone: '51', 'one twenty eight': '128',
}

/** Common typo corrections for high-volume queries. */
const TYPO_MAP: Record<string, string> = {
  ipohne: 'iphone',
  iphonee: 'iphone',
  ipone: 'iphone',
  apple: 'apple',
  airpod: 'airpods',
  airpodspro: 'airpods pro',
  macbok: 'macbook',
  macboook: 'macbook',
  samsungtv: 'samsung tv',
  nike: 'nike',
  nikeshoes: 'nike shoes',
  oneplu: 'oneplus',
  redmi: 'redmi',
  boat: 'boat',
  jbls: 'jbl',
  headfone: 'headphone',
  headphone: 'headphones',
}

/**
 * Lower-cases, de-duplicates whitespace, strips punctuation and expands number
 * words so "iPhone Sixteen" and "iphone 16" produce the same tokens.
 */
export function normalizeQuery(input: string): string {
  if (!input) return ''
  let q = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[₹]/g, ' ')
    .replace(/[^a-z0-9+&]+/g, ' ')
    .trim()

  // 1. Split glued alphanumerics first: "iphone16" -> "iphone 16".
  q = q.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2')
  // 2. Then re-join capacity tokens so "128 gb" and "128GB" both become "128gb".
  q = q.replace(/\b(\d+(?:\.\d+)?)\s+(gb|tb|mb)\b/g, '$1$2')

  const tokens = q
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => TYPO_MAP[t] ?? t)
    .flatMap((t) => (t.includes(' ') ? t.split(/\s+/) : [t]))
    .map((t) => NUMBER_WORDS[t] ?? t)

  return tokens.join(' ')
}

/** Normalise and drop stopwords — used for indexing/aggregation. */
export function normalizeForMatching(input: string): string {
  return normalizeQuery(input)
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t) && !TITLE_NOISE.has(t))
    .join(' ')
}

export function tokenize(input: string): string[] {
  const normalized = normalizeQuery(input)
  return normalized ? normalized.split(/\s+/).filter(Boolean) : []
}

/** Tokens with stopwords and marketplace noise removed — used for similarity. */
export function contentTokens(input: string): string[] {
  return tokenize(input).filter((t) => !STOPWORDS.has(t) && !TITLE_NOISE.has(t))
}

/** Character trigrams, used by the pg_trgm fallback ranking. */
export function trigrams(input: string): string[] {
  // Same padding PostgreSQL uses for gin_trgm_ops (two leading, one trailing space).
  const padded = `  ${normalizeQuery(input).replace(/\s+/g, '')} `
  const out: string[] = []
  for (let i = 0; i <= padded.length - 3; i++) out.push(padded.slice(i, i + 3))
  return Array.from(new Set(out))
}

/** Escape a string for safe use inside a PostgreSQL LIKE/ILIKE pattern. */
export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (m) => `\\${m}`)
}

/**
 * Builds a PostgreSQL full-text search query from user input.
 * Every token becomes a prefix match so partial typing still hits:
 *   "iphone 1"  ->  "iphone" & "1":*
 */
export function toTsQuery(input: string): string {
  const tokens = tokenize(input).filter((t) => t.length > 0)
  if (tokens.length === 0) return ''
  return tokens
    .map((t) => `'${t.replace(/'/g, "''")}':*`)
    .join(' & ')
}

/** A looser OR query used as a fallback when the AND query returns nothing. */
export function toOrTsQuery(input: string): string {
  const tokens = tokenize(input).filter((t) => t.length > 0)
  if (tokens.length === 0) return ''
  return tokens.map((t) => `'${t.replace(/'/g, "''")}':*`).join(' | ')
}
