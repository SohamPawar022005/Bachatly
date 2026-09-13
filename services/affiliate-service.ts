import type { RetailerOffer } from '@/lib/pricing/types'

/**
 * Affiliate / "Buy now" flow.
 *
 * Bachatly never takes payment. Clicking Buy now sends the visitor to the
 * retailer's own product page — through the affiliate URL when one exists,
 * otherwise straight to the product URL. Both are absolute retailer URLs and
 * the UI marks them as external links (rel="sponsored nofollow noopener").
 */

export interface BuyLink {
  url: string
  isAffiliate: boolean
  retailerName: string
  retailerSlug: string
}

export function buildBuyLink(offer: RetailerOffer): BuyLink {
  const url = offer.affiliateUrl?.trim() ? offer.affiliateUrl.trim() : offer.productUrl
  return {
    url,
    isAffiliate: Boolean(offer.affiliateUrl?.trim()),
    retailerName: offer.retailerName,
    retailerSlug: offer.retailerSlug,
  }
}

export const EXTERNAL_LINK_REL = 'sponsored nofollow noopener noreferrer'
