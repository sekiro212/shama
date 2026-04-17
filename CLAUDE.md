# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint
npm run preview      # Preview production build locally

npm run test:e2e           # Run Playwright tests
npm run test:e2e:report    # Open Playwright HTML report
npx playwright test tests/home.spec.ts          # Run a single test file
npx playwright test -g "cart button opens"      # Run tests matching a title

npm run remotion:studio    # Remotion video editor UI
npm run remotion:render    # Render English marketing video
npm run remotion:render:ar # Render Arabic marketing video

# Telegram bot (separate Node.js process, run from telegram-bot/)
cd telegram-bot && npm run dev   # or npm start
```

## Environment Variables

The frontend (`/`) needs a `.env` file:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_OPENROUTER_API_KEY=
```

The Telegram bot (`telegram-bot/.env`) needs:
```
TELEGRAM_BOT_TOKEN=
ADMIN_CHAT_IDS=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
GROQ_API_KEY=
```

## Architecture Overview

**Stack:** React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui (Radix), Supabase (Postgres + Auth + Storage), OpenRouter AI (`openai/gpt-5.2`), Remotion (video), Playwright (E2E).

**Deployment:** Production is **shama.ly** on Libyan Spider cPanel (static `dist/` upload). `netlify.toml` is retained for preview/mirror deploys — SPA with `/*` → `index.html` redirect. Any new backend work must account for cPanel static hosting (no serverless functions there) — put dynamic logic in Supabase Edge Functions instead.

### Provider hierarchy (App.tsx)
```
AuthProvider → ThemeProvider → LanguageProvider → CartProvider → WishlistProvider → Router
```
All pages are wrapped in page-transition `<motion.div>` via `AnimatedRoutes`.

### Two separate auth systems
1. **User auth** — Supabase Auth (email/password + OTP + Google OAuth). Access via `useAuth()` from `src/contexts/AuthContext.tsx`. Returns `{ user, loading }`.
2. **Admin auth** — Custom plain-text password check against a `users` table in Supabase, session stored in localStorage. State is exposed through `src/contexts/AdminAuthContext.tsx`; the underlying check lives in `isAdminAuthenticated()` / `getCurrentAdmin()` in `src/services/authService.ts`. The `/admin` route is **not** protected by a `ProtectedRoute` — the admin shell renders a `LoginDialog` when unauthenticated.

### Admin app layout (`src/pages/admin/`)
The admin panel is a **self-contained mini-app** with its own router and providers, mounted at `/admin/*` by the main `App.tsx`. Do **not** edit a monolithic `AdminPage.tsx` — work inside the modular tree:

| Path | Role |
|------|------|
| `AdminApp.tsx` | Entry: wraps its own `BrowserRouter` + `ThemeProvider` + `LanguageProvider` + `AdminAuthProvider` |
| `AdminLayout.tsx` | Shell with sidebar/topbar; renders `<Outlet />` |
| `pages/{Overview,Orders,Perfumes,Reviews,GiftOrders,Memories,Coupons}Page.tsx` | Route targets — thin wrappers that compose a tab + its hook |
| `tabs/*Tab.tsx` | Presentational table/grid per resource |
| `hooks/use*.ts` | Data + mutation hooks (`useOrders`, `usePerfumes`, `useReviews`, `useCoupons`, `useGiftOrders`, `useMemories`, `useOverviewData`, `useAdminBadges`, `useConfirmDialog`, `usePerfumeImages`, `perfumeSubmit.ts`) |
| `dialogs/` | Modals — `LoginDialog`, `PerfumeFormDialog` (+ nested `perfumeForm/` subcomponents), `CouponFormDialog`, `OrderDetailsDialog`, `ConfirmDialog`, `ImageModal` |
| `components/` | Shared admin UI — `AdminSidebar`, `AdminTopBar`, `DataTable`, `StatCard`, `StatusBadge`, `TableSkeleton`, `EmptyState` |
| `constants.ts` / `types.ts` | Shared admin types and config |

When adding a resource: create a `use<Resource>` hook, a `<Resource>Tab` for rendering, a `<Resource>Page` route target, and register it in `AdminApp.tsx` + `AdminSidebar.tsx`.

### Service layer (`src/services/`)
All Supabase queries live here — never query Supabase directly from components.

| File | Responsibility |
|------|---------------|
| `productsService.ts` | Perfumes CRUD, pagination, search, filter. `transformDatabaseProduct()` maps snake_case DB → camelCase app types |
| `reviewsService.ts` | Reviews CRUD — `fetchApprovedReviews`, `fetchUserReview`, `submitReview`, `fetchAllReviews`, `approveReview`, `deleteReview`, `fetchPendingReviewCount` |
| `ordersService.ts` | Orders fetch, status updates, stats |
| `aiService.ts` | All OpenRouter AI calls: chatbot, product descriptions, quiz recommendations, AI search, **`evaluateReview()`** |
| `imageService.ts` | Supabase Storage upload/delete for `perfume-images` bucket |
| `authService.ts` | Admin-only username/password auth against `public.users` table |
| `vanexService.ts` | Vanex delivery API integration |
| `recommendationService.ts` | Product recommendation logic |

