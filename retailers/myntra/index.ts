import { createDemoAdapter } from '../retailer-adapter'

/** Myntra adapter — demonstration data. See retailers/retailer-adapter.ts. */
export const myntraAdapter = createDemoAdapter({
  slug: 'myntra',
  name: 'Myntra',
  jitterPercent: 2.5,
  deliveryFeePolicy: 'published',
})
