/**
 * Demonstration catalogue.
 *
 * IMPORTANT: every product, price and availability value in this file is
 * seeded DEMO data. It is written to the database with `source = 'DEMO'` and
 * the UI labels it as demonstration data. It is never presented as a live
 * retailer price. The structure mirrors what a real, authorized retailer feed
 * or affiliate API would deliver, so adapters can be swapped in later.
 *
 * All money values are written with `rs()` so they read as rupees and are
 * stored as integer paise.
 */

export type Trend = 'stable' | 'dropping' | 'rising' | 'volatile' | 'recent-drop' | 'recovered'
export type SeedAvailability = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'UNKNOWN'

export const rs = (rupees: number) => Math.round(rupees * 100)

export interface SeedListingInput {
  retailer: string
  /** Rupees. */
  price: number
  /** Rupees. */
  mrp: number
  /** Rupees. Omit entirely to model "delivery fee not published". */
  deliveryFee?: number
  deliveryText?: string
  deliveryDays?: number
  availability?: SeedAvailability
  trend?: Trend
  /** Overrides the generated retailer-style title. */
  rawTitle?: string
}

export interface SeedVariantInput {
  title: string
  slug: string
  sku?: string
  modelNumber?: string
  gtin?: string
  color?: string
  size?: string
  storage?: string
  specifications?: Record<string, string>
  listings: SeedListingInput[]
}

export interface SeedProductInput {
  title: string
  slug: string
  brand: string
  category: string
  description: string
  imageUrl: string
  rating: number
  reviewCount: number
  variants: SeedVariantInput[]
}

export interface SeedCategoryInput {
  name: string
  slug: string
  description: string
  imageUrl: string
  sortOrder: number
  parent?: string
}

export const SEED_CATEGORIES: SeedCategoryInput[] = [
  {
    name: 'Mobiles',
    slug: 'mobiles',
    description: 'Smartphones from every major brand, compared across retailers.',
    imageUrl: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=70',
    sortOrder: 1,
  },
  {
    name: 'Computers',
    slug: 'computers',
    description: 'Laptops, tablets and desktops.',
    imageUrl: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=70',
    sortOrder: 2,
  },
  {
    name: 'Electronics',
    slug: 'electronics',
    description: 'Audio, televisions, cameras and everything in between.',
    imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=800&q=70',
    sortOrder: 3,
  },
  {
    name: 'Fashion',
    slug: 'fashion',
    description: 'Footwear, apparel and watches.',
    imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=70',
    sortOrder: 4,
  },
  {
    name: 'Beauty',
    slug: 'beauty',
    description: 'Skincare and makeup essentials.',
    imageUrl: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&q=70',
    sortOrder: 5,
  },
  {
    name: 'Home & Kitchen',
    slug: 'home-kitchen',
    description: 'Appliances and cookware for the Indian home.',
    imageUrl: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=70',
    sortOrder: 6,
  },
  {
    name: 'Grocery',
    slug: 'grocery',
    description: 'Daily essentials, compared by unit price.',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=70',
    sortOrder: 7,
  },
  {
    name: 'Sports',
    slug: 'sports',
    description: 'Gear for cricket, football, badminton and fitness.',
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=70',
    sortOrder: 8,
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Wearables, chargers, power banks and cables.',
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=70',
    sortOrder: 9,
  },
  // Subcategories (shown on category pages).
  { name: 'Smartphones', slug: 'smartphones', description: 'Latest 5G smartphones.', imageUrl: '', sortOrder: 1, parent: 'mobiles' },
  { name: 'Laptops', slug: 'laptops', description: 'Work, study and gaming laptops.', imageUrl: '', sortOrder: 1, parent: 'computers' },
  { name: 'Tablets', slug: 'tablets', description: 'Tablets for work and entertainment.', imageUrl: '', sortOrder: 2, parent: 'computers' },
  { name: 'Audio', slug: 'audio', description: 'Headphones, earbuds and speakers.', imageUrl: '', sortOrder: 1, parent: 'electronics' },
  { name: 'Televisions', slug: 'televisions', description: 'LED, QLED and OLED televisions.', imageUrl: '', sortOrder: 2, parent: 'electronics' },
  { name: 'Footwear', slug: 'footwear', description: 'Sneakers, running shoes and more.', imageUrl: '', sortOrder: 1, parent: 'fashion' },
]

const IMG = {
  iphone16: 'https://images.unsplash.com/photo-1592286927505-1def25115558?w=900&q=70',
  iphone15: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=900&q=70',
  galaxy: 'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=900&q=70',
  macbook: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=900&q=70',
  laptop: 'https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=900&q=70',
  gaming: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=900&q=70',
  ipad: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=900&q=70',
  airpods: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=900&q=70',
  headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900&q=70',
  speaker: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=900&q=70',
  tv: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=900&q=70',
  camera: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=900&q=70',
  shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=70',
  sneakers: 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=900&q=70',
  jeans: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=900&q=70',
  watch: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=900&q=70',
  lipstick: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=900&q=70',
  serum: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=900&q=70',
  sunscreen: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=900&q=70',
  stove: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=70',
  airfryer: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=900&q=70',
  flask: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=900&q=70',
  shuttle: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=900&q=70',
  football: 'https://images.unsplash.com/photo-1614632537190-23e4146777db?w=900&q=70',
  applewatch: 'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=900&q=70',
  charger: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=900&q=70',
  powerbank: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=900&q=70',
  dal: 'https://images.unsplash.com/photo-1585996746676-f01381a41f48?w=900&q=70',
  butter: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=900&q=70',
}

/** Convenience builder that keeps the catalogue readable. */
function listing(
  retailer: string,
  price: number,
  mrp: number,
  opts: Partial<Omit<SeedListingInput, 'retailer' | 'price' | 'mrp'>> & { deliveryFee?: number } = {},
): SeedListingInput {
  return {
    retailer,
    price,
    mrp,
    deliveryFee: opts.deliveryFee,
    deliveryText: opts.deliveryText ?? 'Free delivery',
    deliveryDays: opts.deliveryDays ?? 2,
    availability: opts.availability ?? 'IN_STOCK',
    trend: opts.trend ?? 'stable',
    rawTitle: opts.rawTitle,
  }
}

