import type { ProductCardData } from '@/components/products/product-card'
import type { SearchItem } from '@/services/search-service'
import type { DealItem } from '@/services/deal-service'
import type { FavoriteItem } from '@/services/favorite-service'
import type { RelatedProduct } from '@/services/product-service'

/** One place that turns any of our list rows into a product card. */
export function searchItemToCard(item: SearchItem, isFavorite = false): ProductCardData {
  return {
    variantId: item.variantId,
    variantSlug: item.variantSlug,
    variantTitle: item.variantTitle,
    title: item.title,
    brand: item.brand,
    imageUrl: item.imageUrl,
    rating: item.rating,
    reviewCount: item.reviewCount,
    categoryName: item.categoryName,
    cheapestRetailerName: item.cheapestRetailerName,
    cheapestRetailerColor: item.cheapestRetailerColor,
    bestDiscountPercent: item.bestDiscountPercent,
    listingCount: item.listingCount,
    lowestPrice: item.comparison.lowestPrice,
    maximumSavings: item.comparison.maximumSavings,
    isFavorite,
  }
}

export function dealItemToCard(item: DealItem, isFavorite = false): ProductCardData {
  return {
    variantId: item.variantId,
    variantSlug: item.variantSlug,
    variantTitle: item.variantTitle,
    title: item.title,
    brand: item.brand,
    imageUrl: item.imageUrl,
    rating: item.rating,
    reviewCount: item.reviewCount,
    categoryName: item.categoryName,
    cheapestRetailerName: item.cheapestRetailerName,
    cheapestRetailerColor: item.cheapestRetailerColor,
    bestDiscountPercent: item.discountPercent,
    listingCount: item.listingCount,
    lowestPrice: item.lowestPrice,
    maximumSavings: item.savings,
    isFavorite,
  }
}

export function favoriteItemToCard(item: FavoriteItem): ProductCardData {
  return {
    variantId: item.variantId,
    variantSlug: item.variantSlug,
    variantTitle: item.variantTitle,
    title: item.title,
    brand: item.brand,
    imageUrl: item.imageUrl,
    rating: item.rating,
    cheapestRetailerName: item.comparison.cheapestRetailer,
    bestDiscountPercent: 0,
    listingCount: item.comparison.offerCount,
    lowestPrice: item.comparison.lowestPrice,
    maximumSavings: item.comparison.maximumSavings,
    isFavorite: true,
  }
}

export function relatedItemToCard(item: RelatedProduct): ProductCardData {
  return {
    variantId: item.variantId,
    variantSlug: item.variantSlug,
    variantTitle: item.title,
    title: item.title,
    brand: item.brand,
    imageUrl: item.imageUrl,
    rating: item.rating,
    lowestPrice: item.lowestPrice,
  }
}
