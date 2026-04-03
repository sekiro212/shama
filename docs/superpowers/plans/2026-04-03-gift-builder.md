# AI-Powered Gift Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 4-step AI gift builder wizard on the Gift Sets page where users describe a gift, get AI-curated product suggestions, customize a gift box, and receive an AI-generated image — then share it or place a custom order.

**Architecture:** Step-by-step wizard overlay rendered inside `GiftSetsPage.tsx`, controlled by a `GiftWizard` component that owns all state. AI product suggestions and image generation added to `aiService.ts` using the existing `@google/genai` v1.10 SDK. Custom orders saved to a new `custom_gift_orders` Supabase table; generated images uploaded to a new `gift-previews` Supabase Storage bucket.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, shadcn/ui, Supabase (Postgres + Storage), @google/genai v1.10+ (Gemini text + Imagen 4)

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `src/types/giftBuilder.ts` | All TypeScript types for the feature |
| Create | `src/services/giftBuilderService.ts` | Prompt builder, image upload, order placement |
| Create | `src/components/gift-builder/GiftStep1Describe.tsx` | Step 1: description input + example chips |
| Create | `src/components/gift-builder/GiftStep2Products.tsx` | Step 2: AI-suggested product multi-select |
| Create | `src/components/gift-builder/GiftStep3Customize.tsx` | Step 3: occasion, color, wrapping, message, recipient, date |
| Create | `src/components/gift-builder/GiftStep4Preview.tsx` | Step 4: AI image, style toggle, share, order buttons |
| Create | `src/components/gift-builder/GiftWizard.tsx` | Wizard controller — owns all state, orchestrates steps |
| Modify | `src/services/aiService.ts` | Add `getGiftSuggestions()` + `generateGiftImageBase64()` |
| Modify | `src/pages/GiftSetsPage.tsx` | Add "Build My Gift" CTA + render wizard overlay |
| Modify | `src/pages/AdminPage.tsx` | Add Gift Orders 5th tab |
| Modify | `src/locales/en.json` | Add `giftBuilder` translation section |
| Modify | `src/locales/ar.json` | Add `giftBuilder` Arabic translations |

---

## Task 1: Database migration

**Files:**
- Supabase MCP: apply migration
- Supabase MCP: create storage bucket

- [ ] **Step 1: Apply the custom_gift_orders migration**

Using the Supabase MCP tool `mcp__supabase__apply_migration`, run:

```sql
CREATE TABLE custom_gift_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

ALTER TABLE custom_gift_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own gift orders"
  ON custom_gift_orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gift orders"
  ON custom_gift_orders FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
```

- [ ] **Step 2: Create the gift-previews storage bucket**

Using the Supabase MCP tool `mcp__supabase__execute_sql`, run:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('gift-previews', 'gift-previews', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read gift previews"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gift-previews');

CREATE POLICY "Anyone can upload gift previews"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'gift-previews');
```

- [ ] **Step 3: Verify**

Run `mcp__supabase__list_tables` and confirm `custom_gift_orders` appears. Navigate to Supabase Storage in the dashboard and confirm `gift-previews` bucket exists.

- [ ] **Step 4: Commit**

```bash
git add supabase_schema.sql
git commit -m "feat: add custom_gift_orders table and gift-previews storage bucket"
```

---

## Task 2: TypeScript types

**Files:**
- Create: `src/types/giftBuilder.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/types/giftBuilder.ts
import { Product } from "@/services/productsService";

export type GiftOccasion =
  | "birthday"
  | "eid"
  | "anniversary"
  | "wedding"
  | "valentine"
  | "just_because";

export type GiftBoxColor = "black" | "gold" | "white" | "rose_gold";

export type GiftWrappingStyle = "ribbon" | "luxury_tissue" | "luxury_bag";

export type GiftImageStyle = "realistic" | "stylized";

export interface GiftCustomization {
  occasion: GiftOccasion;
  boxColor: GiftBoxColor;
  wrappingStyle: GiftWrappingStyle;
  messageCard: string;
  recipientName: string;
  deliveryDate: string;
}

export interface GiftWizardState {
  step: 1 | 2 | 3 | 4;
  description: string;
  suggestedProducts: Product[];
  selectedProducts: Product[];
  customization: GiftCustomization;
  generatedImageUrl: string;
  imageStyle: GiftImageStyle;
  isGenerating: boolean;
  isPlacingOrder: boolean;
}

