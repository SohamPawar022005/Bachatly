import { createDemoAdapter } from '../retailer-adapter'

/**
 * Amazon adapter.
 *
 * DEMONSTRATION implementation: reads the seeded catalogue. Replace the body of
 * `createDemoAdapter` with an authorized Product Advertising API client to go
 * live — the interface does not change.
 */
export const amazonAdapter = createDemoAdapter({
  slug: 'amazon',
  name: 'Amazon',
  jitterPercent: 1.5,
  deliveryFeePolicy: 'always-free',
})
