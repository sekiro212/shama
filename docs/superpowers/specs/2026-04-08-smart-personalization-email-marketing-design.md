# Smart Fragrance Personalization & Email Marketing System

## Context

Shama has rich AI features (quiz, chatbot, smart search) but zero user behavior tracking — every interaction is lost after the session. This system captures all user behavior, builds AI-powered taste profiles, and sends personalized emails with unique discount codes when new fragrances match a user's preferences, on a digest schedule, or to re-engage inactive users.

## Decisions

- **AI Provider**: OpenAI GPT-5.4-mini (batch analysis); Gemini stays for real-time features
- **Email Service**: Resend (3,000 emails/month free)
- **Backend**: Supabase Edge Functions + pg_cron
- **User Identity**: Logged-in users only (Supabase Auth)
- **Email Triggers**: New product match, weekly/monthly digest, re-engagement (30+ days)

---

## Architecture: Pipeline Edge Functions

Five small, specialized Edge Functions chained by a nightly orchestrator:

```
pg_cron (10 PM Libya / 20:00 UTC)
  └── nightly-orchestrator
        ├── analyze-user-profile  (GPT-5.4-mini, batches of 10 users)
        ├── match-new-products    (deterministic scoring + AI email copy)
        ├── generate digest/re-engagement emails
        └── send-email            (Resend API, processes email_queue)

pg_cron (every 5 min)
  └── send-email                  (drains pending email_queue)

Standalone:
  └── unsubscribe                 (GET with ?token=xxx, sets email_enabled=false)
```

---

## 1. Behavior Tracking (Frontend)

### Events Tracked (logged-in users only)

| Event Type | Source File | Data |
|------------|------------|------|
| `quiz_completion` | `FragranceQuizPage.tsx` | All 6 answers + recommendation names/scores |
| `scent_dna_generated` | `QuizResults.tsx` | Archetype, families, signature notes |
| `search_query` | `useSearch.ts` | Query text, result count |
| `ai_search_query` | `useSearch.ts` | Query, top match score |
| `product_view` | `ProductPage.tsx` | Product ID/name/gender/price/notes |
| `wishlist_add` | `WishlistContext.tsx` | Product ID/name/price |
| `wishlist_remove` | `WishlistContext.tsx` | Product ID |
| `cart_add` | `CartContext.tsx` | Product ID/name/price/size |
| `cart_remove` | `CartContext.tsx` | Product ID/size |
| `chatbot_query` | `useChatbot.ts` | User's question text |
| `purchase` | Already in `orders` table | — |

### New File: `src/services/trackingService.ts`

```typescript
import { supabase } from "@/lib/supabase";

type EventType =
  | 'quiz_completion' | 'search_query' | 'ai_search_query'
  | 'product_view' | 'wishlist_add' | 'wishlist_remove'
  | 'cart_add' | 'cart_remove' | 'chatbot_query'
  | 'scent_dna_generated' | 'purchase';

let _currentUserId: string | null = null;

export function setTrackingUser(userId: string | null): void {
  _currentUserId = userId;
}

export function trackEvent(eventType: EventType, eventData: Record<string, unknown>): void {
  if (!_currentUserId) return;
  supabase
    .from('user_events')
    .insert({ user_id: _currentUserId, event_type: eventType, event_data: eventData })
    .then(({ error }) => {
      if (error) console.warn('Tracking failed:', error.message);
    });
}
```

### Integration Points

- **AuthContext.tsx**: Call `setTrackingUser(user?.id ?? null)` in `getSession()` and `onAuthStateChange`
- **FragranceQuizPage.tsx**: `trackEvent('quiz_completion', { answers, recommendations })` after results load
- **QuizResults.tsx**: `trackEvent('scent_dna_generated', { archetype, families, signatureNotes })` after DNA card generation
- **useSearch.ts**: `trackEvent('search_query', { query, result_count })` after text search; `trackEvent('ai_search_query', { query, top_match_score })` after AI search
- **ProductPage.tsx**: `trackEvent('product_view', { product_id, name, gender, price })` in loadData effect
- **WishlistContext.tsx**: `trackEvent('wishlist_add/remove', { product_id, name, price })` in add/remove functions
- **CartContext.tsx**: `trackEvent('cart_add/remove', { product_id, name, price, size })` in add/remove functions
- **useChatbot.ts**: `trackEvent('chatbot_query', { query })` in sendMessage