### Database tables (Supabase)
- `perfumes` — main product table; `rating` auto-updated by trigger when reviews change
- `perfume_images` — multiple images per perfume (`is_primary`, `display_order`)
- `perfume_samples` — sample size variants (3ml–30ml)
- `perfume_bottle_sizes` — bottle size variants (30ml–200ml)
- `orders` — customer orders with JSONB `items`; status: `pending→accepted→returned`
- `reviews` — user reviews with AI moderation; `status`: `pending` (default) or `approved`; unique `(perfume_id, user_id)`; RLS enabled
- `users` — admin accounts (plain-text passwords)
- `promo_codes` — discount codes

Migrations are tracked in `supabase_schema.sql`. Run new migrations via the Supabase MCP (`mcp__supabase__apply_migration`) or the Supabase SQL Editor.

### AI integration
`aiService.ts` routes through **OpenRouter** (`https://openrouter.ai/api/v1/chat/completions`) via `callOpenRouter()` / `callOpenRouterStream()` helpers built on native `fetch()`. Three distinct models are used — pick the right constant instead of hardcoding a model id:

| Constant | Model | Used for |
|----------|-------|----------|
| `OPENROUTER_MODEL` | `openai/gpt-5.2` | Chatbot, quiz recs, product descriptions, AI search |
| `OPENROUTER_MODERATION_MODEL` | `anthropic/claude-sonnet-4-6` | Review moderation (`evaluateReview`) |
| inline in image call | `google/gemini-3.1-flash-image-preview` | On-demand product image generation |

Key functions:
- `chatWithAI` / `chatWithAIStream` — streaming chatbot with the full product catalog injected as system context (5-minute cache via `buildProductContext()`)
- `evaluateReview(rating, comment, productName)` — returns `"approved"` | `"pending"`; defaults to `"pending"` on any failure
- `generateProductDescription` — used in the admin Perfumes form for one-click copy generation
- `getQuizRecommendations` — returns top-3 products matching quiz answers as JSON

### Supabase Edge Functions (`supabase/functions/`)
Dynamic/backend logic lives in Deno edge functions, not in the frontend. Deploy with `mcp__supabase__deploy_edge_function` or the Supabase CLI.

| Function | Purpose |
|----------|---------|
| `analyze-user-profile` | Builds fragrance profile from user activity |
| `match-new-products` | Matches new perfumes to existing user profiles |
| `nightly-orchestrator` | Scheduled aggregator that chains the analyze + match functions |
| `send-email` | Transactional/campaign email sender |
| `unsubscribe` | Public endpoint for one-click email unsubscribes |
| `_shared/` | Shared helpers imported by the other functions |

### Remotion (`src/remotion/`)
Standalone video renderer. Entry: `src/remotion/index.ts`. Two compositions: `ShamaVideo-EN` and `ShamaVideo-AR`. Runs independently from the main app.

### Telegram Bot (`telegram-bot/`)
Standalone Node.js TypeScript project with its own `package.json`. Uses Telegraf. Connects to the same Supabase project via service-role key (bypasses RLS). Admin IDs are configured via `ADMIN_CHAT_IDS` env var (admin ID: 586087143).

---

## Bilingual Requirement (Arabic + English)

This website supports **two languages**: English (default) and Arabic (RTL).

When creating a new feature or updating any user-facing text:

1. **Add translation keys** to both `src/locales/en.json` and `src/locales/ar.json`
2. **Use `t("key")` calls** from `useLanguage()` instead of hardcoded strings — never hardcode English text in components
3. **RTL support** — add `rtl:space-x-reverse` to `space-x-*` classes, use `ms-*`/`me-*` instead of `ml-*`/`mr-*`, and use `side={isRTL ? "left" : "right"}` for Sheet components
4. **Directional icons** — add `className={isRTL ? "rotate-180" : ""}` to chevrons/arrows
5. **Fixed positioning** — use `${isRTL ? "left-4" : "right-4"}` for RTL-aware placement

```tsx
import { useLanguage } from "@/contexts/LanguageContext";

const { t, isRTL } = useLanguage();
// t("section.key") — returns translated string
// isRTL — true when Arabic is active
```

Translation key sections: `nav`, `header`, `home`, `product`, `cart`, `collection`, `quiz`, `tracking`, `samples`, `wishlist`, `giftSets`, `chatbot`, `search`, `timeline`, `footer`, `admin`, `reviews`, `auth`, `common`.

## UI Conventions

- **Glass card pattern:** `className="glass-card p-6 rounded-2xl"` — used throughout for content cards
- **Brand colors:** primary `#5B8DD9`, darker `#3E6BB5`; gradient: `bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5]`
- **Background:** light `#F8F9FB`, dark `#1a2235`; text: light `#323D50`, dark `#F5F5F5`; muted: `#6B7B8D`
- **Toast notifications:** `import { toast } from "sonner"` — use `toast.success()` / `toast.error()`
- **Loading buttons:** use `<LoadingButton>` from `@/components/ui/loading-button` (not plain `<Button disabled>`) for async actions in the admin app
- **Memoized sub-components:** heavy page sections (e.g. `DetailsTab`, `NotesTab`, `ReviewSection` in ProductPage) use `React.memo` to avoid re-renders
