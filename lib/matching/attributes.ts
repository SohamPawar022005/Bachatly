/**
 * Attribute extraction.
 *
 * Retailer feeds rarely provide structured attributes, so we derive the
 * signals the identity-resolution engine needs (brand, model number, storage,
 * colour, size) from the raw title. Everything here is deliberately
 * conservative: an attribute we are unsure about is left `null` rather than
 * guessed, because a wrong attribute is worse than a missing one.
 */

export interface ProductAttributes {
  brand: string | null
  modelNumber: string | null
  gtin: string | null
  storage: string | null
  color: string | null
  size: string | null
}

const KNOWN_BRANDS = [
  // Mobiles & computers
  'apple', 'samsung', 'oneplus', 'xiaomi', 'redmi', 'realme', 'vivo', 'oppo', 'motorola',
  'google', 'lenovo', 'hp', 'dell', 'asus', 'acer', 'msi', 'microsoft', 'nothing', 'poco', 'nokia',
  // Audio, video, imaging
  'sony', 'lg', 'jbl', 'sennheiser', 'zebronics', 'bose', 'boat', 'canon', 'nikon', 'oneplus',
  // Fashion
  'nike', 'adidas', 'puma', 'reebok', 'skechers', 'campus', 'bata', 'woodland', 'crocs',
  "levi's", 'levis', 'fastrack', 'titan', 'casio', 'fossil',
  // Home & kitchen
  'prestige', 'bajaj', 'philips', 'havells', 'ifb', 'voltas', 'crompton', 'milton', 'cello',
  'tupperware', 'pigeon', 'hawkins',
  // Beauty & grocery
  'lakme', "l'oreal", 'loreal', 'mamaearth', 'dot & key', 'sugar', 'nykaa', 'tata sampann',
  'amul', 'aashirvaad',
  // Sports
  'yonex', 'nivia', 'cosco', 'sg', 'gm', 'decathlon',
]
const BRAND_SET = new Set(KNOWN_BRANDS.map((b) => b.toLowerCase()))

/** Conservative colour synonyms. Only unambiguous equivalences are mapped. */
const COLOR_SYNONYMS: Record<string, string> = {
  'space grey': 'grey',
  'space gray': 'grey',
  'graphite': 'grey',
  'jet black': 'black',
  'midnight': 'black',
  'onyx': 'black',
  'obsidian': 'black',
  'phantom black': 'black',
  'starlight': 'white',
  'pearl white': 'white',
  'phantom white': 'white',
  'rosegold': 'rose gold',
  'rose gold': 'rose gold',
  'navy blue': 'blue',
  'ocean blue': 'blue',
  'aurora blue': 'blue',
}

const COLOR_WORDS = [
  'black', 'white', 'grey', 'gray', 'silver', 'gold', 'rose gold', 'blue', 'green', 'red',
  'pink', 'yellow', 'purple', 'brown', 'beige', 'orange', 'teal', 'violet', 'cream',
  'maroon', 'navy', 'olive', 'cyan', 'magenta', 'space grey', 'space gray', 'jet black',
  'midnight', 'starlight', 'graphite', 'onyx', 'obsidian', 'lavender', 'mint', 'coral',
  'iron gray', 'titanium gray', 'dark indigo', 'arctic grey', 'eclipse gray', 'daylight blue',
]

/**
 * Model numbers look like "MXCU3HN/A", "SM-S928B/DS", "WH-1000XM5", "A3202".
 * We require a digit AND a letter (or a slash) so ordinary words never match.
 */
const MODEL_NUMBER_PATTERN = /\b([a-z]{1,6}[-/]?\d{2,6}[a-z0-9]*(?:[-/][a-z0-9]+)*)\b/gi

/**
 * Base colours that can stand alone. Marketing prefixes ("Iron Gray",
 * "Titanium Gray", "Dark Indigo") collapse onto the base colour so that the
 * same physical colour sold under different names still matches.
 */
const BASE_COLORS = new Set([
  'black', 'white', 'gray', 'silver', 'gold', 'blue', 'green', 'red', 'pink', 'yellow',
  'purple', 'brown', 'beige', 'orange', 'teal', 'violet', 'cream', 'maroon', 'navy',
  'olive', 'cyan', 'magenta', 'indigo', 'lavender', 'mint', 'coral',
])

