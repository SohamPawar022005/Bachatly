# Bachatly — Compare. Save. Buy Smart.

A production-shaped, full-stack **price comparison platform** for the Indian market. The same product is priced
differently at Amazon, Flipkart, Croma, Reliance Digital, Myntra and Meesho. Bachatly matches retailer listings to one
canonical product, derives the honest cheapest price from stored records, keeps an append-only price history, and alerts
you the moment a price drops below your target.

> **Nothing on the storefront is hardcoded.** Cheapest retailer, savings, discount, price verdict, deal ranking,
> homepage counters and admin statistics are all computed from PostgreSQL at request time.

---

## 1. Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router, Route Handlers — no Express), React 19, TypeScript strict |
| Styling | Tailwind CSS 4, shadcn/ui-style primitives on Radix UI, Lucide icons, Recharts |
| Database | PostgreSQL + Prisma schema, `pg` driver, PostgreSQL full-text search + `pg_trgm` (no Elasticsearch) |
| Auth | Auth.js (Next Auth v5), JWT sessions, bcrypt-hashed passwords |
| Forms & data | Zod + React Hook Form, TanStack Query |
| Jobs | BullMQ + Redis/Upstash when configured, in-process scheduler fallback otherwise |
| Email / images | Resend (transactional email), Cloudinary (image delivery) — both optional |
| Observability | Sentry (optional), PostHog (optional) |
| Testing | Vitest (unit) + Playwright (end-to-end) |
| Deploy targets | Vercel, Neon (Postgres), Upstash (Redis) |

---

## 2. Canonical data model

Retailer data is never compared directly. Every listing must first resolve to a canonical product variant:

```
Retailer Listing  ──▶  Identity Resolution  ──▶  Bachatly Product  ──▶  Product Variant  ──▶  Price
 (raw feed row)        (score + decision)        (title, brand,          (128GB Black,       (append-only
                                                  category, media)        8GB/256GB, size)    price records)
```

- `product_listings` keeps the raw retailer title, retailer product id, URL, availability and the **resolution
  decision** (`RESOLVED` / `PENDING` / `UNMATCHED`) plus the match confidence score.
- `prices` is append-only: a new row per check, never an `UPDATE`. Historical prices are immutable.
- `product_variants` and `products` hold denormalised rollups (`lowestPrice`, `highestPrice`,
  `bestDiscountPercent`, `cheapestRetailerId`, `updatedAtPriceAt`) refreshed after every price write, so listing
  queries stay a single round-trip.

### Identity resolution scoring

Implemented in `lib/matching/`, thresholds in `MATCH_THRESHOLDS`:

| Signal | Points |
| --- | --- |
| GTIN / barcode match | **+100** (conclusive) |
| Model number match | +40 |
| Core model phrase (fraction scaled) | +35 |
| Brand match | +30 |
| Storage / capacity match | +15 |
| Colour match (normalised, American spelling) | +10 |
| Title similarity (scaled) | +20 |
| Size match | +5 |
| Accessory-vs-device conflict | **−40** |

Decision ladder: accessory conflict → `REJECT`; score ≥ 70 with no conflicts → `AUTO_MERGE`; conclusive GTIN without a
brand signal → `AUTO_MERGE`; score ≥ 45 without storage/GTIN conflict → `REVIEW` (surfaced in the admin review queue);
otherwise `REJECT`.

---

## 3. Pricing rules

- **Money is stored in integer paise.** Rupees only ever appear at the API/UI boundary (`parsePriceInput`,
  `formatPrice`).
- `effectivePrice = price + deliveryFee − coupon`, and the delivery fee is only added when the retailer **publishes**
  it. Retailer discounts are reported, never double-subtracted. The result is clamped at 0.
- **Comparable set** for a cheapest-price calculation: `resolutionStatus = 'RESOLVED'` **and** in stock
  (`IN_STOCK` / `LOW_STOCK`) **and** `effectivePrice > 0`. Everything else is listed separately with a reason
  ("Price pending verification", "Currently unavailable") instead of being silently ignored.
- Tie-break: effective price → list price → free delivery → retailer name.
- Price history excludes unresolved listings, so a mis-resolved listing cannot poison a product's range.
- Price verdict (`GREAT` / `GOOD` / `AVERAGE` / `HIGH`) is derived from the stored range: bottom 15% of range and below
  average → GREAT; ≥ 8% below average in the lower 40% → GREAT; top 15% and above average → HIGH; and so on. Confidence
  is `high` at ≥ 12 samples, `medium` at ≥ 3, otherwise `low`.

---

## 4. Pages

| Route | What it does |
| --- | --- |
| `/` | Hero search, live catalogue counters, categories, best deals, biggest drops, popular products |
| `/search` | Full-text + trigram search with category/brand/retailer/price/rating/delivery filters, sorting, pagination |
| `/products/[slug]` | Variant picker, retailer comparison, price history chart + verdict, specifications, related products, SEO metadata + canonical + JSON-LD |
| `/deals` | Best deals, biggest drops, and under-₹1,000 / ₹5,000 / ₹10,000 lists |
| `/categories`, `/categories/[slug]` | Category browse; parent categories include their subcategories' products |
| `/favorites` | Saved products with their current cheapest price |
| `/alerts` | Target prices, current prices, distance to target, trigger state |
| `/account` | Dashboard: counters, recent searches, notifications, favourites, alerts |
| `/admin` | Admin console (ADMIN role only) |
| `/login`, `/register` | Auth.js credentials auth |