export const DEFAULT_CUSTOMIZATION: GiftCustomization = {
  occasion: "birthday",
  boxColor: "gold",
  wrappingStyle: "ribbon",
  messageCard: "",
  recipientName: "",
  deliveryDate: "",
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -20
```

Expected: no errors related to `giftBuilder.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/types/giftBuilder.ts
git commit -m "feat: add TypeScript types for gift builder"
```

---

## Task 3: Add AI functions to aiService.ts

**Files:**
- Modify: `src/services/aiService.ts`

- [ ] **Step 1: Add `getGiftSuggestions` at the end of aiService.ts**

```typescript
export async function getGiftSuggestions(description: string): Promise<Product[]> {
  if (!ai) return [];
  try {
    const [productContext, { products }] = await Promise.all([
      buildProductContext(),
      fetchProducts(1, 100),
    ]);

    const prompt = `You are a gift curator for Shama, a luxury Libyan perfume store.

Given this perfume catalog:
${productContext}

A customer wants to build a gift with this description: "${description}"

Return ONLY a valid JSON array of 4-6 product names that would make the best gift combination.
Consider gender, occasion, scent compatibility, and price range.
Return ONLY product names that exist exactly in the catalog.
Example: ["Product Name 1", "Product Name 2"]

Return ONLY the JSON array, nothing else.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 256, temperature: 0.4 },
    });

    const text = response.text?.trim() || "[]";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const names: string[] = JSON.parse(match[0]);
    return products.filter((p) =>
      names.some(
        (name) =>
          p.name.toLowerCase().includes(name.toLowerCase()) ||
          name.toLowerCase().includes(p.name.toLowerCase())
      )
    );
  } catch (error) {
    console.error("Gift Suggestions Error:", error);
    return [];
  }
}

export async function generateGiftImageBase64(prompt: string): Promise<string> {
  if (!ai) throw new Error("AI service not configured");
  // NOTE: Verify model ID at https://ai.google.dev/gemini-api/docs/image-generation
  // Fall back to "imagen-3.0-generate-001" if imagen-4.0 is unavailable on your API key
  const response = await (ai.models as any).generateImages({
    model: "imagen-4.0-generate-001",
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: "image/jpeg",
      aspectRatio: "1:1",
    },
  });
  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("No image generated");
  return imageBytes as string;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/aiService.ts
git commit -m "feat: add getGiftSuggestions and generateGiftImageBase64 to aiService"
```

---

## Task 4: Create giftBuilderService.ts

**Files:**
- Create: `src/services/giftBuilderService.ts`

- [ ] **Step 1: Create the service**

```typescript
// src/services/giftBuilderService.ts
import { supabase } from "@/lib/supabase";
import { Product } from "./productsService";
import { generateGiftImageBase64 } from "./aiService";
import { GiftCustomization, GiftImageStyle } from "@/types/giftBuilder";

const OCCASION_LABELS: Record<string, string> = {
  birthday: "a birthday",
  eid: "an Eid celebration",
  anniversary: "an anniversary",
  wedding: "a wedding",
  valentine: "Valentine's Day",
  just_because: "a special moment",
};

const BOX_COLOR_LABELS: Record<string, string> = {
  black: "matte black",
  gold: "gold",
  white: "elegant white",
  rose_gold: "rose gold",
};

const WRAPPING_LABELS: Record<string, string> = {
  ribbon: "a satin ribbon bow",
  luxury_tissue: "luxury tissue paper wrapping",
  luxury_bag: "a luxury gift bag",
};

export function buildGiftImagePrompt(
  products: Product[],
  customization: GiftCustomization,
  style: GiftImageStyle
): string {
  const productList = products.map((p) => p.name).join(", ");
  const occasion = OCCASION_LABELS[customization.occasion];
  const boxColor = BOX_COLOR_LABELS[customization.boxColor];
  const wrapping = WRAPPING_LABELS[customization.wrappingStyle];
  const styleDescription =
    style === "realistic"
      ? "photorealistic product photography, clean white background, soft dramatic shadows, luxury brand aesthetic, studio lighting"
      : "warm artistic lifestyle illustration, romantic soft bokeh lighting, luxury brand watercolor and oil style";

  return `A premium luxury perfume gift set for ${occasion}. ${products.length} exquisite perfume bottle${products.length > 1 ? "s" : ""} (${productList}) elegantly arranged in a ${boxColor} gift box with ${wrapping}. The presentation is opulent and sophisticated, worthy of a high-end perfume boutique. ${styleDescription}. Professional high-end retail photography quality.`;
}

export async function generateAndSaveGiftImage(
  products: Product[],
  customization: GiftCustomization,
  style: GiftImageStyle
): Promise<string> {
  const prompt = buildGiftImagePrompt(products, customization, style);
  const base64 = await generateGiftImageBase64(prompt);

  const imageBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const fileName = `gift-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("gift-previews")
    .upload(fileName, imageBuffer, { contentType: "image/jpeg" });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("gift-previews").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function placeCustomGiftOrder(params: {
  products: Product[];
  customization: GiftCustomization;
  generatedImageUrl: string;
  imageStyle: GiftImageStyle;
  userId?: string;
}): Promise<string> {
  const totalPrice = params.products.reduce((sum, p) => sum + p.price, 0);

  const { data, error } = await supabase
    .from("custom_gift_orders")
    .insert({
      user_id: params.userId ?? null,
      products: params.products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0]?.image_url ?? null,
      })),
      occasion: params.customization.occasion,
      box_color: params.customization.boxColor,
      wrapping_style: params.customization.wrappingStyle,
      message_card: params.customization.messageCard || null,
      recipient_name: params.customization.recipientName || null,
      delivery_date: params.customization.deliveryDate || null,
      generated_image_url: params.generatedImageUrl,
      image_style: params.imageStyle,
      total_price: totalPrice,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/giftBuilderService.ts
git commit -m "feat: add giftBuilderService with prompt builder, image upload, order placement"
```

---

## Task 5: Translation keys

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/ar.json`

- [ ] **Step 1: Add giftBuilder section to en.json**

Add this block as a top-level key alongside `"giftSets"`:

```json
"giftBuilder": {
  "buildMyGift": "Build My Gift",
  "title": "AI Gift Builder",
  "stepDescribe": "Describe",
  "stepProducts": "Products",
  "stepCustomize": "Customize",
  "stepPreview": "Your Gift",
  "step1Title": "Who is this gift for?",
  "step1Subtitle": "Tell us about the person and occasion",
  "step1Placeholder": "e.g. My mom who loves floral scents, for her birthday...",
  "step1Next": "Find Perfect Perfumes",
  "findingProducts": "Finding products...",
  "chip1": "For my mom",
  "chip2": "Anniversary gift",
  "chip3": "Eid gift",
  "chip4": "For a friend who loves florals",
  "chip5": "Romantic gift for her",
  "step2Title": "Pick your perfumes",
  "step2Subtitle": "Select up to 4 perfumes for this gift",
  "step2Next": "Customize Gift Box",
  "back": "Back",
  "step3Title": "Design your gift box",
  "occasion": "Occasion",
  "occasionBirthday": "Birthday",
  "occasionEid": "Eid",
  "occasionAnniversary": "Anniversary",
  "occasionWedding": "Wedding",
  "occasionValentine": "Valentine's",
  "occasionJustBecause": "Just Because",
  "boxColor": "Box Color",
  "colorBlack": "Black",
  "colorGold": "Gold",
  "colorWhite": "White",
  "colorRoseGold": "Rose Gold",
  "wrapping": "Wrapping Style",
  "wrappingRibbon": "Satin Ribbon",
  "wrappingTissue": "Luxury Tissue",
  "wrappingBag": "Gift Bag",
  "recipientName": "Recipient Name",
  "recipientNamePlaceholder": "e.g. Sarah",
  "deliveryDate": "Preferred Delivery Date",
  "messageCard": "Message Card (optional)",
  "messageCardPlaceholder": "Write a heartfelt message...",
  "step3Next": "Generate My Gift",
  "step4Title": "Your Gift",
  "styleRealistic": "Realistic",
  "styleStylized": "Stylized",
  "generating": "Creating your gift image...",
  "download": "Download",
  "share": "Share",
  "regenerate": "Regenerate",
  "addToCart": "Add Products to Cart",
  "placeOrder": "Place Custom Gift Order",
  "placingOrder": "Placing order...",
  "addedToCart": "Products added to cart!",
  "linkCopied": "Link copied to clipboard!",
  "orderPlaced": "Your custom gift order has been placed!",
  "errorSuggestions": "Failed to get product suggestions. Please try again.",
  "errorGenerating": "Failed to generate image. Please try again.",
  "errorOrder": "Failed to place order. Please try again."
}
```

Also add to `admin.tabs`:
```json
"giftOrders": "Gift Orders"
```

- [ ] **Step 2: Add giftBuilder section to ar.json**

Add the Arabic translations block at the same top-level position:

```json
"giftBuilder": {
  "buildMyGift": "اصنع هديتك",
  "title": "منشئ الهدايا بالذكاء الاصطناعي",
  "stepDescribe": "وصف",
  "stepProducts": "المنتجات",
  "stepCustomize": "تخصيص",
  "stepPreview": "هديتك",
  "step1Title": "لمن هذه الهدية؟",
  "step1Subtitle": "أخبرنا عن الشخص والمناسبة",
  "step1Placeholder": "مثلاً: والدتي التي تحب العطور الزهرية، لعيد ميلادها...",
  "step1Next": "ابحث عن العطور المثالية",
  "findingProducts": "جارٍ البحث عن المنتجات...",
  "chip1": "لوالدتي",
  "chip2": "هدية ذكرى سنوية",
  "chip3": "هدية العيد",
  "chip4": "لصديقة تحب العطور الزهرية",
  "chip5": "هدية رومانسية لها",
  "step2Title": "اختر عطورك",
  "step2Subtitle": "اختر ما يصل إلى 4 عطور لهذه الهدية",
  "step2Next": "تخصيص علبة الهدية",
  "back": "رجوع",
  "step3Title": "صمم علبة الهدية",
  "occasion": "المناسبة",
  "occasionBirthday": "عيد الميلاد",
  "occasionEid": "العيد",
  "occasionAnniversary": "الذكرى السنوية",
  "occasionWedding": "حفل الزفاف",
  "occasionValentine": "عيد الحب",
  "occasionJustBecause": "بدون مناسبة",
  "boxColor": "لون العلبة",
  "colorBlack": "أسود",
  "colorGold": "ذهبي",
  "colorWhite": "أبيض",
  "colorRoseGold": "ذهبي وردي",
  "wrapping": "أسلوب التغليف",
  "wrappingRibbon": "شريط حرير",
  "wrappingTissue": "ورق فاخر",
  "wrappingBag": "حقيبة هدايا",
  "recipientName": "اسم المستلم",
  "recipientNamePlaceholder": "مثلاً: سارة",
  "deliveryDate": "تاريخ التسليم المفضل",
  "messageCard": "بطاقة رسالة (اختياري)",
  "messageCardPlaceholder": "اكتب رسالة من القلب...",
  "step3Next": "انشئ هديتي",
  "step4Title": "هديتك",
  "styleRealistic": "واقعي",
  "styleStylized": "فني",
  "generating": "جارٍ إنشاء صورة هديتك...",
  "download": "تنزيل",
  "share": "مشاركة",
  "regenerate": "إعادة الإنشاء",
  "addToCart": "إضافة المنتجات إلى السلة",
  "placeOrder": "تقديم طلب هدية مخصصة",
  "placingOrder": "جارٍ تقديم الطلب...",
  "addedToCart": "تمت إضافة المنتجات إلى السلة!",
  "linkCopied": "تم نسخ الرابط!",
  "orderPlaced": "تم تقديم طلب الهدية المخصصة بنجاح!",
  "errorSuggestions": "فشل في الحصول على اقتراحات المنتجات. يرجى المحاولة مرة أخرى.",
  "errorGenerating": "فشل في إنشاء الصورة. يرجى المحاولة مرة أخرى.",
  "errorOrder": "فشل في تقديم الطلب. يرجى المحاولة مرة أخرى."
}
```

Also add to `admin.tabs` in ar.json:
```json
"giftOrders": "طلبات الهدايا"
```

- [ ] **Step 3: Verify**

Run `npm run dev` and navigate to `/gift-sets`. Open browser console — no missing translation key errors.

- [ ] **Step 4: Commit**

```bash
git add src/locales/en.json src/locales/ar.json
git commit -m "feat: add giftBuilder and admin giftOrders translation keys (EN + AR)"
```

---

## Task 6: GiftStep1Describe component

**Files:**
- Create: `src/components/gift-builder/GiftStep1Describe.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/gift-builder/GiftStep1Describe.tsx
import { Sparkles, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  isLoading: boolean;
}

const CHIP_KEYS = [
  "giftBuilder.chip1",
  "giftBuilder.chip2",
  "giftBuilder.chip3",
  "giftBuilder.chip4",
  "giftBuilder.chip5",
];

export default function GiftStep1Describe({ value, onChange, onNext, isLoading }: Props) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-2">
          {t("giftBuilder.step1Title")}
        </h2>
        <p className="dark:text-white/60 text-[#6B7B8D]">
          {t("giftBuilder.step1Subtitle")}
        </p>
      </div>

      <textarea
        className="w-full glass-card rounded-2xl p-4 dark:text-[#F5F5F5] text-[#323D50] dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 resize-none focus:outline-none focus:ring-2 focus:ring-[#5B8DD9] text-base"
        rows={4}
        placeholder={t("giftBuilder.step1Placeholder")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        dir={isRTL ? "rtl" : "ltr"}
      />

      <div className="flex flex-wrap gap-2">
        {CHIP_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => onChange(t(key))}
            className="glass px-4 py-2 rounded-full text-sm dark:text-white/70 text-[#6B7B8D] dark:border-white/10 border-[#323D50]/10 border hover:bg-[#5B8DD9]/10 transition-colors"
          >
            {t(key)}
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!value.trim() || isLoading}
        className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white py-3 px-6 rounded-xl font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            {t("giftBuilder.findingProducts")}
          </>
        ) : (
          <>
            <Sparkles className="h-5 w-5" />
            {t("giftBuilder.step1Next")}
            <ChevronRight className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
          </>
        )}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run `npm run dev`. Navigate to `/gift-sets`, click "Build My Gift" (not yet wired up — just confirm TypeScript compiles without errors for this file).

```bash
npm run build 2>&1 | grep -i "GiftStep1"
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/gift-builder/GiftStep1Describe.tsx
git commit -m "feat: add GiftStep1Describe component"
```

---

## Task 7: GiftStep2Products component

**Files:**
- Create: `src/components/gift-builder/GiftStep2Products.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/gift-builder/GiftStep2Products.tsx
import { Check, ChevronRight, ChevronLeft } from "lucide-react";
import { Product } from "@/services/productsService";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  products: Product[];
  selected: Product[];
  onToggle: (product: Product) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function GiftStep2Products({ products, selected, onToggle, onNext, onBack }: Props) {
  const { t, isRTL } = useLanguage();

  const isSelected = (p: Product) => selected.some((s) => s.id === p.id);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-2">
          {t("giftBuilder.step2Title")}
        </h2>
        <p className="dark:text-white/60 text-[#6B7B8D]">
          {t("giftBuilder.step2Subtitle")} ({selected.length}/4)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-1">
        {products.map((product) => {
          const sel = isSelected(product);
          const disabled = !sel && selected.length >= 4;
          return (
            <button
              key={product.id}
              onClick={() => !disabled && onToggle(product)}
              disabled={disabled}
              className={`glass-card p-4 rounded-2xl text-start transition-all duration-200 border-2 ${
                sel
                  ? "border-[#5B8DD9] bg-[#5B8DD9]/10"
                  : "border-transparent hover:border-[#5B8DD9]/40"
              } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:scale-[1.02]"}`}
            >
              <div className="flex items-start gap-3">
                {product.images?.[0]?.image_url && (
                  <img
                    src={product.images[0].image_url}
                    alt={product.name}
                    className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold dark:text-[#F5F5F5] text-[#323D50] truncate text-sm">
                    {product.name}
                  </p>
                  <p className="text-sm dark:text-white/60 text-[#6B7B8D]">
                    {product.price} LYD
                  </p>
                </div>
                {sel && (
                  <div className="flex-shrink-0 bg-[#5B8DD9] rounded-full p-1">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-3 px-4 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
        >
          <ChevronLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
          {t("giftBuilder.back")}
        </button>
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className="flex-1 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white py-3 px-4 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
        >
          {t("giftBuilder.step2Next")}
          <ChevronRight className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gift-builder/GiftStep2Products.tsx
git commit -m "feat: add GiftStep2Products component"
```

---

## Task 8: GiftStep3Customize component

**Files:**
- Create: `src/components/gift-builder/GiftStep3Customize.tsx`

- [ ] **Step 1: Create the component**

```typescript
// src/components/gift-builder/GiftStep3Customize.tsx
import { ChevronRight, ChevronLeft } from "lucide-react";
import { GiftCustomization, GiftOccasion, GiftBoxColor, GiftWrappingStyle } from "@/types/giftBuilder";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  value: GiftCustomization;
  onChange: (value: GiftCustomization) => void;
  onNext: () => void;
  onBack: () => void;
}

export default function GiftStep3Customize({ value, onChange, onNext, onBack }: Props) {
  const { t, isRTL } = useLanguage();

  const set = <K extends keyof GiftCustomization>(key: K, val: GiftCustomization[K]) =>
    onChange({ ...value, [key]: val });

  const occasions: { value: GiftOccasion; label: string }[] = [
    { value: "birthday", label: t("giftBuilder.occasionBirthday") },
    { value: "eid", label: t("giftBuilder.occasionEid") },
    { value: "anniversary", label: t("giftBuilder.occasionAnniversary") },
    { value: "wedding", label: t("giftBuilder.occasionWedding") },
    { value: "valentine", label: t("giftBuilder.occasionValentine") },
    { value: "just_because", label: t("giftBuilder.occasionJustBecause") },
  ];

  const boxColors: { value: GiftBoxColor; hex: string; label: string }[] = [
    { value: "black", hex: "#1a1a1a", label: t("giftBuilder.colorBlack") },
    { value: "gold", hex: "#D4AF37", label: t("giftBuilder.colorGold") },
    { value: "white", hex: "#f0f0f0", label: t("giftBuilder.colorWhite") },
    { value: "rose_gold", hex: "#B76E79", label: t("giftBuilder.colorRoseGold") },
  ];

  const wrappings: { value: GiftWrappingStyle; label: string }[] = [
    { value: "ribbon", label: t("giftBuilder.wrappingRibbon") },
    { value: "luxury_tissue", label: t("giftBuilder.wrappingTissue") },
    { value: "luxury_bag", label: t("giftBuilder.wrappingBag") },
  ];

  return (
    <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
      <div className="text-center">
        <h2 className="text-2xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-2">
          {t("giftBuilder.step3Title")}
        </h2>
      </div>

      {/* Occasion */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.occasion")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {occasions.map((o) => (
            <button
              key={o.value}
              onClick={() => set("occasion", o.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                value.occasion === o.value
                  ? "bg-[#5B8DD9] text-white border-[#5B8DD9]"
                  : "glass dark:border-white/10 border-[#323D50]/10 dark:text-white/70 text-[#6B7B8D] hover:border-[#5B8DD9]"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Box Color */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.boxColor")}
        </Label>
        <div className="flex gap-3 items-center">
          {boxColors.map((c) => (
            <button
              key={c.value}
              onClick={() => set("boxColor", c.value)}
              title={c.label}
              className={`w-10 h-10 rounded-full border-4 transition-all hover:scale-110 ${
                value.boxColor === c.value
                  ? "border-[#5B8DD9] scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>
      </div>

      {/* Wrapping */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.wrapping")}
        </Label>
        <div className="flex flex-wrap gap-2">
          {wrappings.map((w) => (
            <button
              key={w.value}
              onClick={() => set("wrappingStyle", w.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                value.wrappingStyle === w.value
                  ? "bg-[#5B8DD9] text-white border-[#5B8DD9]"
                  : "glass dark:border-white/10 border-[#323D50]/10 dark:text-white/70 text-[#6B7B8D] hover:border-[#5B8DD9]"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recipient Name */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.recipientName")}
        </Label>
        <Input
          value={value.recipientName}
          onChange={(e) => set("recipientName", e.target.value)}
          placeholder={t("giftBuilder.recipientNamePlaceholder")}
          className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50]"
          dir={isRTL ? "rtl" : "ltr"}
        />
      </div>

      {/* Delivery Date */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.deliveryDate")}
        </Label>
        <Input
          type="date"
          value={value.deliveryDate}
          onChange={(e) => set("deliveryDate", e.target.value)}
          className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50]"
          min={new Date().toISOString().split("T")[0]}
        />
      </div>

      {/* Message Card */}
      <div>
        <Label className="dark:text-white/80 text-[#6B7B8D] mb-2 block font-medium">
          {t("giftBuilder.messageCard")}
        </Label>
        <Textarea
          value={value.messageCard}
          onChange={(e) => set("messageCard", e.target.value)}
          placeholder={t("giftBuilder.messageCardPlaceholder")}
          rows={3}
          className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] resize-none"
          dir={isRTL ? "rtl" : "ltr"}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-3 px-4 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
        >
          <ChevronLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
          {t("giftBuilder.back")}
        </button>
        <button
          onClick={onNext}
          className="flex-1 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white py-3 px-4 rounded-xl font-semibold transition-all hover:scale-105 flex items-center justify-center gap-2"
        >
          {t("giftBuilder.step3Next")}
          <ChevronRight className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/gift-builder/GiftStep3Customize.tsx
git commit -m "feat: add GiftStep3Customize component"
```

---

## Task 9: GiftStep4Preview component

**Files:**
- Create: `src/components/gift-builder/GiftStep4Preview.tsx`

- [ ] **Step 1: Read CartContext to confirm addItem signature**

Read `src/contexts/CartContext.tsx` and confirm the `addItem` function accepts a `Product`. If the function name or signature differs, adjust the `handleAddToCart` function below accordingly.

- [ ] **Step 2: Create the component**

```typescript
// src/components/gift-builder/GiftStep4Preview.tsx
import { Download, Share2, ShoppingCart, Package, ChevronLeft, RefreshCw } from "lucide-react";
import { GiftImageStyle } from "@/types/giftBuilder";
import { Product } from "@/services/productsService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface Props {
  imageUrl: string;
  imageStyle: GiftImageStyle;
  onStyleChange: (style: GiftImageStyle) => void;
  onRegenerate: () => void;
  onPlaceOrder: () => void;
  onBack: () => void;
  selectedProducts: Product[];
  isGenerating: boolean;
  isPlacingOrder: boolean;
}

export default function GiftStep4Preview({
  imageUrl,
  imageStyle,
  onStyleChange,
  onRegenerate,
  onPlaceOrder,
  onBack,
  selectedProducts,
  isGenerating,
  isPlacingOrder,
}: Props) {
  const { t, isRTL } = useLanguage();
  const { addItem } = useCart();

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `shama-gift-${Date.now()}.jpg`;
    link.click();
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: "My Shama Gift", url: imageUrl });
    } else {
      await navigator.clipboard.writeText(imageUrl);
      toast.success(t("giftBuilder.linkCopied"));
    }
  };

  const handleAddToCart = () => {
    selectedProducts.forEach((p) => addItem(p));
    toast.success(t("giftBuilder.addedToCart"));
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-2">
          {t("giftBuilder.step4Title")}
        </h2>
      </div>

      {/* Style Toggle */}
      <div className="flex gap-2 justify-center">
        {(["realistic", "stylized"] as GiftImageStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => !isGenerating && onStyleChange(s)}
            disabled={isGenerating}
            className={`px-5 py-2 rounded-full text-sm font-medium border transition-all ${
              imageStyle === s
                ? "bg-[#5B8DD9] text-white border-[#5B8DD9]"
                : "glass dark:border-white/10 border-[#323D50]/10 dark:text-white/70 text-[#6B7B8D] hover:border-[#5B8DD9]"
            } disabled:opacity-50`}
          >
            {t(`giftBuilder.style${s.charAt(0).toUpperCase() + s.slice(1)}` as any)}
          </button>
        ))}
      </div>

      {/* Image */}
      <div className="relative aspect-square rounded-2xl overflow-hidden glass-card border dark:border-white/10 border-[#323D50]/10">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#F8F9FB] dark:bg-[#1a2235]">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-[#5B8DD9]" />
            <p className="dark:text-white/60 text-[#6B7B8D] text-sm">{t("giftBuilder.generating")}</p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Generated gift"
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* Action buttons — only show when image is ready */}
      {!isGenerating && imageUrl && (
        <>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-2.5 rounded-xl font-medium hover:scale-105 transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <Download className="h-4 w-4" />
              {t("giftBuilder.download")}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-2.5 rounded-xl font-medium hover:scale-105 transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <Share2 className="h-4 w-4" />
              {t("giftBuilder.share")}
            </button>
            <button
              onClick={onRegenerate}
              className="flex-1 glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-2.5 rounded-xl font-medium hover:scale-105 transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              {t("giftBuilder.regenerate")}
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-3 rounded-xl font-semibold hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <ShoppingCart className="h-5 w-5" />
            {t("giftBuilder.addToCart")}
          </button>

          <button
            onClick={onPlaceOrder}
            disabled={isPlacingOrder}
            className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white py-3 px-6 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isPlacingOrder ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                {t("giftBuilder.placingOrder")}
              </>
            ) : (
              <>
                <Package className="h-5 w-5" />
                {t("giftBuilder.placeOrder")}
              </>
            )}
          </button>
        </>
      )}

      <button
        onClick={onBack}
        disabled={isGenerating}
        className="w-full glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-2.5 rounded-xl font-medium hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <ChevronLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
        {t("giftBuilder.back")}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/gift-builder/GiftStep4Preview.tsx
git commit -m "feat: add GiftStep4Preview component"
```

---

## Task 10: GiftWizard component

**Files:**
- Create: `src/components/gift-builder/GiftWizard.tsx`

- [ ] **Step 1: Create the wizard controller**

```typescript
// src/components/gift-builder/GiftWizard.tsx
import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { Product } from "@/services/productsService";
import { getGiftSuggestions } from "@/services/aiService";
import { generateAndSaveGiftImage, placeCustomGiftOrder } from "@/services/giftBuilderService";
import { GiftWizardState, DEFAULT_CUSTOMIZATION, GiftImageStyle } from "@/types/giftBuilder";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import GiftStep1Describe from "./GiftStep1Describe";
import GiftStep2Products from "./GiftStep2Products";
import GiftStep3Customize from "./GiftStep3Customize";
import GiftStep4Preview from "./GiftStep4Preview";

interface Props {
  onClose: () => void;
}

const STEP_LABEL_KEYS = [
  "giftBuilder.stepDescribe",
  "giftBuilder.stepProducts",
  "giftBuilder.stepCustomize",
  "giftBuilder.stepPreview",
] as const;

export default function GiftWizard({ onClose }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [state, setState] = useState<GiftWizardState>({
    step: 1,
    description: "",
    suggestedProducts: [],
    selectedProducts: [],
    customization: DEFAULT_CUSTOMIZATION,
    generatedImageUrl: "",
    imageStyle: "realistic",
    isGenerating: false,
    isPlacingOrder: false,
  });

  const set = <K extends keyof GiftWizardState>(key: K, val: GiftWizardState[K]) =>
    setState((prev) => ({ ...prev, [key]: val }));

  const handleStep1Next = useCallback(async () => {
    set("isGenerating", true);
    try {
      const suggestions = await getGiftSuggestions(state.description);
      setState((prev) => ({
        ...prev,
        suggestedProducts: suggestions,
        step: 2,
        isGenerating: false,
      }));
    } catch {
      toast.error(t("giftBuilder.errorSuggestions"));
      set("isGenerating", false);
    }
  }, [state.description, t]);

  const handleStep3Next = useCallback(async () => {
    setState((prev) => ({ ...prev, step: 4, isGenerating: true, generatedImageUrl: "" }));
    try {
      const url = await generateAndSaveGiftImage(
        state.selectedProducts,
        state.customization,
        state.imageStyle
      );
      setState((prev) => ({ ...prev, generatedImageUrl: url, isGenerating: false }));
    } catch {
      toast.error(t("giftBuilder.errorGenerating"));
      setState((prev) => ({ ...prev, isGenerating: false }));
    }
  }, [state.selectedProducts, state.customization, state.imageStyle, t]);

  const handleRegenerate = useCallback(async () => {
    setState((prev) => ({ ...prev, isGenerating: true, generatedImageUrl: "" }));
    try {
      const url = await generateAndSaveGiftImage(
        state.selectedProducts,
        state.customization,
        state.imageStyle
      );
      setState((prev) => ({ ...prev, generatedImageUrl: url, isGenerating: false }));
    } catch {
      toast.error(t("giftBuilder.errorGenerating"));
      setState((prev) => ({ ...prev, isGenerating: false }));
    }
  }, [state.selectedProducts, state.customization, state.imageStyle, t]);

  const handleStyleChange = useCallback(async (style: GiftImageStyle) => {
    setState((prev) => ({ ...prev, imageStyle: style, isGenerating: true, generatedImageUrl: "" }));
    try {
      const url = await generateAndSaveGiftImage(state.selectedProducts, state.customization, style);
      setState((prev) => ({ ...prev, generatedImageUrl: url, isGenerating: false }));
    } catch {
      toast.error(t("giftBuilder.errorGenerating"));
      setState((prev) => ({ ...prev, isGenerating: false }));
    }
  }, [state.selectedProducts, state.customization, t]);

  const handlePlaceOrder = useCallback(async () => {
    set("isPlacingOrder", true);
    try {
      await placeCustomGiftOrder({
        products: state.selectedProducts,
        customization: state.customization,
        generatedImageUrl: state.generatedImageUrl,
        imageStyle: state.imageStyle,
        userId: user?.id,
      });
      toast.success(t("giftBuilder.orderPlaced"));
      onClose();
    } catch {
      toast.error(t("giftBuilder.errorOrder"));
      set("isPlacingOrder", false);
    }
  }, [state, user, t, onClose]);

  const toggleProduct = useCallback((product: Product) => {
    setState((prev) => {
      const exists = prev.selectedProducts.some((p) => p.id === product.id);
      return {
        ...prev,
        selectedProducts: exists
          ? prev.selectedProducts.filter((p) => p.id !== product.id)
          : prev.selectedProducts.length < 4
          ? [...prev.selectedProducts, product]
          : prev.selectedProducts,
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative dark:bg-[#1a2235] bg-[#F8F9FB]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold dark:text-[#F5F5F5] text-[#323D50]">
            {t("giftBuilder.title")}
          </h1>
          <button
            onClick={onClose}
            className="glass p-2 rounded-xl dark:text-white/60 text-[#6B7B8D] hover:scale-110 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  n <= state.step ? "bg-[#5B8DD9]" : "bg-[#323D50]/10 dark:bg-white/10"
                }`}
              />
              <p
                className={`text-xs mt-1 text-center truncate ${
                  n === state.step
                    ? "text-[#5B8DD9] font-medium"
                    : "dark:text-white/40 text-[#6B7B8D]"
                }`}
              >
                {t(STEP_LABEL_KEYS[n - 1])}
              </p>
            </div>
          ))}
        </div>

        {/* Steps */}
        {state.step === 1 && (
          <GiftStep1Describe
            value={state.description}
            onChange={(v) => set("description", v)}
            onNext={handleStep1Next}
            isLoading={state.isGenerating}
          />
        )}
        {state.step === 2 && (
          <GiftStep2Products
            products={state.suggestedProducts}
            selected={state.selectedProducts}
            onToggle={toggleProduct}
            onNext={() => set("step", 3)}
            onBack={() => set("step", 1)}
          />
        )}
        {state.step === 3 && (
          <GiftStep3Customize
            value={state.customization}
            onChange={(v) => set("customization", v)}
            onNext={handleStep3Next}
            onBack={() => set("step", 2)}
          />
        )}
        {state.step === 4 && (
          <GiftStep4Preview
            imageUrl={state.generatedImageUrl}
            imageStyle={state.imageStyle}
            onStyleChange={handleStyleChange}
            onRegenerate={handleRegenerate}
            onPlaceOrder={handlePlaceOrder}
            onBack={() => set("step", 3)}
            selectedProducts={state.selectedProducts}
            isGenerating={state.isGenerating}
            isPlacingOrder={state.isPlacingOrder}
          />
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/gift-builder/GiftWizard.tsx
git commit -m "feat: add GiftWizard controller component"
```

---

## Task 11: Update GiftSetsPage

**Files:**
- Modify: `src/pages/GiftSetsPage.tsx`

- [ ] **Step 1: Add wizard import and state**

At the top of `GiftSetsPage.tsx`, add these imports:

```typescript
import { Sparkles } from "lucide-react"; // add to existing lucide import line
import GiftWizard from "@/components/gift-builder/GiftWizard";
```

Inside the `GiftSetsPage` function, after the existing state declarations, add:

```typescript
const [showWizard, setShowWizard] = useState(false);
```

- [ ] **Step 2: Add the CTA button**

In the header section of `GiftSetsPage.tsx`, after the `<p>` description tag (line 60), add:

```tsx
<div className="flex justify-center mt-6">
  <button
    onClick={() => setShowWizard(true)}
    className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white px-8 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg shadow-[#5B8DD9]/30"
  >
    <Sparkles className="h-5 w-5" />
    {t("giftBuilder.buildMyGift")}
  </button>
</div>
```

- [ ] **Step 3: Render wizard overlay**

At the very bottom of the `return` statement in `GiftSetsPage`, before the closing `</div>`, add:

```tsx
{showWizard && <GiftWizard onClose={() => setShowWizard(false)} />}
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Navigate to `http://localhost:5173/gift-sets`. Confirm:
1. "Build My Gift" button appears in the header
2. Clicking it opens the wizard overlay
3. Step 1 input and example chips are visible
4. Closing the wizard (X button) dismisses the overlay

- [ ] **Step 5: Commit**

```bash
git add src/pages/GiftSetsPage.tsx
git commit -m "feat: integrate GiftWizard into GiftSetsPage with Build My Gift CTA"
```

---

## Task 12: Add Gift Orders tab to AdminPage

**Files:**
- Modify: `src/pages/AdminPage.tsx`

- [ ] **Step 1: Add CustomGiftOrder interface and state**

After the existing interface definitions (around line 140 in AdminPage.tsx), add:

```typescript
interface CustomGiftOrder {
  id: string;
  user_id: string | null;
  products: { id: string; name: string; price: number; image: string | null }[];
  occasion: string;
  box_color: string;
  wrapping_style: string;
  message_card: string | null;
  recipient_name: string | null;
  delivery_date: string | null;
  generated_image_url: string | null;
  image_style: string;
  status: string;
  total_price: number;
  created_at: string;
}
```

In the component's state block (near other `useState` calls), add:

```typescript
const [giftOrders, setGiftOrders] = useState<CustomGiftOrder[]>([]);
const [giftOrdersLoading, setGiftOrdersLoading] = useState(false);
```

- [ ] **Step 2: Add fetchGiftOrders function**

Add this function inside the component (near the other fetch functions):

```typescript
const fetchGiftOrders = async () => {
  setGiftOrdersLoading(true);
  try {
    const { data, error } = await supabase
      .from("custom_gift_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    setGiftOrders(data ?? []);
  } catch (err) {
    console.error("Failed to fetch gift orders:", err);
    toast.error("Failed to load gift orders");
  } finally {
    setGiftOrdersLoading(false);
  }
};
```

Call it in the existing `useEffect` that loads data on mount (alongside `fetchOrders`, etc.):

```typescript
fetchGiftOrders();
```

- [ ] **Step 3: Update TabsList from grid-cols-4 to grid-cols-5**

Find this line in AdminPage.tsx (around line 1506):
```tsx
<TabsList className="grid w-full grid-cols-4 glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20">
```

Change `grid-cols-4` to `grid-cols-5`.

- [ ] **Step 4: Add Gift Orders tab trigger**

After the closing `</TabsTrigger>` of the "reviews" tab (around line 1539), add:

```tsx
<TabsTrigger
  value="giftOrders"
  className="data-[state=active]:bg-[#5B8DD9]"
>
  <Gift className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
  {t("admin.tabs.giftOrders")}
</TabsTrigger>
```

Make sure `Gift` is imported from lucide-react (it should already be, since it's used in GiftSetsPage, but check the AdminPage imports).

- [ ] **Step 5: Add Gift Orders tab content**

After the closing `</TabsContent>` of the "reviews" tab (around line 2933), add:

```tsx
<TabsContent value="giftOrders" className="mt-6">
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold dark:text-[#F5F5F5] text-[#323D50]">
        {t("admin.tabs.giftOrders")}
      </h2>
      <Button variant="outline" onClick={fetchGiftOrders} disabled={giftOrdersLoading}>
        {giftOrdersLoading ? t("admin.loadingTitle") : t("admin.refreshOrders")}
      </Button>
    </div>

    {giftOrdersLoading ? (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#5B8DD9]" />
      </div>
    ) : giftOrders.length === 0 ? (
      <div className="glass-card p-12 rounded-2xl text-center">
        <Gift className="h-12 w-12 dark:text-white/30 text-[#6B7B8D] mx-auto mb-4" />
        <p className="dark:text-white/60 text-[#6B7B8D]">No custom gift orders yet.</p>
      </div>
    ) : (
      <div className="space-y-4">
        {giftOrders.map((order) => (
          <div key={order.id} className="glass-card p-5 rounded-2xl flex gap-5 items-start">
            {/* Image thumbnail */}
            {order.generated_image_url && (
              <img
                src={order.generated_image_url}
                alt="Gift preview"
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
            )}

            {/* Order details */}
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold dark:text-[#F5F5F5] text-[#323D50]">
                  {order.recipient_name ?? "No recipient name"}
                </p>
                <Badge
                  className={
                    order.status === "pending"
                      ? "bg-amber-500"
                      : order.status === "accepted"
                      ? "bg-green-500"
                      : "bg-blue-500"
                  }
                >
                  {order.status}
                </Badge>
              </div>
              <p className="text-sm dark:text-white/60 text-[#6B7B8D]">
                {order.occasion} · {order.box_color} box · {order.wrapping_style}
              </p>
              <p className="text-sm dark:text-white/60 text-[#6B7B8D]">
                Products: {order.products.map((p) => p.name).join(", ")}
              </p>
              {order.delivery_date && (
                <p className="text-sm dark:text-white/60 text-[#6B7B8D]">
                  Delivery: {new Date(order.delivery_date).toLocaleDateString()}
                </p>
              )}
              {order.message_card && (
                <p className="text-sm dark:text-white/60 text-[#6B7B8D] italic">
                  "{order.message_card}"
                </p>
              )}
              <p className="text-sm font-semibold text-[#5B8DD9]">
                {order.total_price} LYD
              </p>
            </div>

            {/* Status selector */}
            <div className="flex-shrink-0">
              <select
                value={order.status}
                onChange={async (e) => {
                  const { error } = await supabase
                    .from("custom_gift_orders")
                    .update({ status: e.target.value })
                    .eq("id", order.id);
                  if (!error) {
                    setGiftOrders((prev) =>
                      prev.map((o) =>
                        o.id === order.id ? { ...o, status: e.target.value } : o
                      )
                    );
                    toast.success("Status updated");
                  }
                }}
                className="glass dark:bg-white/5 bg-white dark:border-white/10 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
</TabsContent>
```

- [ ] **Step 6: Verify in browser**

```bash
npm run dev
```

Navigate to `/admin`. Login. Confirm:
1. "Gift Orders" appears as a 5th tab
2. Tab renders without errors
3. Shows "No custom gift orders yet" when empty

- [ ] **Step 7: Commit**

```bash
git add src/pages/AdminPage.tsx
git commit -m "feat: add Gift Orders tab to AdminPage with status management"
```

---

## End-to-End Verification

After all tasks are complete, run through the full flow manually:

1. Navigate to `/gift-sets`
2. Click "Build My Gift" — wizard opens
3. Type "A gift for my wife who loves floral and oud scents" — click "Find Perfect Perfumes"
4. Confirm 4-6 products appear — select 2-3 of them
5. Click "Customize Gift Box" — fill in: occasion=Anniversary, color=Gold, wrapping=Ribbon, recipient="Nour", date=next week
6. Click "Generate My Gift" — loading animation plays (~5-10s), image appears
7. Toggle between "Realistic" and "Stylized" — new image generates
8. Click "Regenerate" — different image appears
9. Click "Download" — image saves to device
10. Click "Add Products to Cart" — products appear in cart
11. Click "Place Custom Gift Order" — success toast appears, wizard closes
12. Navigate to `/admin` → "Gift Orders" tab — new order appears with image thumbnail, products, and status dropdown
13. Change status to "Accepted" — badge updates immediately
14. Repeat all steps in Arabic to verify RTL layout
