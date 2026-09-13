import { createDemoAdapter } from '../retailer-adapter'

/**
 * Reliance Digital adapter — demonstration data.
 * This retailer sometimes does not publish a delivery fee; the comparison engine
 * then excludes that component instead of guessing.
 */
export const relianceDigitalAdapter = createDemoAdapter({
  slug: 'reliance-digital',
  name: 'Reliance Digital',
  jitterPercent: 1.5,
  deliveryFeePolicy: 'unknown',
})
