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
VITE_GEMINI_API_KEY=
```

The Telegram bot (`telegram-bot/.env`) needs:
```
TELEGRAM_BOT_TOKEN=
ADMIN_CHAT_IDS=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
```

## Architecture Overview

**Stack:** React 18 + TypeScript + Vite, Tailwind CSS, shadcn/ui (Radix), Supabase (Postgres + Auth + Storage), Google Gemini (`@google/genai`), Remotion (video), Playwright (E2E).

**Deployment:** Netlify (`netlify.toml`) — SPA with `/*` → `index.html` redirect.

### Provider hierarchy (App.tsx)
```
AuthProvider → ThemeProvider → LanguageProvider → CartProvider → WishlistProvider → Router
```
All pages are wrapped in page-transition `<motion.div>` via `AnimatedRoutes`.

### Two separate auth systems
1. **User auth** — Supabase Auth (email/password + OTP + Google OAuth). Access via `useAuth()` from `src/contexts/AuthContext.tsx`. Returns `{ user, loading }`.
2. **Admin auth** — Custom plain-text password check against a `users` table in Supabase, session stored in localStorage. Access via `isAdminAuthenticated()` / `getCurrentAdmin()` from `src/services/authService.ts`. The `/admin` route is **not** protected by a `ProtectedRoute`; `AdminPage.tsx` handles its own login dialog.

### Service layer (`src/services/`)
All Supabase queries live here — never query Supabase directly from components.

| File | Responsibility |
|------|---------------|
| `productsService.ts` | Perfumes CRUD, pagination, search, filter. `transformDatabaseProduct()` maps snake_case DB → camelCase app types |
| `reviewsService.ts` | Reviews CRUD — `fetchApprovedReviews`, `fetchUserReview`, `submitReview`, `fetchAllReviews`, `approveReview`, `deleteReview`, `fetchPendingReviewCount` |
| `ordersService.ts` | Orders fetch, status updates, stats |
| `aiService.ts` | All Gemini calls: chatbot, product descriptions, quiz recommendations, AI search, **`evaluateReview()`** |
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
`aiService.ts` uses `@google/genai` with the `gemini-2.0-flash` model. Key functions:
- `chatWithAI` / `chatWithAIStream` — streaming chatbot with full product catalog injected as system context (5-minute cache via `buildProductContext()`)
- `evaluateReview(rating, comment, productName)` — returns `"approved"` | `"pending"`; defaults to `"pending"` on any failure
- `generateProductDescription` — used in AdminPage for one-click copy generation
- `getQuizRecommendations` — returns top-3 products matching quiz answers as JSON

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
- **Loading buttons:** use `<LoadingButton>` from `@/components/ui/loading-button` (not plain `<Button disabled>`) for async actions in AdminPage
- **Memoized sub-components:** heavy page sections (e.g. `DetailsTab`, `NotesTab`, `ReviewSection` in ProductPage) use `React.memo` to avoid re-renders
