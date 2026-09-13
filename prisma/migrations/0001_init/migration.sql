-- ---------------------------------------------------------------------------
-- Bachatly initial schema
--
-- Hand-written to be byte-compatible with prisma/schema.prisma so that
-- `prisma migrate dev` / `prisma migrate deploy` apply it unchanged in a
-- standard environment. It additionally creates the search extensions and
-- indexes Prisma cannot express (tsvector generated columns + GIN/pg_trgm).
--
-- Money columns are INTEGER PAISE (1/100 rupee).
-- ---------------------------------------------------------------------------

-- Search extensions ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums ---------------------------------------------------------------------
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "Availability" AS ENUM ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'PREORDER', 'UNKNOWN');
CREATE TYPE "ListingSource" AS ENUM ('DEMO', 'LIVE_API', 'AFFILIATE_FEED', 'MANUAL');
CREATE TYPE "ResolutionStatus" AS ENUM ('RESOLVED', 'PENDING', 'UNMATCHED');
CREATE TYPE "IdentityMatchStatus" AS ENUM ('ACCEPTED', 'PENDING', 'REJECTED');
CREATE TYPE "NotificationType" AS ENUM ('PRICE_DROP', 'ALERT_TRIGGERED', 'DEAL', 'SYSTEM');
CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

-- Users ---------------------------------------------------------------------
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");

-- Categories ----------------------------------------------------------------
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE INDEX "categories_parentId_idx" ON "categories"("parentId");

-- Products ------------------------------------------------------------------
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "imageUrl" TEXT,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lowestPrice" INTEGER,
    "highestPrice" INTEGER,
    "cheapestRetailerId" TEXT,
    "updatedAtPriceAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchVector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("brand", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce("description", '')), 'C')
    ) STORED,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE INDEX "products_brand_idx" ON "products"("brand");
CREATE INDEX "products_categoryId_idx" ON "products"("categoryId");
CREATE INDEX "products_lowestPrice_idx" ON "products"("lowestPrice");
CREATE INDEX "products_title_idx" ON "products"("title");
CREATE INDEX "products_searchVector_idx" ON "products" USING GIN ("searchVector");
CREATE INDEX "products_title_trgm_idx" ON "products" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "products_brand_trgm_idx" ON "products" USING GIN ("brand" gin_trgm_ops);

