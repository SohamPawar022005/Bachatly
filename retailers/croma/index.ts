import { createDemoAdapter } from '../retailer-adapter'

/** Croma adapter — demonstration data. See retailers/retailer-adapter.ts. */
export const cromaAdapter = createDemoAdapter({
  slug: 'croma',
  name: 'Croma',
  jitterPercent: 1,
  deliveryFeePolicy: 'published',
})