## 5. REST API

Every response uses one envelope: `{ "success": true, "data": … }` or
`{ "success": false, "error": { "code", "message", "details?" } }`. Status codes are correct (201 on create, 400
validation, 401 unauthenticated, 403 forbidden, 404 not found, 429 rate limited, 500 internal — never a stack trace).

| Group | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `/api/auth/[...nextauth]` |
| Catalogue | `GET /api/search`, `GET /api/products`, `GET /api/products/:slugOrId`, `GET /api/products/:id/prices`, `GET /api/products/:id/history` |
| Taxonomy | `GET /api/categories`, `GET /api/categories/:slug`, `GET /api/retailers`, `GET /api/deals` |
| User | `GET/POST /api/favorites`, `DELETE /api/favorites/:id`, `GET/POST /api/alerts`, `DELETE /api/alerts/:id`, `GET/PATCH /api/notifications`, `PATCH /api/notifications/:id/read`, `GET/DELETE /api/user/search-history`, `GET /api/account/overview` |
| Admin | `GET /api/admin/stats`, `GET /api/admin/health`, `GET/POST /api/admin/products`, `PATCH/DELETE /api/admin/products/:id`, `GET/POST /api/admin/retailers`, `PATCH /api/admin/retailers/:id`, `GET/POST /api/admin/listings`, `GET /api/admin/prices`, `POST /api/admin/prices/update`, `GET/POST /api/admin/categories`, `GET /api/admin/users`, `PATCH /api/admin/users/:id`, `GET /api/admin/matches`, `POST /api/admin/matches/:id/resolve` |

Guards run in `lib/api/route.ts` (`withApi`): rate limiting (240 req/min reads, 30 req/min mutations per
`method:path:clientIp`), auth (`public` / `user` / `admin`), Zod validation, and a single error envelope. Password
hashes never leave the repository layer.

---

## 6. Background jobs

- `jobs/price-update.ts` — picks the least-recently-checked listings, calls the retailer adapter, **appends** a price
  row, updates availability, refreshes variant + product rollups, then evaluates price alerts. Records a run in
  `price_update_runs`.
- `jobs/alert-check.ts` — evaluates active alerts and creates notifications.
- `jobs/notification.ts` — unread-alert email digest via Resend (no-op when `RESEND_API_KEY` is absent).
- `jobs/queue.ts` / `jobs/worker.ts` — BullMQ when `REDIS_URL` is set, otherwise the identical job functions run on a
  local interval (`WORKER_INTERVAL_MINUTES`, default 30).

```bash
pnpm jobs:price-update 30 drop   # 30 listings, simulated 10% drop
pnpm jobs:alert-check
pnpm jobs:worker
```

The same job is exposed to the admin console (`POST /api/admin/prices/update` with `mode: "job"`), which is how a
simulated drop is demonstrated end-to-end.

---

## 7. Retailer adapters

`retailers/retailer-adapter.ts` defines the contract (`searchProducts`, `getProduct`, `getPrice`, `getAvailability`,
`source`, `isLive`). Six adapters ship — Amazon, Flipkart, Myntra, Croma, Reliance Digital, Meesho — each with its own
feed quirks (jitter, delivery-fee policy, availability reporting).

**All six are `source: 'DEMO'`, `isLive: false`.** They read the seeded catalogue, not the internet. There is no
scraping and no CAPTCHA handling anywhere in this codebase. To go live, implement the same interface against an
authorised retailer/affiliate API and flip `isLive` — nothing else changes.

The UI states this too: every product page carries a "Demo feed data" badge and every price shows when it was last
checked (`lastCheckedAt`), so demonstration data is never presented as a live quote.

---

## 8. Local setup

```bash
pnpm install
cp .env.example .env          # then set DATABASE_URL / AUTH_SECRET
pnpm db:up                    # starts a local PostgreSQL cluster (see note below)
pnpm db:bootstrap             # applies prisma/migrations/0001_init/migration.sql
pnpm db:seed                  # 43 products / 49 variants / 156 listings / ~14k price records
pnpm dev                      # http://localhost:3000
```

Seeded accounts:

| Role | Email | Password |
| --- | --- | --- |
| Shopper | `demo@bachatly.app` | `Demo@12345` |
| Admin | `admin@bachatly.app` | `Admin@12345` |

### Environment

Copy `.env.example`. Everything except `DATABASE_URL` and `AUTH_SECRET` is optional and degrades gracefully:

| Variable | Without it |
| --- | --- |
| `REDIS_URL` | Jobs run on an in-process interval instead of BullMQ |
| `RESEND_API_KEY` | Notifications are stored in the database, no email is sent |
| `CLOUDINARY_URL` | Remote product imagery is used as-is |
| `SENTRY_DSN` | No error reporting is initialised |
| `POSTHOG_KEY` | No analytics events are emitted |

`lib/env.ts` exposes `optionalServiceStatus()`, which the admin console shows so a missing integration is visible rather
than silently assumed.

---

## 9. Scripts

```bash
pnpm dev            # next dev
pnpm build          # prisma generate (best effort) + next build
pnpm start          # next start
pnpm lint           # eslint, zero warnings tolerated
pnpm typecheck      # tsc --noEmit
pnpm test           # vitest unit tests
pnpm test:e2e       # playwright (needs a seeded database + browser binaries)
pnpm db:up|db:down|db:bootstrap|db:migrate|db:deploy|db:seed|db:studio
pnpm jobs:worker|jobs:price-update|jobs:alert-check
```

---

## 10. Testing

- **Unit (Vitest)** — pricing (effective price, comparison rules, verdict classification), matching (GTIN, model,
  brand, storage, colour, accessory conflicts, thresholds), title normalisation, and SQL fragment building.
  `pnpm test`.
- **End-to-end (Playwright)** — `tests/e2e/`: storefront rendering, search relevance and typo tolerance, product page
  comparison + JSON-LD + external Buy Now link attributes, category roll-ups, auth failures, registration, protected
  route redirects, favourites/alerts/dashboard, admin role enforcement, and an admin-triggered price-update run.
  Run with `pnpm db:seed && pnpm test:e2e`.

---

## 11. Security & honesty guarantees

- Passwords are bcrypt-hashed (`lib/auth/password.ts`); hash comparison runs even for unknown emails so timing does not
  reveal whether an account exists.
- Sessions are httpOnly cookies issued by Auth.js. Route protection happens twice: in `middleware.ts` (edge, role-aware
  for `/admin`) and again in every API route via `withApi`.
- Every SQL statement is parameterised; user input is never interpolated into SQL text.
- Rate limiting on every API route; errors are logged server-side and returned as a generic 500.
- Security headers are applied globally (CSP-friendly: nosniff, frame options, referrer policy, HSTS, permissions
  policy).
- "Buy Now" opens the retailer's own site in a new tab with `rel="nofollow noopener noreferrer"`. **Bachatly processes
  no payments** and never renders a deceptive redirect.
- Demonstration data is labelled in the database (`source = 'DEMO'`), in the API (`isDemoData`) and in the UI.

---

## 12. Known environment limitation: Prisma engine binaries

`prisma/schema.prisma` is the canonical schema and `prisma/migrations/0001_init/migration.sql` is the real DDL.
However, in this sandbox **Prisma's engine binaries cannot be downloaded** (`binaries.prisma.sh` is unreachable, and
they are not bundled in the npm tarball), so `prisma generate` / `prisma migrate` cannot run here.

To keep the architecture normal-Prisma-compatible without blocking development:

- `prisma/schema.prisma` is complete and is the source of truth for the model.
- The migration is applied with `pnpm db:bootstrap`, which runs the committed SQL through the `pg` driver.
- `lib/db/client.ts` builds a Prisma `PrismaClient` with `@prisma/adapter-pg` **when the generated client is
  available**, and otherwise falls back to the same `pg` connection pool with an identical
  `query` / `queryOne` / `transaction` interface. Repository code is driver-agnostic, so
  `pnpm prisma generate && pnpm prisma migrate deploy` switches the whole app to Prisma with no repository changes.
- `pnpm build` runs `prisma generate --no-hints || true` so a blocked download never fails the build.
- Locally, `pnpm db:up` boots a real PostgreSQL 18 cluster from `@embedded-postgres/linux-x64` (installed from npm,
  since apt mirrors are unreachable here) in `.pgdata/` on port 5433. That directory and `pg.log` are gitignored.

---

## 13. Project layout

```
app/                    Route Handlers (api/**) and pages
components/             ui primitives, navigation, products, comparison, alerts, favorites, account, admin, search
jobs/                   price-update, alert-check, notification digest, queue, worker, CLIs
lib/
  api/                  withApi wrapper, error codes, response envelope, rate limiting
  auth/                 Auth.js config, password hashing, guards
  db/                   pool/client, query helpers, 12 repositories, shared row types
  matching/             identity resolution: attributes, normalisation, scoring, thresholds
  pricing/              effective price, comparison, classification
  search/               tsquery + trigram normalisation
  ui/                   API response types and row → card mappers
  utils/                money (paise), time, ids, db-url, cn
  validation/schemas.ts Zod schemas shared by API routes and forms
prisma/                 schema.prisma, migrations, seed orchestrator + seed data
retailers/              adapter contract + six labelled demo adapters
services/               pricing, search, product, category, deal, favorite, alert,
                        notification, matching, affiliate, admin, home
scripts/                local postgres lifecycle + migration bootstrap
tests/unit, tests/e2e   Vitest and Playwright suites
types/next-auth.d.ts    Auth.js session/JWT augmentation
```