---

## 2. Database Schema

### Table: `user_events`

```sql
CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'quiz_completion', 'search_query', 'ai_search_query',
    'product_view', 'wishlist_add', 'wishlist_remove',
    'cart_add', 'cart_remove', 'chatbot_query',
    'scent_dna_generated', 'purchase'
  )),
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_events_user_created ON user_events(user_id, created_at DESC);
CREATE INDEX idx_user_events_type ON user_events(event_type);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users insert own events"
  ON user_events FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Table: `user_taste_profiles`

```sql
CREATE TABLE user_taste_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  scent_families JSONB NOT NULL DEFAULT '[]'::jsonb,
  preferred_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_range JSONB NOT NULL DEFAULT '{"min":0,"max":9999,"confidence":0}'::jsonb,
  gender_pref JSONB NOT NULL DEFAULT '{"value":"unisex","confidence":0}'::jsonb,
  occasion_pref JSONB NOT NULL DEFAULT '[]'::jsonb,
  intensity_pref JSONB NOT NULL DEFAULT '{"value":"moderate","confidence":0}'::jsonb,
  total_events_analyzed INTEGER NOT NULL DEFAULT 0,
  last_event_at TIMESTAMPTZ,
  profile_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_taste_profiles_updated_at
  BEFORE UPDATE ON user_taste_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_taste_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile"
  ON user_taste_profiles FOR SELECT USING (auth.uid() = user_id);
```

### Table: `email_preferences`

```sql
CREATE TABLE email_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  new_product_alerts BOOLEAN NOT NULL DEFAULT true,
  weekly_digest BOOLEAN NOT NULL DEFAULT false,
  monthly_digest BOOLEAN NOT NULL DEFAULT true,
  re_engagement BOOLEAN NOT NULL DEFAULT true,
  language_pref VARCHAR(5) NOT NULL DEFAULT 'en' CHECK (language_pref IN ('en', 'ar')),
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_prefs_unsubscribe_token ON email_preferences(unsubscribe_token);

CREATE TRIGGER update_email_prefs_updated_at
  BEFORE UPDATE ON email_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own email prefs"
  ON email_preferences FOR ALL USING (auth.uid() = user_id);
```

### Auto-create email_preferences on signup

```sql
CREATE OR REPLACE FUNCTION create_default_email_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO email_preferences (user_id, email_enabled)
  VALUES (NEW.id, true)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_email_preferences();
```

### Table: `email_queue`

```sql
CREATE TABLE email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type VARCHAR(30) NOT NULL CHECK (email_type IN (
    'new_product_match', 'weekly_digest', 'monthly_digest', 're_engagement'
  )),
  to_email VARCHAR(255) NOT NULL,
  subject_en TEXT NOT NULL,
  subject_ar TEXT NOT NULL,
  body_html_en TEXT NOT NULL,
  body_html_ar TEXT NOT NULL,
  product_ids UUID[] NOT NULL DEFAULT '{}',
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'sending', 'sent', 'failed', 'skipped'
  )),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_queue_pending ON email_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_email_queue_user ON email_queue(user_id);

ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
-- No client-side access; service_role only
```

### Table: `email_log`

```sql
CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_type VARCHAR(30) NOT NULL,
  subject TEXT NOT NULL,
  product_ids UUID[] DEFAULT '{}',
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE SET NULL,
  resend_message_id VARCHAR(100),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_log_user ON email_log(user_id);
