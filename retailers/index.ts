import type { RetailerAdapter } from './retailer-adapter'
import { amazonAdapter } from './amazon'
import { flipkartAdapter } from './flipkart'
import { myntraAdapter } from './myntra'
import { cromaAdapter } from './croma'
import { relianceDigitalAdapter } from './reliance'
import { meeshoAdapter } from './meesho'

/**
 * Adapter registry. Adding a real integration means adding one entry here.
 */
const registry = new Map<string, RetailerAdapter>([
  [amazonAdapter.slug, amazonAdapter],
  [flipkartAdapter.slug, flipkartAdapter],
  [myntraAdapter.slug, myntraAdapter],
  [cromaAdapter.slug, cromaAdapter],
  [relianceDigitalAdapter.slug, relianceDigitalAdapter],
  [meeshoAdapter.slug, meeshoAdapter],
])

export function getAdapter(slug: string): RetailerAdapter | undefined {
  return registry.get(slug)
}

export function allAdapters(): RetailerAdapter[] {
  return [...registry.values()]
}

export function adapterStatus(): Array<{ slug: string; name: string; isLive: boolean; source: string }> {
  return allAdapters().map((a) => ({ slug: a.slug, name: a.name, isLive: a.isLive, source: a.source }))
}

export type { RetailerAdapter, RetailerPriceResult, RetailerSearchResult } from './retailer-adapter'
export { createDemoAdapter } from './retailer-adapter'
