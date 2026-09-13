/**
 * Retailer definitions used by the seed script.
 *
 * These are demonstration records. `affiliateUrlTemplate` shows the shape of a
 * real affiliate integration: the stored `productUrl` is rewritten through the
 * template when the visitor clicks "Buy now". No deceptive redirects — the
 * destination is always the retailer's own product page.
 */

export interface SeedRetailer {
  name: string
  slug: string
  websiteUrl: string
  brandColor: string
  logoText: string
  affiliateNetwork?: string
  affiliateId?: string
  affiliateUrlTemplate?: string
  /**
   * How this retailer writes product titles. Real feeds differ in ordering,
   * punctuation and noise — which is exactly what the identity-resolution
   * engine has to cope with.
   */
  titleStyle: 'amazon' | 'flipkart' | 'croma' | 'reliance' | 'myntra' | 'meesho'
}

export const SEED_RETAILERS: SeedRetailer[] = [
  {
    name: 'Amazon',
    slug: 'amazon',
    websiteUrl: 'https://www.amazon.in',
    brandColor: '#FF9900',
    logoText: 'a',
    affiliateNetwork: 'Amazon Associates (demo)',
    affiliateId: 'bachatly-21',
    affiliateUrlTemplate: '{productUrl}?tag={affiliateId}',
    titleStyle: 'amazon',
  },
  {
    name: 'Flipkart',
    slug: 'flipkart',
    websiteUrl: 'https://www.flipkart.com',
    brandColor: '#2874F0',
    logoText: 'F',
    affiliateNetwork: 'Flipkart Affiliate (demo)',
    affiliateId: 'bachatly',
    affiliateUrlTemplate: '{productUrl}?affid={affiliateId}',
    titleStyle: 'flipkart',
  },
  {
    name: 'Croma',
    slug: 'croma',
    websiteUrl: 'https://www.croma.com',
    brandColor: '#E4002B',
    logoText: 'C',
    affiliateNetwork: 'Croma Partner Programme (demo)',
    affiliateId: 'bachatly',
    affiliateUrlTemplate: '{productUrl}?utm_source={affiliateId}',
    titleStyle: 'croma',
  },
  {
    name: 'Reliance Digital',
    slug: 'reliance-digital',
    websiteUrl: 'https://www.reliancedigital.in',
    brandColor: '#0B5FFF',
    logoText: 'R',
    affiliateNetwork: 'Reliance Digital Partners (demo)',
    affiliateId: 'bachatly',
    affiliateUrlTemplate: '{productUrl}?utm_medium=affiliate&utm_source={affiliateId}',
    titleStyle: 'reliance',
  },
  {
    name: 'Myntra',
    slug: 'myntra',
    websiteUrl: 'https://www.myntra.com',
    brandColor: '#FF3F6C',
    logoText: 'M',
    affiliateNetwork: 'Myntra Affiliate (demo)',
    affiliateId: 'bachatly',
    affiliateUrlTemplate: '{productUrl}?utm_source={affiliateId}',
    titleStyle: 'myntra',
  },
  {
    name: 'Meesho',
    slug: 'meesho',
    websiteUrl: 'https://www.meesho.com',
    brandColor: '#7C3AED',
    logoText: 'Me',
    affiliateNetwork: 'Meesho Supply Partner (demo)',
    affiliateId: 'bachatly',
    affiliateUrlTemplate: '{productUrl}?ref={affiliateId}',
    titleStyle: 'meesho',
  },
]

/** Renders a retailer-specific product title from canonical attributes. */
export function renderRetailerTitle(
  style: SeedRetailer['titleStyle'],
  parts: { brand: string; title: string; storage?: string | null; color?: string | null; size?: string | null },
): string {
  const { brand, title, storage, color, size } = parts
  const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1)
  switch (style) {
    case 'amazon':
      return `${cap(brand)} ${title}${storage ? ` ${storage}` : ''}${color ? ` - ${cap(color)}` : ''}${size ? ` (Size ${size})` : ''}`
    case 'flipkart':
      return `${brand.toUpperCase()} ${title} (${[color ? cap(color) : null, storage ?? (size ? `Size ${size}` : null)]
        .filter(Boolean)
        .join(', ')})`
    case 'croma':
      return `${cap(brand)} ${title}${storage ? ` ${storage}` : ''}${color ? ` (${cap(color)})` : ''}`
    case 'reliance':
      return `${cap(brand)} ${title}${storage ? ` ${storage}` : ''}${color ? ` - ${cap(color)}` : ''}${size ? ` - Size ${size}` : ''}`
    case 'myntra':
      return `${cap(brand)} ${title}${color ? ` ${cap(color)}` : ''}${size ? ` Size ${size}` : ''}`
    case 'meesho':
      // Deliberately noisy, keyword-stuffed title — the worst case for matching.
      return `${title} ${color ? cap(color) : ''} ${storage ?? ''} ${size ? `Size ${size} ` : ''}Latest Model Best Quality`
  }
}