export function normalizeColor(input: string | null | undefined): string | null {
  if (!input) return null
  const raw = input.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!raw) return null
  const synonym = COLOR_SYNONYMS[raw] ?? raw
  if (synonym === 'grey') return 'gray'
  const words = synonym.split(' ')
  if (words.length === 1) return synonym
  // Collapse onto the base colour, e.g. "iron gray" -> "gray", "red carpet" -> "red".
  for (const word of words) {
    const normalized = word === 'grey' ? 'gray' : word
    if (BASE_COLORS.has(normalized)) return normalized
  }
  return synonym.replace(/grey/g, 'gray')
}

export function normalizeStorage(input: string | null | undefined): string | null {
  if (!input) return null
  const match = String(input).toLowerCase().match(/(\d+(?:\.\d+)?)\s*(gb|tb|mb)/)
  if (!match) return null
  const value = Number(match[1])
  const unit = match[2]
  if (!Number.isFinite(value)) return null
  return `${value}${unit}`
}

export function normalizeBrand(input: string | null | undefined): string | null {
  if (!input) return null
  const raw = input.trim().toLowerCase()
  if (!raw) return null
  return raw === 'boat' ? 'boat' : raw
}

export function normalizeModelNumber(input: string | null | undefined): string | null {
  if (!input) return null
  const raw = input.trim().toUpperCase().replace(/\s+/g, '')
  return raw.length >= 3 ? raw : null
}

export function normalizeGtin(input: string | null | undefined): string | null {
  if (!input) return null
  const digits = String(input).replace(/\D/g, '')
  // EAN-13, UPC-A (12) and EAN-8 are the codes we accept.
  if (digits.length === 8 || digits.length === 12 || digits.length === 13 || digits.length === 14) {
    return digits
  }
  return null
}

/** Extract structured attributes from a raw retailer title. */
export function extractAttributes(rawTitle: string): ProductAttributes {
  const title = rawTitle ?? ''
  const lower = title.toLowerCase()

  let brand: string | null = null
  for (const candidate of BRAND_SET) {
    if (new RegExp(`\\b${candidate.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`).test(lower)) {
      brand = candidate
      break
    }
  }

  const storageMatch = lower.match(/(\d+(?:\.\d+)?)\s*(gb|tb)\b/)
  const storage = storageMatch ? normalizeStorage(`${storageMatch[1]}${storageMatch[2]}`) : null

  let color: string | null = null
  const sortedColors = [...COLOR_WORDS].sort((a, b) => b.length - a.length)
  for (const c of sortedColors) {
    if (lower.includes(c)) {
      color = normalizeColor(c)
      break
    }
  }

  const modelCandidates = Array.from(title.matchAll(MODEL_NUMBER_PATTERN))
    .map((m) => m[1])
    .filter((m) => m && m.length >= 4 && /\d/.test(m) && /[a-z]/i.test(m))
  const modelNumber = modelCandidates.length > 0 ? normalizeModelNumber(modelCandidates[0]) : null

  const sizeMatch = title.match(/\bsize[:\s-]*([a-z0-9./]+)\b/i) ?? title.match(/\b(uk|us|eu)\s?(\d{1,2}(?:\.\d)?)\b/i)
  const size = sizeMatch ? (sizeMatch[2] ?? sizeMatch[1]).toLowerCase() : null

  return { brand, modelNumber, gtin: null, storage, color, size }
}

export function attributesFrom(input: Partial<ProductAttributes> & { title?: string }): ProductAttributes {
  const extracted = input.title ? extractAttributes(input.title) : {
    brand: null, modelNumber: null, gtin: null, storage: null, color: null, size: null,
  }
  return {
    brand: normalizeBrand(input.brand ?? extracted.brand),
    modelNumber: normalizeModelNumber(input.modelNumber ?? extracted.modelNumber),
    gtin: normalizeGtin(input.gtin),
    storage: normalizeStorage(input.storage ?? extracted.storage),
    color: normalizeColor(input.color ?? extracted.color),
    size: input.size ? input.size.toLowerCase() : extracted.size,
  }
}