CREATE INDEX idx_email_log_sent_at ON email_log(sent_at);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
-- No client-side access
```

### Table: `product_announcements`

```sql
CREATE TABLE product_announcements (
  product_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  announced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (product_id, user_id)
);

ALTER TABLE product_announcements ENABLE ROW LEVEL SECURITY;
-- No client-side access
```

### Table: `processing_metadata`

```sql
CREATE TABLE processing_metadata (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO processing_metadata (key, value) VALUES
  ('last_profile_analysis', '{"timestamp":"2000-01-01T00:00:00Z"}'),
  ('last_digest_run', '{"weekly":"2000-01-01T00:00:00Z","monthly":"2000-01-01T00:00:00Z"}'),
  ('last_reengagement_check', '{"timestamp":"2000-01-01T00:00:00Z"}');

ALTER TABLE processing_metadata ENABLE ROW LEVEL SECURITY;
-- No client-side access
```

### pg_cron Setup

```sql
-- Nightly orchestrator at 10 PM Libya (UTC+2) = 20:00 UTC
SELECT cron.schedule(
  'nightly-personalization',
  '0 20 * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/nightly-orchestrator',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Email queue processor every 5 minutes
SELECT cron.schedule(
  'process-email-queue',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

---

## 3. Edge Functions

### `supabase/functions/nightly-orchestrator/index.ts`

**Trigger**: pg_cron at 20:00 UTC

**Flow**:
1. Read `processing_metadata` for last run timestamps
2. Query users with events since last analysis → batch into groups of 10
3. For each batch, call `analyze-user-profile` Edge Function
4. Check for new products (perfumes created since last run) → call `match-new-products`
5. Check if today is digest day (Sunday for weekly, 1st for monthly) → generate digest emails
6. Check for re-engagement candidates (last_event_at > 30 days ago, email_preferences.re_engagement = true)
7. Update `processing_metadata` timestamps

### `supabase/functions/analyze-user-profile/index.ts`

**Input**: `{ user_ids: string[] }` (batch of up to 10)

**Per user**:
1. Fetch all `user_events` for user
2. Fetch existing `user_taste_profiles` entry
3. Summarize events into compact JSON (aggregate product views into frequency counts, not individual events)
4. Call GPT-5.4-mini with system prompt + event summary
5. Parse structured JSON response
6. Upsert into `user_taste_profiles`
7. 200ms delay between users for rate limiting

### `supabase/functions/match-new-products/index.ts`

**Input**: `{ product_ids: string[] }`

**Flow**:
1. Fetch product details (notes, gender, price)
2. Fetch all active `user_taste_profiles`
3. Deterministic scoring (no AI) per user-product pair:
   - Scent family overlap (product notes vs user scent_families)
   - Note overlap (product fragrance_notes vs user preferred_notes)
   - Gender match
   - Price in user's price_range
   - Intensity alignment
4. Users with score > 0.6 and not in `product_announcements` → generate email
5. Call GPT-5.4-mini for personalized email copy (batched)
6. Auto-generate promo code per user
7. Insert into `email_queue` + `product_announcements`

### `supabase/functions/send-email/index.ts`

**Trigger**: pg_cron every 5 min + called by orchestrator

**Flow**:
1. Query up to 10 pending `email_queue` jobs where `scheduled_for <= NOW()`
2. Mark as `sending`
3. For each: check `email_preferences` (opt-in + language) → select EN/AR content → send via Resend
4. On success: mark `sent`, insert into `email_log`
5. On failure: increment attempts, record error, set back to `pending`
6. Budget guard: skip if monthly sends > 2,800

### `supabase/functions/unsubscribe/index.ts`

**Trigger**: HTTP GET `?token=<unsubscribe_token>`

**Flow**:
1. Look up `email_preferences` by unsubscribe_token
2. Set `email_enabled = false`
3. Return simple HTML confirmation page (bilingual)

---

## 4. AI System Prompt (GPT-5.4-mini)

```
You are a fragrance preference analyst for Shama, a Libyan luxury perfume store.
Analyze a customer's behavioral data and produce a structured taste profile.

INPUT: JSON with the customer's event history:
- quiz_completions: Quiz answer sets (occasion, scent_family, intensity, gender, budget)
- search_queries: Search terms used
- product_views: Products viewed (names, notes, gender, price)
- wishlist: Products in wishlist
- cart_history: Products added to cart
- purchases: Completed orders
- chatbot_queries: Questions asked to chatbot
- scent_dna: Most recent Scent DNA card (if any)
- existing_profile: Current taste profile (null for new users)

RULES:
1. Weight by reliability: purchases > wishlist > cart > quiz > views > searches > chatbot
2. Recent events carry more weight than older ones
3. Few events (< 5): assign low confidence (< 0.5), rely on quiz data
4. Conflicting signals: trust behavior (purchases, wishlist) over stated preferences (quiz)
5. If existing_profile provided: evolve incrementally, don't replace. Preserve high-confidence scores unless strong contradictory evidence
6. Notes: extract from product fragrance data, rank by frequency

OUTPUT: Valid JSON only, no markdown fences:
{
  "scent_families": [{"name": "oriental", "score": 0.85}],
  "preferred_notes": [{"note": "oud", "score": 0.9}],
  "price_range": {"min": 150, "max": 500, "confidence": 0.7},
  "gender_pref": {"value": "men", "confidence": 0.8},
  "occasion_pref": [{"occasion": "date_night", "score": 0.7}],
  "intensity_pref": {"value": "bold", "confidence": 0.75},
  "summary": "Brief 1-sentence profile summary"
}

CONSTRAINTS:
- Scores: 0.0–1.0
- scent_families: 2–5 from: fresh, floral, woody, oriental, citrus, aquatic, musk, spicy, gourmand
- preferred_notes: 3–10 notes
- gender_pref: men | women | unisex
- intensity_pref: light | moderate | bold
- occasion_pref: daily | date_night | office | special_event | casual | formal
- price_range: in LYD (Libyan Dinar)
```

---

## 5. Email Templates

### New Product Match
- **Subject EN**: "A new fragrance just for you, {name}"
- **Subject AR**: "{name}، عطر جديد مختار لك"
- Product card with image, name, price, AI-written match reason (25 words max)
- CTA: "Discover Now" → product page
- Promo: "Use code {CODE} for 10% off — valid 7 days"
- Unsubscribe link in footer

### Weekly/Monthly Digest
- **Subject EN**: "Your fragrance picks this {week/month}"
- **Subject AR**: "اختياراتك العطرية لهذا {الأسبوع/الشهر}"
- 2-3 product cards with match reasons
- Mini scent profile summary
- 10% promo code
- Unsubscribe link

### Re-engagement
- **Subject EN**: "We miss you, {name}! Come discover what's new"
- **Subject AR**: "{name}، اشتقنا لك! تعال واكتشف الجديد"
- 2-3 trending/new products (not personalized — profile may be stale)
- **15% off** promo code (higher to incentivize return)
- Unsubscribe link

All emails use brand colors (#5B8DD9, #3E6BB5), Shama logo, RTL support for Arabic.

---

## 6. Promo Code Auto-Generation

Reuses existing `promo_codes` table. Generated in Edge Functions:

- **Format**: `SHAMA-{RANDOM_8}` (e.g., `SHAMA-A7X2K9M4`)
- **Discount**: 10% (new product/digest) or 15% (re-engagement)
- **Scope**: all_products
- **Expiry**: 7 days
- **Usage**: single-use, 1 per user
- **Validation**: existing `validatePromoCode()` in checkout handles everything

---

## 7. Email Preferences UI

New component accessible from user menu after login:

- Toggle: Email notifications ON/OFF (master switch)
- Toggle: New product alerts
- Toggle: Weekly digest
- Toggle: Monthly digest
- Toggle: Re-engagement emails
- Language preference: English / Arabic
- Reads/writes `email_preferences` table
- Auto-created on signup via DB trigger

---

## 8. Files to Create

| File | Purpose |
|------|---------|
| `src/services/trackingService.ts` | Frontend event tracking (trackEvent + setTrackingUser) |
| `src/pages/EmailPreferencesPage.tsx` | User email settings page |
| `supabase/functions/nightly-orchestrator/index.ts` | pg_cron target, dispatches work |
| `supabase/functions/analyze-user-profile/index.ts` | GPT-5.4-mini taste profile analysis |
| `supabase/functions/match-new-products/index.ts` | Score new products against profiles |
| `supabase/functions/send-email/index.ts` | Resend email sender with queue |
| `supabase/functions/unsubscribe/index.ts` | One-click unsubscribe handler |
| `supabase/functions/_shared/promo-generator.ts` | Shared promo code creation utility |
| `supabase/functions/_shared/email-templates.ts` | HTML email template functions |
| `supabase/functions/_shared/supabase-client.ts` | Service-role Supabase client for Edge Functions |

## 9. Files to Modify

| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Add `setTrackingUser()` call on auth state change |
| `src/pages/FragranceQuizPage.tsx` | Add quiz_completion tracking |
| `src/components/quiz/QuizResults.tsx` | Add scent_dna_generated tracking |
| `src/hooks/useSearch.ts` | Add search_query + ai_search_query tracking |
| `src/contexts/WishlistContext.tsx` | Add wishlist_add/remove tracking |
| `src/contexts/CartContext.tsx` | Add cart_add/remove tracking |
| `src/hooks/useChatbot.ts` | Add chatbot_query tracking |
| `src/App.tsx` | Add /settings route |
| `src/locales/en.json` | Add email preferences translations |
| `src/locales/ar.json` | Add email preferences translations (Arabic) |

---

## 10. Environment Variables Needed

```
# Edge Functions (.env in supabase/functions/)
OPENAI_API_KEY=sk-...          # GPT-5.4-mini for batch analysis
RESEND_API_KEY=re_...           # Resend email service
SUPABASE_URL=https://...        # Already available as env in Edge Functions
SUPABASE_SERVICE_ROLE_KEY=...   # Already available as env in Edge Functions
```

---

## 11. Verification Plan

1. **Database**: Apply migration, verify tables/indexes/RLS in Supabase dashboard
2. **Tracking**: Login → browse/quiz/search → check `user_events` table has rows
3. **Profile Analysis**: Manually invoke `analyze-user-profile` with test user → verify `user_taste_profiles` updated
4. **Product Matching**: Add a test product → invoke `match-new-products` → verify `email_queue` populated
5. **Email Sending**: Invoke `send-email` → verify email arrives via Resend test mode
6. **Unsubscribe**: Click unsubscribe link → verify `email_preferences.email_enabled = false`
7. **Full Nightly Run**: Trigger `nightly-orchestrator` manually → verify entire pipeline
8. **Budget Guard**: Verify `send-email` skips when monthly count > 2,800

---

## 12. Implementation Phases

**Phase 1 — Database + Tracking** (foundation)
- Apply all 7 table migrations
- Create `trackingService.ts`
- Integrate tracking into 7 existing files
- Create email preferences page
- Test: events flow into DB

**Phase 2 — AI Analysis** (Edge Functions)
- Set up `supabase/functions/` project structure
- Implement `analyze-user-profile` with GPT-5.4-mini
- Implement `nightly-orchestrator` (profile analysis only)
- Configure pg_cron
- Test: taste profiles generated

**Phase 3 — Email System** (Edge Functions)
- Set up Resend account
- Implement `send-email`, `match-new-products`, `unsubscribe`
- Build HTML email templates (EN + AR)
- Implement promo code auto-generation
- Add digest + re-engagement logic to orchestrator
- Test: end-to-end email flow

**Phase 4 — Polish**
- Budget guards and rate limiting
- Admin dashboard email analytics section
- Playwright E2E tests
