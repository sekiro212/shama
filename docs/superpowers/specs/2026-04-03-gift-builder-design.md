# AI-Powered Gift Builder — Design Spec
**Date:** 2026-04-03  
**Status:** Approved by user

---

## Context

The current Gift Sets page (`/gift-sets`) only displays pre-made gift products from the database. There is no way for a customer to create a personalized gift. The goal is to transform this page into an **AI-powered Gift Builder** where customers:

1. Describe who the gift is for
2. Get AI-curated product suggestions from Shama's catalog
3. Select products and customize the gift box (occasion, color, wrapping, message card, recipient name, delivery date)
4. See an AI-generated image of their gift (realistic or stylized)
5. Share the image and/or place a custom gift order

---

## Overall Flow

The existing Gift Sets page keeps its product grid. A prominent **"Build Your Gift"** button at the top launches a full-screen 4-step wizard overlay:

```
[1. Describe] → [2. Pick Products] → [3. Customize] → [4. Your Gift]
```

Progress is shown as a step indicator bar at the top of the wizard.

---

## Step Details

### Step 1 — Describe
- Free-text input: "Tell us about the person you're gifting…"
- Example chips below the input (clickable): "For my mom", "Anniversary gift", "Eid gift", "For a friend who loves florals"
- "Next" triggers AI product suggestions

### Step 2 — Pick Products
- AI analyzes the description against the full product catalog via Gemini
- Displays 4–6 suggested perfume cards in a grid
- User selects 1–4 products (multi-select with checkmark overlay)
- "Show all products" link for users who want to browse manually

### Step 3 — Customize
- **Occasion:** Birthday, Eid, Anniversary, Wedding, Valentine's, Just Because
- **Box color:** Black, Gold, White, Rose Gold
- **Wrapping style:** Ribbon, Luxury Tissue Paper, Luxury Bag
- **Message card:** Optional text input
- **Recipient name:** Text input
- **Delivery date:** Date picker

### Step 4 — Your Gift
- "Generate My Gift" button triggers Gemini Imagen 4
- Loading shimmer animation (~5–8s)
- Image appears with reveal animation
- Two style toggle buttons: **Realistic** / **Stylized**
- **Regenerate** button for a new variation
- **Share** button: download image or copy link (WhatsApp-friendly)
- **Add to Cart** button: adds selected products to cart normally
- **Place Custom Gift Order** button: saves full order with image to Supabase

---

## Components

All new components live under `src/components/gift-builder/`:

| File | Purpose |
|---|---|
| `GiftWizard.tsx` | Step controller, progress bar, step state |
| `GiftStep1Describe.tsx` | Description input + example chips |
| `GiftStep2Products.tsx` | AI-suggested product grid, multi-select (max 4) |
| `GiftStep3Customize.tsx` | Occasion, box color, wrapping, message, recipient, delivery date |
| `GiftStep4Preview.tsx` | Generated image, style toggle, share, order buttons |

---

## Services

### New: `src/services/giftBuilderService.ts`

```typescript
// Returns product names that match the description
getGiftSuggestions(description: string): Promise<Product[]>

// Builds a prompt and calls Gemini Imagen 4, returns image URL
generateGiftImage(
  products: Product[],
  customization: GiftCustomization,
  style: 'realistic' | 'stylized'
): Promise<string>

// Saves completed order to Supabase
placeCustomGiftOrder(data: CustomGiftOrder): Promise<string>
```

### Modified: `src/services/aiService.ts`
- Add `generateImage(prompt: string): Promise<string>` using Gemini Imagen 4 (`imagen-4.0-generate-001`)
- Uses existing `VITE_GEMINI_API_KEY`

### Modified: `src/pages/GiftSetsPage.tsx`
- Add "Build Your Gift" CTA button
- Render `<GiftWizard>` overlay when active

---

## Image Generation

**Tool:** Google Gemini Imagen 4 (via existing `VITE_GEMINI_API_KEY`)  
**Cost:** ~$0.02–$0.06 per image  
**Model:** `imagen-4.0-generate-001`

**Prompt template (auto-built from user choices):**
```
A luxury perfume gift box for a {occasion} occasion.
The box is {box_color} with a {wrapping_style}.
Inside are {n} premium perfume bottles: {product names}.
Soft warm lighting. Premium presentation.
Style: {photorealistic product photography on white background | warm artistic lifestyle illustration}.
```

**Generated image flow:**
1. Upload result to Supabase Storage bucket `gift-previews` (bucket must be created during setup)
2. Store public URL in `custom_gift_orders.generated_image_url`

---

## Database

### New table: `custom_gift_orders`

```sql
CREATE TABLE custom_gift_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  products JSONB NOT NULL,
  occasion VARCHAR(50),
  box_color VARCHAR(30),
  wrapping_style VARCHAR(30),
  message_card TEXT,
  recipient_name VARCHAR(100),
  delivery_date DATE,
  generated_image_url TEXT,
  image_style VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  total_price DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Status flow:** `pending → accepted → delivered`

---

## Admin Panel

New **"Gift Orders"** tab in `src/pages/AdminPage.tsx`:
- Table showing all custom gift orders
- Columns: generated image thumbnail, recipient name, products, occasion, delivery date, total price, status
- Status dropdown to update order status (same pattern as existing orders)

---

## Bilingual Support

All new UI text gets translation keys in `src/locales/en.json` and `src/locales/ar.json`.  
RTL layout supported via `isRTL` from `useLanguage()` throughout wizard steps.

---

## Verification

1. **Step 1→2:** Enter "perfume for my wife for our anniversary" → AI should return 4–6 relevant perfumes from the catalog
2. **Step 2→3:** Select 2 products → customize options should all render correctly in both EN and AR
3. **Step 3→4:** Click "Generate My Gift" → image appears within 10s, style toggle switches between realistic/stylized
4. **Regenerate:** Clicking regenerate produces a different image
5. **Share:** Download button saves the image file
6. **Place Order:** Order appears in Supabase `custom_gift_orders` table and in Admin → Gift Orders tab
7. **Add to Cart:** Selected products appear in the cart normally
8. **RTL:** Wizard displays correctly in Arabic with reversed layout