-- Product variants ----------------------------------------------------------
CREATE TABLE "product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "modelNumber" TEXT,
    "gtin" TEXT,
    "color" TEXT,
    "size" TEXT,
    "storage" TEXT,
    "imageUrl" TEXT,
    "specifications" JSONB,
    "lowestPrice" INTEGER,
    "highestPrice" INTEGER,
    "cheapestListingId" TEXT,
    "cheapestRetailerId" TEXT,
    "listingCount" INTEGER NOT NULL DEFAULT 0,
    "bestDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "fastestDeliveryDays" INTEGER,
    "rollupsUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "searchVector" tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce("title", '')), 'A') ||
        setweight(to_tsvector('simple', coalesce("color", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce("storage", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce("size", '')), 'B') ||
        setweight(to_tsvector('simple', coalesce("sku", '')), 'C') ||
        setweight(to_tsvector('simple', coalesce("modelNumber", '')), 'C')
    ) STORED,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_variants_slug_key" ON "product_variants"("slug");
CREATE INDEX "product_variants_productId_idx" ON "product_variants"("productId");
CREATE INDEX "product_variants_sku_idx" ON "product_variants"("sku");
CREATE INDEX "product_variants_modelNumber_idx" ON "product_variants"("modelNumber");
CREATE INDEX "product_variants_gtin_idx" ON "product_variants"("gtin");
CREATE INDEX "product_variants_lowestPrice_idx" ON "product_variants"("lowestPrice");
CREATE INDEX "product_variants_bestDiscountPercent_idx" ON "product_variants"("bestDiscountPercent");
CREATE INDEX "product_variants_searchVector_idx" ON "product_variants" USING GIN ("searchVector");
CREATE INDEX "product_variants_title_trgm_idx" ON "product_variants" USING GIN ("title" gin_trgm_ops);

-- Retailers -----------------------------------------------------------------
CREATE TABLE "retailers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "websiteUrl" TEXT NOT NULL,
    "brandColor" TEXT NOT NULL DEFAULT '#111827',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "affiliateNetwork" TEXT,
    "affiliateId" TEXT,
    "affiliateUrlTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retailers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "retailers_slug_key" ON "retailers"("slug");
CREATE INDEX "retailers_isActive_idx" ON "retailers"("isActive");

-- Listings ------------------------------------------------------------------
CREATE TABLE "product_listings" (
    "id" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "rawTitle" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "productUrl" TEXT NOT NULL,
    "affiliateUrl" TEXT,
    "availability" "Availability" NOT NULL DEFAULT 'UNKNOWN',
    "deliveryText" TEXT,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "deliveryDays" INTEGER,
    "source" "ListingSource" NOT NULL DEFAULT 'DEMO',
    "lastCheckedAt" TIMESTAMP(3),
    "resolutionStatus" "ResolutionStatus" NOT NULL DEFAULT 'RESOLVED',
    "matchConfidence" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_listings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "product_listings_retailerId_retailerProductId_key" ON "product_listings"("retailerId", "retailerProductId");
CREATE INDEX "product_listings_productVariantId_idx" ON "product_listings"("productVariantId");
CREATE INDEX "product_listings_retailerId_idx" ON "product_listings"("retailerId");
CREATE INDEX "product_listings_resolutionStatus_idx" ON "product_listings"("resolutionStatus");
CREATE INDEX "product_listings_normalizedTitle_idx" ON "product_listings"("normalizedTitle");
CREATE INDEX "product_listings_normalizedTitle_trgm_idx" ON "product_listings" USING GIN ("normalizedTitle" gin_trgm_ops);

-- Prices (append-only history) ---------------------------------------------
CREATE TABLE "prices" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "mrp" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "effectivePrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prices_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "prices_listingId_checkedAt_idx" ON "prices"("listingId", "checkedAt" DESC);
CREATE INDEX "prices_checkedAt_idx" ON "prices"("checkedAt");
CREATE INDEX "prices_effectivePrice_idx" ON "prices"("effectivePrice");

-- Identity resolution audit trail ------------------------------------------
CREATE TABLE "identity_matches" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "productVariantId" TEXT,
    "rawTitle" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "status" "IdentityMatchStatus" NOT NULL DEFAULT 'ACCEPTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_matches_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "identity_matches_listingId_idx" ON "identity_matches"("listingId");
CREATE INDEX "identity_matches_productVariantId_idx" ON "identity_matches"("productVariantId");

-- Favorites -----------------------------------------------------------------
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "favorites_userId_productVariantId_key" ON "favorites"("userId", "productVariantId");
CREATE INDEX "favorites_userId_createdAt_idx" ON "favorites"("userId", "createdAt" DESC);

-- Price alerts --------------------------------------------------------------
CREATE TABLE "price_alerts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "targetPrice" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "triggeredAt" TIMESTAMP(3),
    "triggeredPrice" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "price_alerts_userId_productVariantId_key" ON "price_alerts"("userId", "productVariantId");
CREATE INDEX "price_alerts_userId_isActive_idx" ON "price_alerts"("userId", "isActive");
CREATE INDEX "price_alerts_productVariantId_isActive_idx" ON "price_alerts"("productVariantId", "isActive");

-- Search history ------------------------------------------------------------
CREATE TABLE "search_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "search_history_userId_createdAt_idx" ON "search_history"("userId", "createdAt" DESC);
CREATE INDEX "search_history_normalizedQuery_idx" ON "search_history"("normalizedQuery");

-- Notifications -------------------------------------------------------------
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "metadata" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- Job runs ------------------------------------------------------------------
CREATE TABLE "price_update_runs" (
    "id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'RUNNING',
    "triggeredBy" TEXT NOT NULL DEFAULT 'schedule',
    "listingsChecked" INTEGER NOT NULL DEFAULT 0,
    "priceRecordsCreated" INTEGER NOT NULL DEFAULT 0,
    "alertsTriggered" INTEGER NOT NULL DEFAULT 0,
    "notificationsSent" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "price_update_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "price_update_runs_startedAt_idx" ON "price_update_runs"("startedAt" DESC);

-- Foreign keys --------------------------------------------------------------
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_listings" ADD CONSTRAINT "product_listings_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_listings" ADD CONSTRAINT "product_listings_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "retailers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "prices" ADD CONSTRAINT "prices_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "product_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "search_history" ADD CONSTRAINT "search_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Popular searches rollup used by the homepage -----------------------------
CREATE INDEX "search_history_query_popularity_idx" ON "search_history"("normalizedQuery", "createdAt" DESC);
