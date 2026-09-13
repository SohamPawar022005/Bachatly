import { createDemoAdapter } from '../retailer-adapter'

/** Meesho adapter — demonstration data. See retailers/retailer-adapter.ts. */
export const meeshoAdapter = createDemoAdapter({
  slug: 'meesho',
  name: 'Meesho',
  jitterPercent: 3,
  deliveryFeePolicy: 'published',
})