export const SEED_PRODUCTS: SeedProductInput[] = [
  // ------------------------------------------------------------------ MOBILES
  {
    title: 'iPhone 16',
    slug: 'apple-iphone-16',
    brand: 'Apple',
    category: 'smartphones',
    description:
      'The Apple iPhone 16 with the A18 chip, a 6.1-inch Super Retina XDR display, 48MP Fusion camera and Apple Intelligence.',
    imageUrl: IMG.iphone16,
    rating: 4.7,
    reviewCount: 12844,
    variants: [
      {
        title: '128GB Black',
        slug: 'apple-iphone-16-128gb-black',
        sku: 'MYE93HN/A',
        modelNumber: 'A3286',
        gtin: '194253938559',
        color: 'Black',
        storage: '128GB',
        specifications: { Display: '6.1-inch Super Retina XDR', Chip: 'Apple A18', Camera: '48MP Fusion dual camera', Battery: 'Up to 22 hours video', OS: 'iOS 18' },
        listings: [
          listing('amazon', 66499, 79900, { trend: 'stable', deliveryDays: 2 }),
          listing('flipkart', 64999, 79900, { trend: 'recent-drop', deliveryDays: 1, deliveryText: 'Free delivery by tomorrow' }),
          listing('croma', 67990, 79900, { trend: 'stable', deliveryDays: 3 }),
          listing('reliance-digital', 67499, 79900, { trend: 'volatile', deliveryDays: 3 }),
          listing('meesho', 65999, 79900, { availability: 'OUT_OF_STOCK', deliveryFee: 99, deliveryText: 'Delivery in 4-6 days', deliveryDays: 5, trend: 'stable' }),
        ],
      },
      {
        title: '128GB Pink',
        slug: 'apple-iphone-16-128gb-pink',
        sku: 'MYEA3HN/A',
        modelNumber: 'A3286',
        gtin: '194253938665',
        color: 'Pink',
        storage: '128GB',
        specifications: { Display: '6.1-inch Super Retina XDR', Chip: 'Apple A18', Camera: '48MP Fusion dual camera' },
        listings: [
          listing('amazon', 66999, 79900, { trend: 'stable' }),
          listing('flipkart', 65499, 79900, { trend: 'dropping' }),
          listing('croma', 68490, 79900, { trend: 'stable' }),
        ],
      },
      {
        title: '256GB Black',
        slug: 'apple-iphone-16-256gb-black',
        sku: 'MYEC3HN/A',
        modelNumber: 'A3286',
        gtin: '194253938771',
        color: 'Black',
        storage: '256GB',
        specifications: { Display: '6.1-inch Super Retina XDR', Chip: 'Apple A18', Storage: '256GB' },
        listings: [
          listing('amazon', 76900, 89900, { trend: 'stable' }),
          listing('flipkart', 74999, 89900, { trend: 'recent-drop' }),
          listing('croma', 78490, 89900, { trend: 'stable' }),
          listing('reliance-digital', 77999, 89900, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'iPhone 15',
    slug: 'apple-iphone-15',
    brand: 'Apple',
    category: 'smartphones',
    description: 'Apple iPhone 15 with Dynamic Island, A16 Bionic chip and a 48MP main camera.',
    imageUrl: IMG.iphone15,
    rating: 4.6,
    reviewCount: 21930,
    variants: [
      {
        title: '128GB Blue',
        slug: 'apple-iphone-15-128gb-blue',
        sku: 'MTU43HN/A',
        modelNumber: 'A3092',
        gtin: '194253938117',
        color: 'Blue',
        storage: '128GB',
        specifications: { Display: '6.1-inch Super Retina XDR', Chip: 'Apple A16 Bionic' },
        listings: [
          listing('amazon', 57999, 69900, { trend: 'dropping' }),
          listing('flipkart', 56499, 69900, { trend: 'stable' }),
          listing('croma', 59990, 69900, { trend: 'stable' }),
          listing('reliance-digital', 58999, 69900, { deliveryFee: undefined, deliveryText: 'Delivery charges at checkout', trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Galaxy S24 Ultra',
    slug: 'samsung-galaxy-s24-ultra',
    brand: 'Samsung',
    category: 'smartphones',
    description: 'Samsung Galaxy S24 Ultra with Snapdragon 8 Gen 3, 200MP camera, S Pen and titanium frame.',
    imageUrl: IMG.galaxy,
    rating: 4.6,
    reviewCount: 8421,
    variants: [
      {
        title: '256GB Titanium Gray',
        slug: 'samsung-galaxy-s24-ultra-256gb-titanium-gray',
        sku: 'SM-S928BZAGINS',
        modelNumber: 'SM-S928B',
        gtin: '8806095288878',
        color: 'Titanium Gray',
        storage: '256GB',
        specifications: { Display: '6.8-inch QHD+ Dynamic AMOLED 2X', Chip: 'Snapdragon 8 Gen 3', Camera: '200MP quad camera' },
        listings: [
          listing('amazon', 121999, 134999, { trend: 'dropping' }),
          listing('flipkart', 119999, 134999, { trend: 'recent-drop' }),
          listing('croma', 127990, 134999, { trend: 'stable' }),
          listing('reliance-digital', 124999, 134999, { trend: 'stable' }),
        ],
      },
      {
        title: '512GB Titanium Gray',
        slug: 'samsung-galaxy-s24-ultra-512gb-titanium-gray',
        sku: 'SM-S928BZAHINS',
        modelNumber: 'SM-S928B',
        gtin: '8806095288991',
        color: 'Titanium Gray',
        storage: '512GB',
        listings: [
          listing('amazon', 137999, 149999, { trend: 'stable' }),
          listing('flipkart', 135999, 149999, { trend: 'dropping' }),
          listing('croma', 141990, 149999, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Galaxy M35 5G',
    slug: 'samsung-galaxy-m35-5g',
    brand: 'Samsung',
    category: 'smartphones',
    description: 'Samsung Galaxy M35 5G with a 6000mAh battery, 120Hz sAMOLED display and Exynos 1380.',
    imageUrl: IMG.galaxy,
    rating: 4.3,
    reviewCount: 15320,
    variants: [
      {
        title: '128GB Daylight Blue',
        slug: 'samsung-galaxy-m35-5g-128gb-daylight-blue',
        sku: 'SM-M356BLBDINS',
        modelNumber: 'SM-M356B',
        gtin: '8806095441234',
        color: 'Blue',
        storage: '128GB',
        listings: [
          listing('amazon', 16999, 21990, { trend: 'volatile' }),
          listing('flipkart', 16499, 21990, { trend: 'recent-drop' }),
          listing('meesho', 16299, 21990, { deliveryFee: 49, deliveryText: 'Delivery in 3-5 days', deliveryDays: 4, trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'OnePlus 12R',
    slug: 'oneplus-12r',
    brand: 'OnePlus',
    category: 'smartphones',
    description: 'OnePlus 12R with Snapdragon 8 Gen 2, 100W SUPERVOOC charging and a 120Hz ProXDR display.',
    imageUrl: IMG.galaxy,
    rating: 4.4,
    reviewCount: 9820,
    variants: [
      {
        title: '256GB Iron Gray',
        slug: 'oneplus-12r-256gb-iron-gray',
        sku: 'CPH2585',
        modelNumber: 'CPH2585',
        gtin: '6921815628545',
        color: 'Iron Gray',
        storage: '256GB',
        listings: [
          listing('amazon', 39999, 45999, { trend: 'dropping' }),
          listing('flipkart', 38999, 45999, { trend: 'stable' }),
          listing('croma', 41990, 45999, { trend: 'stable' }),
          listing('reliance-digital', 40999, 45999, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Redmi Note 13 Pro',
    slug: 'xiaomi-redmi-note-13-pro',
    brand: 'Xiaomi',
    category: 'smartphones',
    description: 'Redmi Note 13 Pro with a 200MP camera, 120Hz AMOLED display and 67W turbo charging.',
    imageUrl: IMG.galaxy,
    rating: 4.2,
    reviewCount: 33110,
    variants: [
      {
        title: '256GB Midnight Black',
        slug: 'xiaomi-redmi-note-13-pro-256gb-black',
        sku: 'MZB0KWHIN',
        modelNumber: '2312DRA50I',
        gtin: '6941812728952',
        color: 'Black',
        storage: '256GB',
        listings: [
          listing('amazon', 23999, 27999, { trend: 'stable' }),
          listing('flipkart', 22999, 27999, { trend: 'recent-drop' }),
          listing('meesho', 23499, 27999, { deliveryFee: 59, deliveryText: 'Delivery in 4 days', deliveryDays: 4, trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Pixel 8',
    slug: 'google-pixel-8',
    brand: 'Google',
    category: 'smartphones',
    description: 'Google Pixel 8 with Tensor G3, best-in-class computational photography and 7 years of updates.',
    imageUrl: IMG.galaxy,
    rating: 4.4,
    reviewCount: 4210,
    variants: [
      {
        title: '128GB Obsidian',
        slug: 'google-pixel-8-128gb-obsidian',
        sku: 'GZPFO07124',
        modelNumber: 'GZPFO',
        gtin: '840242404037',
        color: 'Black',
        storage: '128GB',
        listings: [
          listing('amazon', 59999, 75999, { trend: 'dropping' }),
          listing('flipkart', 57999, 75999, { trend: 'dropping' }),
          listing('croma', 63990, 75999, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Narzo 70 Pro 5G',
    slug: 'realme-narzo-70-pro',
    brand: 'Realme',
    category: 'smartphones',
    description: 'Realme Narzo 70 Pro 5G with a 50MP Sony IMX890 camera and 67W SUPERVOOC charge.',
    imageUrl: IMG.galaxy,
    rating: 4.1,
    reviewCount: 18770,
    variants: [
      {
        title: '128GB Glass Green',
        slug: 'realme-narzo-70-pro-128gb-green',
        sku: 'RMX3868',
        modelNumber: 'RMX3868',
        gtin: '6941399000000',
        color: 'Green',
        storage: '128GB',
        listings: [
          listing('flipkart', 15999, 19999, { trend: 'volatile' }),
          listing('amazon', 16499, 19999, { trend: 'stable' }),
          listing('meesho', 15799, 19999, { deliveryFee: 45, deliveryText: 'Delivery in 5 days', deliveryDays: 5, trend: 'recent-drop' }),
        ],
      },
    ],
  },

  // --------------------------------------------------------------- COMPUTERS
  {
    title: 'MacBook Air M2',
    slug: 'apple-macbook-air-m2',
    brand: 'Apple',
    category: 'laptops',
    description: 'Apple MacBook Air with the M2 chip, 13.6-inch Liquid Retina display and up to 18 hours of battery.',
    imageUrl: IMG.macbook,
    rating: 4.8,
    reviewCount: 6540,
    variants: [
      {
        title: '13-inch 256GB Midnight',
        slug: 'apple-macbook-air-m2-13-inch-256gb-midnight',
        sku: 'MLY33HN/A',
        modelNumber: 'A2681',
        gtin: '194253395283',
        color: 'Midnight',
        storage: '256GB',
        specifications: { Chip: 'Apple M2', Memory: '8GB unified', Display: '13.6-inch Liquid Retina', Weight: '1.24 kg' },
        listings: [
          listing('amazon', 92990, 114900, { trend: 'dropping' }),
          listing('flipkart', 89990, 114900, { trend: 'recent-drop' }),
          listing('croma', 96990, 114900, { trend: 'stable' }),
          listing('reliance-digital', 94999, 114900, { trend: 'stable' }),
        ],
      },
      {
        title: '13-inch 512GB Midnight',
        slug: 'apple-macbook-air-m2-13-inch-512gb-midnight',
        sku: 'MLY63HN/A',
        modelNumber: 'A2681',
        gtin: '194253395313',
        color: 'Midnight',
        storage: '512GB',
        listings: [
          listing('amazon', 112900, 134900, { trend: 'stable' }),
          listing('croma', 114990, 134900, { trend: 'stable' }),
          listing('flipkart', 110990, 134900, { trend: 'dropping' }),
        ],
      },
    ],
  },
  {
    title: 'MacBook Pro 14 M3',
    slug: 'apple-macbook-pro-14-m3',
    brand: 'Apple',
    category: 'laptops',
    description: 'Apple MacBook Pro 14-inch with the M3 chip, Liquid Retina XDR display and 18-hour battery life.',
    imageUrl: IMG.macbook,
    rating: 4.9,
    reviewCount: 3110,
    variants: [
      {
        title: '14-inch 512GB Space Black',
        slug: 'apple-macbook-pro-14-m3-512gb-space-black',
        sku: 'MTL83HN/A',
        modelNumber: 'A3112',
        gtin: '195949321040',
        color: 'Space Black',
        storage: '512GB',
        listings: [
          listing('amazon', 159900, 179900, { trend: 'stable' }),
          listing('croma', 164990, 179900, { trend: 'stable' }),
          listing('reliance-digital', 162499, 179900, { trend: 'dropping' }),
        ],
      },
    ],
  },
  {
    title: 'Pavilion 15 Laptop',
    slug: 'hp-pavilion-15-laptop',
    brand: 'HP',
    category: 'laptops',
    description: 'HP Pavilion 15 with 13th Gen Intel Core i5, 16GB RAM, 512GB SSD and a Full HD IPS display.',
    imageUrl: IMG.laptop,
    rating: 4.2,
    reviewCount: 2210,
    variants: [
      {
        title: 'Core i5 16GB 512GB',
        slug: 'hp-pavilion-15-core-i5-16gb-512gb',
        sku: 'HP-PV15-i5-16G',
        modelNumber: 'EG3083TU',
        gtin: '196909000001',
        storage: '512GB',
        color: 'Silver',
        specifications: { Processor: 'Intel Core i5-1335U', Memory: '16GB DDR4', Storage: '512GB NVMe SSD' },
        listings: [
          listing('amazon', 56990, 68999, { trend: 'dropping' }),
          listing('flipkart', 54990, 68999, { trend: 'recent-drop' }),
          listing('croma', 58990, 68999, { trend: 'stable' }),
          listing('reliance-digital', 57499, 68999, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Inspiron 15 Laptop',
    slug: 'dell-inspiron-15-laptop',
    brand: 'Dell',
    category: 'laptops',
    description: 'Dell Inspiron 15 with Intel Core i5, 8GB RAM, 512GB SSD and a 120Hz refresh rate display.',
    imageUrl: IMG.laptop,
    rating: 4.1,
    reviewCount: 1840,
    variants: [
      {
        title: 'Core i5 8GB 512GB',
        slug: 'dell-inspiron-15-core-i5-8gb-512gb',
        sku: 'DELL-IN15-i5',
        modelNumber: 'IN3530',
        gtin: '196909000002',
        storage: '512GB',
        color: 'Black',
        listings: [
          listing('amazon', 51990, 62999, { trend: 'stable' }),
          listing('croma', 52990, 62999, { trend: 'stable' }),
          listing('reliance-digital', 49999, 62999, { trend: 'recent-drop' }),
        ],
      },
    ],
  },
  {
    title: 'ROG Strix G16 Gaming Laptop',
    slug: 'asus-rog-strix-g16',
    brand: 'ASUS',
    category: 'laptops',
    description: 'ASUS ROG Strix G16 gaming laptop with Intel Core i7, RTX 4060 graphics and a 165Hz display.',
    imageUrl: IMG.gaming,
    rating: 4.5,
    reviewCount: 990,
    variants: [
      {
        title: 'i7 RTX 4060 16GB',
        slug: 'asus-rog-strix-g16-i7-rtx4060-16gb',
        sku: 'ASUS-G614JV',
        modelNumber: 'G614JV-N3146W',
        gtin: '196909000003',
        storage: '1TB',
        color: 'Eclipse Gray',
        specifications: { Processor: 'Intel Core i7-13650HX', Graphics: 'NVIDIA RTX 4060 8GB', Memory: '16GB DDR5' },
        listings: [
          listing('amazon', 154990, 189990, { trend: 'dropping' }),
          listing('flipkart', 152990, 189990, { trend: 'dropping' }),
          listing('croma', 159990, 189990, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'IdeaPad Slim 3',
    slug: 'lenovo-ideapad-slim-3',
    brand: 'Lenovo',
    category: 'laptops',
    description: 'Lenovo IdeaPad Slim 3 with AMD Ryzen 5, 16GB RAM and a lightweight 15.6-inch Full HD display.',
    imageUrl: IMG.laptop,
    rating: 4.0,
    reviewCount: 1520,
    variants: [
      {
        title: 'Ryzen 5 16GB 512GB',
        slug: 'lenovo-ideapad-slim-3-ryzen-5-16gb-512gb',
        sku: 'LENO-SLIM3-R5',
        modelNumber: '82XG00P1IN',
        gtin: '196909000004',
        storage: '512GB',
        color: 'Arctic Grey',
        listings: [
          listing('amazon', 44990, 56990, { trend: 'stable' }),
          listing('flipkart', 43990, 56990, { trend: 'volatile' }),
          listing('croma', 46990, 56990, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'iPad Air 11-inch M2',
    slug: 'apple-ipad-air-11-m2',
    brand: 'Apple',
    category: 'tablets',
    description: 'Apple iPad Air 11-inch with the M2 chip, Liquid Retina display and Apple Pencil Pro support.',
    imageUrl: IMG.ipad,
    rating: 4.8,
    reviewCount: 1870,
    variants: [
      {
        title: '128GB Space Grey Wi-Fi',
        slug: 'apple-ipad-air-11-m2-128gb-space-grey',
        sku: 'MUWG3HN/A',
        modelNumber: 'A2696',
        gtin: '195949600011',
        color: 'Space Grey',
        storage: '128GB',
        listings: [
          listing('amazon', 59900, 69900, { trend: 'stable' }),
          listing('croma', 62990, 69900, { trend: 'stable' }),
          listing('reliance-digital', 60999, 69900, { trend: 'dropping' }),
        ],
      },
    ],
  },
  {
    title: 'Galaxy Tab S9 FE',
    slug: 'samsung-galaxy-tab-s9-fe',
    brand: 'Samsung',
    category: 'tablets',
    description: 'Samsung Galaxy Tab S9 FE with S Pen in the box, a 10.9-inch display and IP68 water resistance.',
    imageUrl: IMG.ipad,
    rating: 4.3,
    reviewCount: 2640,
    variants: [
      {
        title: '128GB Wi-Fi Grey',
        slug: 'samsung-galaxy-tab-s9-fe-128gb-grey',
        sku: 'SM-X510NZAEINS',
        modelNumber: 'SM-X510',
        gtin: '8806095288777',
        color: 'Grey',
        storage: '128GB',
        listings: [
          listing('amazon', 32999, 42999, { trend: 'dropping' }),
          listing('flipkart', 31999, 42999, { trend: 'recent-drop' }),
          listing('croma', 34990, 42999, { trend: 'stable' }),
        ],
      },
    ],
  },

  // -------------------------------------------------------------- ELECTRONICS
  {
    title: 'AirPods Pro 2nd Generation',
    slug: 'apple-airpods-pro-2',
    brand: 'Apple',
    category: 'audio',
    description: 'Apple AirPods Pro (2nd generation) with Adaptive Audio, USB-C MagSafe charging case and active noise cancellation.',
    imageUrl: IMG.airpods,
    rating: 4.7,
    reviewCount: 27310,
    variants: [
      {
        title: 'USB-C White',
        slug: 'apple-airpods-pro-2-usb-c-white',
        sku: 'MTJV3HN/A',
        modelNumber: 'A2931',
        gtin: '194253933001',
        color: 'White',
        specifications: { Chip: 'Apple H2', 'Noise cancellation': 'Adaptive + transparency mode', Charging: 'USB-C MagSafe case' },
        listings: [
          listing('amazon', 21900, 26900, { trend: 'dropping' }),
          listing('flipkart', 20999, 26900, { trend: 'recent-drop' }),
          listing('croma', 23990, 26900, { trend: 'stable' }),
          listing('reliance-digital', 22499, 26900, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'AirPods 3rd Generation',
    slug: 'apple-airpods-3',
    brand: 'Apple',
    category: 'audio',
    description: 'Apple AirPods (3rd generation) with spatial audio, sweat resistance and a Lightning charging case.',
    imageUrl: IMG.airpods,
    rating: 4.5,
    reviewCount: 18450,
    variants: [
      {
        title: 'Lightning White',
        slug: 'apple-airpods-3-lightning-white',
        sku: 'MPNY3HN/A',
        modelNumber: 'A2564',
        gtin: '194253933002',
        color: 'White',
        listings: [
          listing('amazon', 16990, 20900, { trend: 'stable' }),
          listing('flipkart', 15999, 20900, { trend: 'dropping' }),
          listing('croma', 17990, 20900, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'WH-1000XM5 Headphones',
    slug: 'sony-wh-1000xm5',
    brand: 'Sony',
    category: 'audio',
    description: 'Sony WH-1000XM5 wireless noise cancelling headphones with 30-hour battery and multipoint Bluetooth.',
    imageUrl: IMG.headphones,
    rating: 4.6,
    reviewCount: 9410,
    variants: [
      {
        title: 'Over-ear Black',
        slug: 'sony-wh-1000xm5-over-ear-black',
        sku: 'WH1000XM5/B',
        modelNumber: 'WH-1000XM5',
        gtin: '4548736134522',
        color: 'Black',
        specifications: { Type: 'Over-ear wireless', Battery: 'Up to 30 hours', 'Noise cancellation': 'Industry leading ANC' },
        listings: [
          listing('amazon', 24990, 34990, { trend: 'dropping' }),
          listing('flipkart', 23990, 34990, { trend: 'dropping' }),
          listing('croma', 26990, 34990, { trend: 'stable' }),
          listing('reliance-digital', 25499, 34990, { trend: 'volatile' }),
        ],
      },
      {
        title: 'Over-ear Silver',
        slug: 'sony-wh-1000xm5-over-ear-silver',
        sku: 'WH1000XM5/S',
        modelNumber: 'WH-1000XM5',
        gtin: '4548736134539',
        color: 'Silver',
        listings: [
          listing('amazon', 25990, 34990, { trend: 'stable' }),
          listing('croma', 26990, 34990, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Rockerz 450 Headphones',
    slug: 'boat-rockerz-450',
    brand: 'boAt',
    category: 'audio',
    description: 'boAt Rockerz 450 on-ear wireless headphones with 15-hour playback and padded ear cushions.',
    imageUrl: IMG.headphones,
    rating: 4.1,
    reviewCount: 62100,
    variants: [
      {
        title: 'On-ear Black',
        slug: 'boat-rockerz-450-on-ear-black',
        sku: 'RZ450BLK',
        modelNumber: 'Rockerz 450',
        gtin: '8901234560011',
        color: 'Black',
        listings: [
          listing('amazon', 1299, 2490, { trend: 'volatile' }),
          listing('flipkart', 1199, 2490, { trend: 'recent-drop' }),
          listing('meesho', 1099, 2490, { deliveryFee: 40, deliveryText: 'Delivery in 4 days', deliveryDays: 4, trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Flip 6 Portable Speaker',
    slug: 'jbl-flip-6',
    brand: 'JBL',
    category: 'audio',
    description: 'JBL Flip 6 portable Bluetooth speaker with IP67 waterproofing and 12 hours of playtime.',
    imageUrl: IMG.speaker,
    rating: 4.5,
    reviewCount: 14220,
    variants: [
      {
        title: 'Portable Black',
        slug: 'jbl-flip-6-portable-black',
        sku: 'JBLFLIP6BLK',
        modelNumber: 'Flip 6',
        gtin: '1200130000015',
        color: 'Black',
        listings: [
          listing('amazon', 9999, 13999, { trend: 'dropping' }),
          listing('flipkart', 9499, 13999, { trend: 'stable' }),
          listing('croma', 10499, 13999, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: '55-inch Crystal 4K Smart TV',
    slug: 'samsung-55-inch-crystal-4k',
    brand: 'Samsung',
    category: 'televisions',
    description: 'Samsung 55-inch Crystal UHD 4K Smart TV with Tizen OS, HDR10+ and a slim bezel design.',
    imageUrl: IMG.tv,
    rating: 4.3,
    reviewCount: 5210,
    variants: [
      {
        title: '55-inch 4K UHD',
        slug: 'samsung-55-inch-crystal-4k-uhd',
        sku: 'UA55C8000',
        modelNumber: 'UA55C8000AKXXL',
        gtin: '8806095000011',
        specifications: { 'Screen size': '55 inch', Resolution: '3840 x 2160 (4K)', OS: 'Tizen' },
        listings: [
          listing('amazon', 48990, 64900, { trend: 'dropping' }),
          listing('croma', 46990, 64900, { trend: 'recent-drop' }),
          listing('reliance-digital', 49999, 64900, { trend: 'stable' }),
          listing('flipkart', 47490, 64900, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: '43-inch 4K Smart TV',
    slug: 'lg-43-inch-4k',
    brand: 'LG',
    category: 'televisions',
    description: 'LG 43-inch 4K UHD Smart TV with webOS 23, AI Sound Pro and Active HDR.',
    imageUrl: IMG.tv,
    rating: 4.2,
    reviewCount: 3820,
    variants: [
      {
        title: '43-inch 4K UHD',
        slug: 'lg-43-inch-4k-uhd',
        sku: '43UR7500',
        modelNumber: '43UR7500PSC',
        gtin: '8806091000011',
        specifications: { 'Screen size': '43 inch', Resolution: '4K UHD', OS: 'webOS 23' },
        listings: [
          listing('amazon', 29990, 39990, { trend: 'stable' }),
          listing('croma', 28990, 39990, { trend: 'dropping' }),
          listing('reliance-digital', 30499, 39990, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Bravia 65-inch OLED TV',
    slug: 'sony-bravia-65-oled',
    brand: 'Sony',
    category: 'televisions',
    description: 'Sony Bravia 65-inch 4K OLED TV with Cognitive Processor XR and Google TV built in.',
    imageUrl: IMG.tv,
    rating: 4.7,
    reviewCount: 740,
    variants: [
      {
        title: '65-inch OLED',
        slug: 'sony-bravia-65-inch-oled',
        sku: 'XR65A80L',
        modelNumber: 'XR-65A80L',
        gtin: '4548736100011',
        specifications: { 'Screen size': '65 inch', Panel: 'OLED', Processor: 'Cognitive Processor XR' },
        listings: [
          listing('amazon', 214900, 269900, { trend: 'dropping' }),
          listing('croma', 209990, 269900, { trend: 'recent-drop' }),
          listing('reliance-digital', 219999, 269900, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'EOS 1500D DSLR Camera',
    slug: 'canon-eos-1500d',
    brand: 'Canon',
    category: 'electronics',
    description: 'Canon EOS 1500D DSLR camera with 24.1MP APS-C sensor, Full HD video and Wi-Fi.',
    imageUrl: IMG.camera,
    rating: 4.3,
    reviewCount: 2890,
    variants: [
      {
        title: 'Body with 18-55mm lens',
        slug: 'canon-eos-1500d-18-55mm',
        sku: 'CAN1500DKIT',
        modelNumber: 'EOS 1500D',
        gtin: '4549292000011',
        listings: [
          listing('amazon', 38990, 46999, { trend: 'stable' }),
          listing('croma', 37990, 46999, { trend: 'dropping' }),
          listing('reliance-digital', 39499, 46999, { trend: 'stable' }),
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ FASHION
  {
    title: 'Air Zoom Pegasus 41 Running Shoes',
    slug: 'nike-air-zoom-pegasus-41',
    brand: 'Nike',
    category: 'footwear',
    description: 'Nike Air Zoom Pegasus 41 running shoes with ReactX foam and dual Air Zoom units.',
    imageUrl: IMG.shoes,
    rating: 4.4,
    reviewCount: 3310,
    variants: [
      {
        title: 'Black Size 9',
        slug: 'nike-air-zoom-pegasus-41-black-9',
        sku: 'FD2722-001-9',
        modelNumber: 'FD2722-001',
        gtin: '196149000011',
        color: 'Black',
        size: '9',
        listings: [
          listing('myntra', 10796, 11995, { trend: 'dropping' }),
          listing('amazon', 11395, 11995, { trend: 'stable' }),
          listing('flipkart', 10999, 11995, { trend: 'recent-drop' }),
        ],
      },
      {
        title: 'Black Size 10',
        slug: 'nike-air-zoom-pegasus-41-black-10',
        sku: 'FD2722-001-10',
        modelNumber: 'FD2722-001',
        gtin: '196149000028',
        color: 'Black',
        size: '10',
        listings: [
          listing('myntra', 10995, 11995, { trend: 'stable' }),
          listing('amazon', 11395, 11995, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Ultraboost Light Running Shoes',
    slug: 'adidas-ultraboost-light',
    brand: 'Adidas',
    category: 'footwear',
    description: 'Adidas Ultraboost Light with LIGHTBOOST midsole — 30% lighter than previous Boost.',
    imageUrl: IMG.sneakers,
    rating: 4.5,
    reviewCount: 1980,
    variants: [
      {
        title: 'White Size 9',
        slug: 'adidas-ultraboost-light-white-9',
        sku: 'HP5786-9',
        modelNumber: 'HP5786',
        gtin: '406540000011',
        color: 'White',
        size: '9',
        listings: [
          listing('myntra', 15999, 19999, { trend: 'dropping' }),
          listing('amazon', 16999, 19999, { trend: 'stable' }),
          listing('flipkart', 16499, 19999, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Smash v2 Buck Sneakers',
    slug: 'puma-smash-v2-buck',
    brand: 'Puma',
    category: 'footwear',
    description: 'Puma Smash v2 Buck low-top sneakers with a leather upper and SoftFoam+ footbed.',
    imageUrl: IMG.sneakers,
    rating: 4.2,
    reviewCount: 5120,
    variants: [
      {
        title: 'White Black Size 8',
        slug: 'puma-smash-v2-buck-white-8',
        sku: '359879-08',
        modelNumber: '359879',
        gtin: '405980000011',
        color: 'White',
        size: '8',
        listings: [
          listing('myntra', 3149, 4499, { trend: 'volatile' }),
          listing('amazon', 3374, 4499, { trend: 'stable' }),
          listing('flipkart', 3199, 4499, { trend: 'recent-drop' }),
          listing('meesho', 2999, 4499, { deliveryFee: 49, deliveryText: 'Delivery in 5 days', deliveryDays: 5, trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: "511 Slim Fit Stretch Jeans",
    slug: 'levis-511-slim-fit-jeans',
    brand: "Levi's",
    category: 'fashion',
    description: "Levi's 511 Slim Fit stretch jeans — slim through the thigh with a slight taper.",
    imageUrl: IMG.jeans,
    rating: 4.1,
    reviewCount: 8420,
    variants: [
      {
        title: 'Dark Indigo Waist 32',
        slug: 'levis-511-slim-fit-jeans-dark-indigo-32',
        sku: '12345678-32',
        modelNumber: '511',
        gtin: '541490000011',
        color: 'Dark Indigo',
        size: '32',
        listings: [
          listing('myntra', 2099, 3499, { trend: 'dropping' }),
          listing('amazon', 2449, 3499, { trend: 'stable' }),
          listing('flipkart', 2299, 3499, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Analog Minimalist Watch',
    slug: 'fastrack-analog-minimalist-watch',
    brand: 'Fastrack',
    category: 'fashion',
    description: 'Fastrack analog watch with a minimalist dial, leather strap and 30m water resistance.',
    imageUrl: IMG.watch,
    rating: 4.0,
    reviewCount: 6210,
    variants: [
      {
        title: 'Brown Leather Strap',
        slug: 'fastrack-analog-minimalist-watch-brown',
        sku: '38031AP01',
        modelNumber: '38031AP01',
        gtin: '890431000011',
        color: 'Brown',
        listings: [
          listing('amazon', 1495, 2495, { trend: 'volatile' }),
          listing('myntra', 1395, 2495, { trend: 'dropping' }),
          listing('flipkart', 1449, 2495, { trend: 'stable' }),
        ],
      },
    ],
  },

  // ------------------------------------------------------------------- BEAUTY
  {
    title: 'Absolute Matte Melt Liquid Lipstick',
    slug: 'lakme-absolute-matte-melt-lipstick',
    brand: 'Lakme',
    category: 'beauty',
    description: 'Lakme Absolute Matte Melt liquid lipstick with 12-hour transfer-proof wear.',
    imageUrl: IMG.lipstick,
    rating: 4.2,
    reviewCount: 9120,
    variants: [
      {
        title: 'Red Carpet 5.6ml',
        slug: 'lakme-absolute-matte-melt-lipstick-red-carpet',
        sku: 'LK-AMM-REDCARPET',
        modelNumber: 'AMM-RC',
        gtin: '890103000011',
        color: 'Red Carpet',
        listings: [
          listing('amazon', 425, 700, { trend: 'volatile' }),
          listing('flipkart', 399, 700, { trend: 'recent-drop' }),
          listing('meesho', 379, 700, { deliveryFee: 35, deliveryText: 'Delivery in 4 days', deliveryDays: 4, trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Vitamin C Face Serum 30ml',
    slug: 'mamaearth-vitamin-c-face-serum',
    brand: 'Mamaearth',
    category: 'beauty',
    description: 'Mamaearth Vitamin C face serum with turmeric for skin brightening and even tone.',
    imageUrl: IMG.serum,
    rating: 4.1,
    reviewCount: 21400,
    variants: [
      {
        title: '30ml',
        slug: 'mamaearth-vitamin-c-face-serum-30ml',
        sku: 'MAM-VC-30',
        modelNumber: 'VC30',
        gtin: '890608700011',
        size: '30ml',
        listings: [
          listing('amazon', 499, 699, { trend: 'stable' }),
          listing('flipkart', 479, 699, { trend: 'dropping' }),
          listing('meesho', 459, 699, { deliveryFee: 39, deliveryText: 'Delivery in 4 days', deliveryDays: 4, trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Sunscreen SPF 50 PA+++ 50g',
    slug: 'dot-key-sunscreen-spf-50',
    brand: 'Dot & Key',
    category: 'beauty',
    description: 'Dot & Key Watermelon Sunscreen SPF 50 PA+++ with no white cast and a light gel texture.',
    imageUrl: IMG.sunscreen,
    rating: 4.3,
    reviewCount: 15800,
    variants: [
      {
        title: '50g',
        slug: 'dot-key-sunscreen-spf-50-50g',
        sku: 'DK-SUN-50',
        modelNumber: 'SUN50',
        gtin: '890608800011',
        size: '50g',
        listings: [
          listing('amazon', 449, 599, { trend: 'volatile' }),
          listing('flipkart', 429, 599, { trend: 'stable' }),
        ],
      },
    ],
  },

  // ------------------------------------------------------------ HOME & KITCHEN
  {
    title: 'Iris 3 Burner Glass Top Gas Stove',
    slug: 'prestige-iris-3-burner-gas-stove',
    brand: 'Prestige',
    category: 'home-kitchen',
    description: 'Prestige Iris 3-burner glass top gas stove with brass burners and toughened glass.',
    imageUrl: IMG.stove,
    rating: 4.2,
    reviewCount: 7810,
    variants: [
      {
        title: 'Black Glass 3 Burner',
        slug: 'prestige-iris-3-burner-gas-stove-black',
        sku: 'PST-IRIS-3B',
        modelNumber: 'IRIS-3B',
        gtin: '890431200011',
        color: 'Black',
        listings: [
          listing('amazon', 4299, 6495, { trend: 'dropping' }),
          listing('flipkart', 4149, 6495, { trend: 'stable' }),
          listing('croma', 4499, 6495, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Air Fryer HD9252 4.1L',
    slug: 'philips-air-fryer-hd9252',
    brand: 'Philips',
    category: 'home-kitchen',
    description: 'Philips Air Fryer HD9252 with Rapid Air technology, 4.1L capacity and digital display.',
    imageUrl: IMG.airfryer,
    rating: 4.4,
    reviewCount: 4410,
    variants: [
      {
        title: '4.1L Black',
        slug: 'philips-air-fryer-hd9252-4-1l-black',
        sku: 'HD9252/90',
        modelNumber: 'HD9252',
        gtin: '8710103900011',
        color: 'Black',
        specifications: { Capacity: '4.1 L', Power: '1400 W', Warranty: '2 years' },
        listings: [
          listing('amazon', 8499, 11995, { trend: 'dropping' }),
          listing('croma', 8199, 11995, { trend: 'recent-drop' }),
          listing('reliance-digital', 8799, 11995, { trend: 'stable' }),
          listing('flipkart', 8399, 11995, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Thermosteel Flip Lid Flask 1L',
    slug: 'milton-thermosteel-flip-lid-flask-1l',
    brand: 'Milton',
    category: 'home-kitchen',
    description: 'Milton Thermosteel Flip Lid vacuum flask — keeps drinks hot or cold for 24 hours.',
    imageUrl: IMG.flask,
    rating: 4.5,
    reviewCount: 33200,
    variants: [
      {
        title: '1 Litre Steel',
        slug: 'milton-thermosteel-flip-lid-flask-1-litre',
        sku: 'MLT-1000',
        modelNumber: 'Thermosteel 1000',
        gtin: '890206100011',
        color: 'Silver',
        listings: [
          listing('amazon', 899, 1225, { trend: 'stable' }),
          listing('flipkart', 849, 1225, { trend: 'volatile' }),
          listing('meesho', 829, 1225, { deliveryFee: 45, deliveryText: 'Delivery in 4 days', deliveryDays: 4, trend: 'stable' }),
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ GROCERY
  {
    title: 'Sampann Unpolished Toor Dal 1kg',
    slug: 'tata-sampann-toor-dal-1kg',
    brand: 'Tata Sampann',
    category: 'grocery',
    description: 'Tata Sampann unpolished toor dal (arhar) — high protein, no artificial colour.',
    imageUrl: IMG.dal,
    rating: 4.4,
    reviewCount: 12800,
    variants: [
      {
        title: '1kg Pouch',
        slug: 'tata-sampann-toor-dal-1kg-pouch',
        sku: 'TS-TOOR-1KG',
        modelNumber: 'TOOR1',
        gtin: '890172500011',
        size: '1kg',
        listings: [
          listing('amazon', 175, 210, { trend: 'stable' }),
          listing('flipkart', 169, 210, { trend: 'volatile' }),
          listing('meesho', 165, 210, { deliveryFee: 40, deliveryText: 'Delivery in 3 days', deliveryDays: 3, trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'Pasteurised Butter 500g',
    slug: 'amul-butter-500g',
    brand: 'Amul',
    category: 'grocery',
    description: 'Amul pasteurised butter — utterly butterly delicious, 500g carton.',
    imageUrl: IMG.butter,
    rating: 4.7,
    reviewCount: 28400,
    variants: [
      {
        title: '500g Carton',
        slug: 'amul-butter-500g-carton',
        sku: 'AMUL-BTR-500',
        modelNumber: 'BTR500',
        gtin: '890103090011',
        size: '500g',
        listings: [
          listing('amazon', 285, 300, { trend: 'stable' }),
          listing('flipkart', 279, 300, { trend: 'stable' }),
        ],
      },
    ],
  },

  // ------------------------------------------------------------------- SPORTS
  {
    title: 'Mavis 350 Nylon Shuttlecock',
    slug: 'yonex-mavis-350-shuttlecock',
    brand: 'Yonex',
    category: 'sports',
    description: 'Yonex Mavis 350 nylon shuttlecock — medium speed, pack of 6, ideal for practice.',
    imageUrl: IMG.shuttle,
    rating: 4.5,
    reviewCount: 19200,
    variants: [
      {
        title: 'Pack of 6 Yellow',
        slug: 'yonex-mavis-350-shuttlecock-pack-of-6',
        sku: 'YX-MAVIS350-6',
        modelNumber: 'Mavis 350',
        gtin: '4548736200011',
        color: 'Yellow',
        listings: [
          listing('amazon', 749, 990, { trend: 'stable' }),
          listing('flipkart', 719, 990, { trend: 'volatile' }),
          listing('meesho', 699, 990, { deliveryFee: 49, deliveryText: 'Delivery in 5 days', deliveryDays: 5, trend: 'recent-drop' }),
        ],
      },
    ],
  },
  {
    title: 'Storm Football Size 5',
    slug: 'nivia-storm-football',
    brand: 'Nivia',
    category: 'sports',
    description: 'Nivia Storm football, size 5, 32-panel hand-stitched rubberised construction.',
    imageUrl: IMG.football,
    rating: 4.2,
    reviewCount: 5410,
    variants: [
      {
        title: 'Size 5',
        slug: 'nivia-storm-football-size-5',
        sku: 'NIV-STORM-5',
        modelNumber: 'Storm 5',
        gtin: '890420000011',
        size: '5',
        listings: [
          listing('amazon', 599, 899, { trend: 'stable' }),
          listing('flipkart', 579, 899, { trend: 'dropping' }),
          listing('meesho', 549, 899, { deliveryFee: 55, deliveryText: 'Delivery in 5 days', deliveryDays: 5, trend: 'stable' }),
        ],
      },
    ],
  },

  // ------------------------------------------------------------- ACCESSORIES
  {
    title: 'Watch Series 10 GPS 42mm',
    slug: 'apple-watch-series-10',
    brand: 'Apple',
    category: 'accessories',
    description: 'Apple Watch Series 10 with a bigger display, sleep apnoea notifications and fast charging.',
    imageUrl: IMG.applewatch,
    rating: 4.6,
    reviewCount: 2110,
    variants: [
      {
        title: '42mm GPS Jet Black',
        slug: 'apple-watch-series-10-42mm-gps-jet-black',
        sku: 'MXE93HN/A',
        modelNumber: 'A2997',
        gtin: '195949700011',
        color: 'Jet Black',
        specifications: { Case: '42mm aluminium', Connectivity: 'GPS', Display: 'Always-On Retina' },
        listings: [
          listing('amazon', 41900, 45900, { trend: 'dropping' }),
          listing('croma', 40990, 45900, { trend: 'recent-drop' }),
          listing('reliance-digital', 42499, 45900, { trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: '25W Super Fast Charger',
    slug: 'samsung-25w-super-fast-charger',
    brand: 'Samsung',
    category: 'accessories',
    description: 'Samsung 25W Super Fast Charging wall charger with USB-C cable included.',
    imageUrl: IMG.charger,
    rating: 4.4,
    reviewCount: 15300,
    variants: [
      {
        title: 'Black with cable',
        slug: 'samsung-25w-super-fast-charger-black',
        sku: 'EP-T2510NBEGIN',
        modelNumber: 'EP-T2510',
        gtin: '8806092000011',
        color: 'Black',
        listings: [
          listing('amazon', 1199, 1799, { trend: 'volatile' }),
          listing('flipkart', 1149, 1799, { trend: 'stable' }),
          listing('croma', 1299, 1799, { trend: 'stable' }),
          listing('meesho', 1099, 1799, { deliveryFee: 40, deliveryText: 'Delivery in 4 days', deliveryDays: 4, trend: 'stable' }),
        ],
      },
    ],
  },
  {
    title: 'PowerCore 20000mAh Power Bank',
    slug: 'anker-powercore-20000',
    brand: 'Anker',
    category: 'accessories',
    description: 'Anker PowerCore 20000mAh power bank with 22.5W fast charging and dual USB output.',
    imageUrl: IMG.powerbank,
    rating: 4.5,
    reviewCount: 8210,
    variants: [
      {
        title: '20000mAh Black',
        slug: 'anker-powercore-20000mah-black',
        sku: 'A1257',
        modelNumber: 'A1257',
        gtin: '848061000011',
        color: 'Black',
        listings: [
          listing('amazon', 2499, 3999, { trend: 'dropping' }),
          listing('flipkart', 2399, 3999, { trend: 'recent-drop' }),
        ],
      },
    ],
  },
]

/**
 * A deliberately ambiguous retailer listing used to exercise the review queue.
 * Its title is vague enough that identity resolution cannot confidently merge
 * it, so it is stored with `resolutionStatus = 'PENDING'` and appears in the
 * admin "needs review" list.
 */
export const AMBIGUOUS_LISTINGS: Array<{
  retailer: string
  retailerProductId: string
  rawTitle: string
  price: number
  mrp: number
  matchAgainst: string
}> = [
  {
    retailer: 'meesho',
    retailerProductId: 'meesho-vague-001',
    rawTitle: 'Premium Mobile Phone Cover Case Combo Latest Design',
    price: 399,
    mrp: 1299,
    matchAgainst: 'apple-iphone-16-128gb-black',
  },
]
