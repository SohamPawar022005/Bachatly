import { createDemoAdapter } from '../retailer-adapter'

/** Flipkart adapter — demonstration data. See retailers/retailer-adapter.ts. */
export const flipkartAdapter = createDemoAdapter({
  slug: 'flipkart',
  name: 'Flipkart',
  jitterPercent: 2,
  deliveryFeePolicy: 'always-free',
})
