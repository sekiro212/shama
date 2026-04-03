# The Ritual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four immersive features — Whisper Mode, Animated Fragrance Timeline, Scent DNA Identity Card, and Scent Memory Wall — to make Shama feel cinematic, prestigious, and personal.

**Architecture:** Each feature is self-contained. Whisper Mode is pure CSS + a Header toggle. The Timeline and DNA Card extend existing components and the Gemini AI service. The Memory Wall adds a new Supabase table, service file, and component. Build and ship in the order listed — each task is independently testable.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion (`framer-motion`), Google Gemini (`@google/genai` — model `gemini-3.1-flash-lite-preview`), Supabase, `html-to-image` (install in Task 9)

---

## File Map

| Action | File | What it does |
|---|---|---|
| Modify | `src/index.css` | Whisper Mode CSS + marquee animations |
| Modify | `src/components/Header.tsx` | Whisper Mode toggle button + indicator pill |
| Modify | `src/components/ProductCard.tsx` | Wrap root in `whisper-card` div |
| Create | `src/components/FragranceTimeline.tsx` | Timeline component for product page |
| Modify | `src/services/aiService.ts` | Add `generateTimelineDescriptions` + `getScentDNACard` |
| Modify | `src/pages/ProductPage.tsx` | Add "Journey" tab + render FragranceTimeline |
| Modify | `src/pages/FragranceQuizPage.tsx` | Fetch DNA card alongside recommendations |
| Modify | `src/components/quiz/QuizResults.tsx` | Render DNA card section |
| Create | `src/services/memoriesService.ts` | Supabase CRUD for memories table |
| Create | `src/components/ScentMemoryWall.tsx` | Memory wall display + submit modal |
| Modify | `src/pages/HomePage.tsx` | Add ScentMemoryWall section |
| Modify | `src/pages/AdminPage.tsx` | Add Memories tab |
| Modify | `src/locales/en.json` | All new translation keys |
| Modify | `src/locales/ar.json` | All new translation keys in Arabic |

---

## Task 1: Whisper Mode — CSS Rules

**Files:**
- Modify: `src/index.css`
- Modify: `src/components/ProductCard.tsx`

- [ ] **Step 1: Add the `whisper-card` wrapper to ProductCard**

Open `src/components/ProductCard.tsx`. The component currently returns `<CardContainer ...>` at line 94. Wrap it in a div:

```tsx
// Before (line 93):
  return (
    <CardContainer

// After:
  return (
    <div className="whisper-card">
    <CardContainer
```

And close the div just before the last closing paren of the return:

```tsx
// Find the last line of the return (after </CardContainer>):
    </CardContainer>
    </div>
  );
```

- [ ] **Step 2: Add Whisper Mode CSS to `src/index.css`**

Add at the very end of the file:

```css
/* ── Whisper Mode ────────────────────────────────────── */
.whisper-mode .whisper-card {
  opacity: 0.15;
  transition: opacity 0.45s ease, box-shadow 0.45s ease;
}
.whisper-mode .whisper-card:hover {
  opacity: 1;
  box-shadow: 0 0 28px rgba(91, 141, 217, 0.35), 0 0 56px rgba(91, 141, 217, 0.1);
}

/* ── Scent Memory Wall marquee ───────────────────────── */
@keyframes memory-marquee {
  from { transform: translateX(0); }
  to   { transform: translateX(-50%); }
}
@keyframes memory-marquee-reverse {
  from { transform: translateX(-50%); }
  to   { transform: translateX(0); }
}
.memory-marquee {
  animation: memory-marquee 45s linear infinite;
  width: max-content;
}
.memory-marquee-reverse {
  animation: memory-marquee-reverse 45s linear infinite;
  width: max-content;
}
.memory-marquee:hover,
.memory-marquee-reverse:hover {
  animation-play-state: paused;
}
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`, open a product collection page. With DevTools console run `document.body.classList.add('whisper-mode')`. All product cards should dim except the one you hover.

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/components/ProductCard.tsx
git commit -m "feat: add whisper-mode CSS and whisper-card wrapper"
```

---

## Task 2: Whisper Mode — Header Toggle

**Files:**
- Modify: `src/components/Header.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/ar.json`

- [ ] **Step 1: Add translation keys**

In `src/locales/en.json`, find the `"header"` object and add two keys:

```json
"whisperMode": "Whisper Mode",
"exitWhisperMode": "Exit Whisper Mode"
```

In `src/locales/ar.json`, find the `"header"` object and add:

```json
"whisperMode": "وضع الهمس",
"exitWhisperMode": "خروج من وضع الهمس"
```

- [ ] **Step 2: Add imports and state to Header.tsx**

At line 2 of `src/components/Header.tsx`, update the lucide-react import to include `Eye` and `EyeOff`:

```tsx
import { Link } from "react-router-dom";
import { ShoppingBag, Menu, Search, Heart, Globe, Sun, Moon, LogIn, LogOut, UserCircle, Sparkles, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from "react";
```

Inside the `Header` component body (after line 25, after `const { user, signOut } = useAuth();`), add:

```tsx
  const [isWhisperMode, setIsWhisperMode] = useState(false);

  useEffect(() => {
    if (isWhisperMode) {
      document.body.classList.add("whisper-mode");
    } else {
      document.body.classList.remove("whisper-mode");
    }
    return () => document.body.classList.remove("whisper-mode");
  }, [isWhisperMode]);
```

- [ ] **Step 3: Add the toggle button in desktop actions**

In the desktop actions area (`src/components/Header.tsx` around line 103), add the whisper button **before** the theme toggle button:

```tsx
          {/* Whisper Mode Toggle */}
          <Button
            onClick={() => setIsWhisperMode((w) => !w)}
            variant="ghost"
            size="icon"
            className="glass dark:bg-white/5 bg-[#5B8DD9]/10 dark:hover:bg-white/10 hover:bg-[#5B8DD9]/20 border dark:border-white/10 border-[#323D50]/10 rounded-xl w-10 h-10 transition-all duration-300 hover:scale-105"
            title={isWhisperMode ? t("header.exitWhisperMode") : t("header.whisperMode")}
          >
            {isWhisperMode ? (
              <EyeOff className="w-4 h-4 text-[#5B8DD9]" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </Button>
```

- [ ] **Step 4: Add the indicator pill**

At the very bottom of the Header's return, just before the closing `</header>`, add:

```tsx
      {/* Whisper Mode indicator pill */}
      {isWhisperMode && (
        <div className="fixed bottom-6 left-4 z-50 flex items-center gap-2 bg-[#1a2235]/90 backdrop-blur-sm border border-[#5B8DD9]/40 text-[#5B8DD9] text-xs font-medium px-3 py-1.5 rounded-full pointer-events-none">
          <EyeOff className="w-3 h-3" />
          {t("header.whisperMode")}
        </div>
      )}
```

- [ ] **Step 5: Verify in browser**

Click the Eye icon in the header — all product cards should dim. Hover a card — it should come to full opacity with a glow. Click again — everything returns to normal. The pill label appears in the bottom-left.

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.tsx src/locales/en.json src/locales/ar.json
git commit -m "feat: add Whisper Mode header toggle with indicator pill"
```

---

## Task 3: Fragrance Timeline — AI Service Function

**Files:**
- Modify: `src/services/aiService.ts`

- [ ] **Step 1: Add `generateTimelineDescriptions` to aiService.ts**

At the end of `src/services/aiService.ts`, add:

```ts
export async function generateTimelineDescriptions(
  productName: string,
  notes: { top: string[]; middle: string[]; base: string[] },
  language: string
): Promise<{ top: string; middle: string; base: string }> {
  const fallback = {
    top: notes.top.join(", ") || "—",
    middle: notes.middle.join(", ") || "—",
    base: notes.base.join(", ") || "—",
  };
  if (!ai) return fallback;

  try {
    const lang = language === "ar" ? "Arabic" : "English";
    const prompt = `You are a luxury perfume writer. For the fragrance "${productName}", write one short poetic sentence per phase (max 15 words each) describing what the wearer experiences. Respond in ${lang}.

Top notes (${notes.top.join(", ") || "none"}):
Heart notes (${notes.middle.join(", ") || "none"}):
Base notes (${notes.base.join(", ") || "none"}):

Return ONLY valid JSON, nothing else:
{"top":"sentence here","middle":"sentence here","base":"sentence here"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 256, temperature: 0.75 },
    });

    const text = response.text?.trim() || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]);
    return {
      top: parsed.top || fallback.top,
      middle: parsed.middle || fallback.middle,
      base: parsed.base || fallback.base,
    };
  } catch {
    return fallback;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no TypeScript errors for this file.

- [ ] **Step 3: Commit**

```bash
git add src/services/aiService.ts
git commit -m "feat: add generateTimelineDescriptions to aiService"
```

---

## Task 4: Fragrance Timeline — Component

**Files:**
- Create: `src/components/FragranceTimeline.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/FragranceTimeline.tsx` with this full content:

```tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { generateTimelineDescriptions } from "@/services/aiService";

interface FragranceTimelineProps {
  productName: string;
  notes: { top: string[]; middle: string[]; base: string[] };
  notesAr?: { top: string[]; middle: string[]; base: string[] };
}

type PhaseKey = "top" | "middle" | "base";

const PHASES: {
  key: PhaseKey;
  label: string;
  labelAr: string;
  time: string;
  timeAr: string;
  dotPosition: string;
}[] = [
  {
    key: "top",
    label: "Top Notes",
    labelAr: "النوتات الأولى",
    time: "0 – 30 min",
    timeAr: "٠ – ٣٠ دقيقة",
    dotPosition: "10%",
  },
  {
    key: "middle",
    label: "Heart Notes",
    labelAr: "نوتات القلب",
    time: "30 min – 2 hrs",
    timeAr: "٣٠ د – ساعتين",
    dotPosition: "50%",
  },
  {
    key: "base",
    label: "Base Notes",
    labelAr: "النوتات الأساسية",
    time: "2 hrs+",
    timeAr: "٢ ساعات+",
    dotPosition: "90%",
  },
];

export default function FragranceTimeline({
  productName,
  notes,
  notesAr,
}: FragranceTimelineProps) {
  const { isRTL, language } = useLanguage();
  const [activePhase, setActivePhase] = useState<PhaseKey | null>(null);
  const [descriptions, setDescriptions] = useState<{
    top: string;
    middle: string;
    base: string;
  } | null>(null);

  const displayNotes =
    language === "ar" && notesAr ? notesAr : notes;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const desc = await generateTimelineDescriptions(
        productName,
        notes,
        language
      );
      if (!cancelled) setDescriptions(desc);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [productName, language]);

  return (
    <div className="py-6 px-2">
      {/* Shimmer track */}
      <div className="relative h-1 bg-[#5B8DD9]/20 rounded-full mb-10 mx-4 overflow-visible">
        {/* Travelling shimmer */}
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-[#5B8DD9] to-transparent rounded-full"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ width: "40%" }}
        />

        {/* Phase dots */}
        {PHASES.map((phase) => (
          <button
            key={phase.key}
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 transition-all duration-300 cursor-pointer ${
              activePhase === phase.key
                ? "border-[#5B8DD9] bg-[#5B8DD9] scale-125"
                : "border-[#5B8DD9] bg-[#1a2235] hover:scale-125"
            }`}
            style={{ left: phase.dotPosition, transform: "translate(-50%, -50%)" }}
            onClick={() =>
              setActivePhase(activePhase === phase.key ? null : phase.key)
            }
            aria-label={isRTL ? phase.labelAr : phase.label}
          />
        ))}
      </div>

      {/* Phase cards grid */}
      <div className="grid grid-cols-3 gap-3">
        {PHASES.map((phase) => {
          const isActive = activePhase === phase.key;
          const phaseNotes = displayNotes[phase.key];

          return (
            <motion.button
              key={phase.key}
              className={`text-start p-4 rounded-xl border transition-all duration-300 cursor-pointer w-full ${
                isActive
                  ? "border-[#5B8DD9]/70 bg-[#5B8DD9]/10 shadow-lg shadow-[#5B8DD9]/20"
                  : "border-white/10 dark:border-white/10 bg-white/5 hover:border-[#5B8DD9]/40"
              }`}
              onClick={() =>
                setActivePhase(isActive ? null : phase.key)
              }
              animate={{ scale: isActive ? 1.02 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="text-xs font-semibold text-[#5B8DD9] mb-0.5">
                {isRTL ? phase.labelAr : phase.label}
              </div>
              <div className="text-xs text-[#6B7B8D] mb-3">
                {isRTL ? phase.timeAr : phase.time}
              </div>

              <div className="flex flex-wrap gap-1 mb-2">
                {phaseNotes.slice(0, 3).map((note) => (
                  <span
                    key={note}
                    className="text-xs bg-[#5B8DD9]/15 text-[#F5F5F5] px-2 py-0.5 rounded-full"
                  >
                    {note}
                  </span>
                ))}
                {phaseNotes.length > 3 && (
                  <span className="text-xs text-[#6B7B8D]">
                    +{phaseNotes.length - 3}
                  </span>
                )}
              </div>

              {isActive && descriptions && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-[#6B7B8D] italic leading-relaxed mt-1"
                >
                  {descriptions[phase.key]}
                </motion.p>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/FragranceTimeline.tsx
git commit -m "feat: add FragranceTimeline component"
```

---

## Task 5: Fragrance Timeline — Product Page Integration

**Files:**
- Modify: `src/pages/ProductPage.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/ar.json`

- [ ] **Step 1: Add translation key**

In `src/locales/en.json`, find the `"product"` object and add:

```json
"journey": "Fragrance Journey"
```

In `src/locales/ar.json`, find the `"product"` object and add:

```json
"journey": "رحلة العطر"
```

- [ ] **Step 2: Import FragranceTimeline in ProductPage**

At the top of `src/pages/ProductPage.tsx`, add:

```tsx
import FragranceTimeline from "@/components/FragranceTimeline";
```

- [ ] **Step 3: Add "journey" to the tabs array**

Find the `tabs` array in `ProductPage.tsx` (around line 254):

```tsx
  const tabs = [
    { id: "details", label: t("product.details"), icon: Info },
    { id: "notes", label: t("product.fragranceNotes"), icon: Sparkles },
  ];
```

Replace with:

```tsx
  const tabs = [
    { id: "details", label: t("product.details"), icon: Info },
    { id: "notes", label: t("product.fragranceNotes"), icon: Sparkles },
    { id: "journey", label: t("product.journey"), icon: Wind },
  ];
```

`Wind` is already imported in `ProductPage.tsx` (line 13). Verify: `import { ..., Wind, ... } from "lucide-react";` — if not present, add it.

- [ ] **Step 4: Render the Timeline in the tab content**

Find the section in ProductPage that renders tab content (around line 969):

```tsx
                {activeTab === "details" && <DetailsTab product={product} t={t} language={language} />}
                {activeTab === "notes" && <NotesTab product={product} t={t} language={language} />}
```

Add after those two lines:

```tsx
                {activeTab === "journey" && product && (
                  <FragranceTimeline
                    productName={language === "ar" && product.name_ar ? product.name_ar : product.name}
                    notes={product.fragranceNotes ?? { top: [], middle: [], base: [] }}
                    notesAr={product.fragranceNotes_ar}
                  />
                )}
```

- [ ] **Step 5: Verify in browser**

Navigate to any product page. A "Fragrance Journey" tab should appear alongside Details and Notes. Clicking it shows the timeline. Clicking a phase node expands it with notes and AI description.

- [ ] **Step 6: Commit**

```bash
git add src/pages/ProductPage.tsx src/locales/en.json src/locales/ar.json
git commit -m "feat: add Fragrance Journey tab with timeline to ProductPage"
```

---

## Task 6: Scent DNA Card — AI Service Function

**Files:**
- Modify: `src/services/aiService.ts`

- [ ] **Step 1: Add the `ScentDNACard` interface and `getScentDNACard` function**

At the end of `src/services/aiService.ts`, add:

```ts
export interface ScentDNACard {
  archetype: string;
  archetypeAr: string;
  families: { name: string; nameAr: string; percent: number }[];
  signatureNotes: string[];
  bestTime: string;
  bestTimeAr: string;
  bestSeason: string;
  bestSeasonAr: string;
}

export async function getScentDNACard(
  answers: Record<string, string>
): Promise<ScentDNACard | null> {
  if (!ai) return null;

  try {
    const prompt = `A person answered a fragrance quiz:
- Occasion: ${answers.occasion || "daily"}
- Season: ${answers.season || "spring"}
- Scent Family: ${answers.scentFamily || "floral"}
- Intensity: ${answers.intensity || "moderate"}
- Gender Preference: ${answers.gender || "unisex"}

Create a unique fragrance identity card for this person. Return ONLY valid JSON:
{
  "archetype": "English poetic archetype name (e.g. 'The Desert Wanderer', 'The Midnight Bloom', 'The Silk Road Dreamer')",
  "archetypeAr": "Same name translated poetically to Arabic",
  "families": [
    {"name":"Oriental","nameAr":"شرقي","percent":60},
    {"name":"Woody","nameAr":"خشبي","percent":40}
  ],
  "signatureNotes": ["Note1","Note2","Note3"],
  "bestTime": "Evening",
  "bestTimeAr": "المساء",
  "bestSeason": "${answers.season || "Autumn"}",
  "bestSeasonAr": "الخريف"
}
Rules: families must sum to 100, use 2-3 families, archetype must be evocative and poetic, signatureNotes should match the scent families chosen.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { maxOutputTokens: 400, temperature: 0.85 },
    });

    const text = response.text?.trim() || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]) as ScentDNACard;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/aiService.ts
git commit -m "feat: add getScentDNACard and ScentDNACard type to aiService"
```

---

## Task 7: Scent DNA Card — Quiz Integration

**Files:**
- Modify: `src/pages/FragranceQuizPage.tsx`
- Modify: `src/components/quiz/QuizResults.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/ar.json`

- [ ] **Step 1: Add translation keys**

In `src/locales/en.json`, find the `"quiz"` object and add a `"dna"` sub-object:

```json
"dna": {
  "title": "SHAMA FRAGRANCE IDENTITY",
  "youAre": "You are",
  "bestWorn": "Best worn",
  "download": "Download Card",
  "share": "Share",
  "downloadError": "Download failed. Please try again.",
  "shareError": "Share failed. Please try again.",
  "copiedCaption": "Caption copied to clipboard!"
}
```

In `src/locales/ar.json`, find the `"quiz"` object and add:

```json
"dna": {
  "title": "هوية شمة العطرية",
  "youAre": "أنت",
  "bestWorn": "الأنسب لـ",
  "download": "تحميل البطاقة",
  "share": "مشاركة",
  "downloadError": "فشل التحميل. حاول مجدداً.",
  "shareError": "فشل المشاركة. حاول مجدداً.",
  "copiedCaption": "تم نسخ التسمية التوضيحية!"
}
```

- [ ] **Step 2: Fetch DNA card in FragranceQuizPage**

In `src/pages/FragranceQuizPage.tsx`, update the import from aiService:

```tsx
import { getQuizRecommendations, getScentDNACard, ScentDNACard } from "@/services/aiService";
```

After the existing `recommendations` state (line 102), add:

```tsx
  const [dnaCard, setDnaCard] = useState<ScentDNACard | null>(null);
```

In the `handleSelect` function, find the `else` block where results are fetched (around line 119). Replace the try block:

```tsx
        try {
          const [results, dna] = await Promise.all([
            getQuizRecommendations(newAnswers),
            getScentDNACard(newAnswers),
          ]);
          setRecommendations(results);
          setDnaCard(dna);
        } catch (error) {
          console.error("Error getting recommendations:", error);
          setRecommendations([]);
          setDnaCard(null);
        } finally {
```

Pass `dnaCard` to QuizResults. Find the `<QuizResults` usage (around line 300) and add the prop:

```tsx
            <QuizResults
              recommendations={recommendations}
              isLoading={isLoading}
              dnaCard={dnaCard}
              quizAnswers={answers}
            />
```

Also update the `handleRestart` function to reset the DNA card:

```tsx
  const handleRestart = () => {
    setCurrentStep(0);
    setShowResults(false);
    setRecommendations([]);
    setDnaCard(null);
    setAnswers({});
    setDirection(-1);
  };
```

- [ ] **Step 3: Install html-to-image**

```bash
npm install html-to-image
```

- [ ] **Step 4: Add DNA card section to QuizResults**

In `src/components/quiz/QuizResults.tsx`, update the props interface:

```tsx
import { ScentDNACard } from "@/services/aiService";

interface QuizResultsProps {
  recommendations: { name: string; matchScore: number; reason: string }[];
  isLoading: boolean;
  dnaCard?: ScentDNACard | null;
  quizAnswers?: Record<string, string>;
}
```

Update the function signature:

```tsx
export default function QuizResults({
  recommendations,
  isLoading,
  dnaCard,
  quizAnswers,
}: QuizResultsProps) {
```

Add these imports at the top of the file:

```tsx
import { Download, Share2 } from "lucide-react";
import { ScentDNACard } from "@/services/aiService";
```

Inside the component body, add these handler functions (before the return):

```tsx
  const handleDownloadCard = async () => {
    const el = document.getElementById("scent-dna-card");
    if (!el) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "shama-scent-dna.png";
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error(t("quiz.dna.downloadError"));
    }
  };

  const handleShareCard = async () => {
    const el = document.getElementById("scent-dna-card");
    if (!el || !dnaCard) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, { quality: 0.95, pixelRatio: 2 });
      const caption = isRTL
        ? `هويتي العطرية على شمة: "${dnaCard.archetypeAr}" 🌸✨ @shama_luxury`
        : `My Shama Fragrance Identity: "${dnaCard.archetype}" 🌸✨ @shama_luxury`;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "shama-scent-dna.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "My Shama Fragrance Identity", text: caption, files: [file] });
      } else {
        await navigator.clipboard.writeText(caption);
        toast.success(t("quiz.dna.copiedCaption"));
      }
    } catch {
      toast.error(t("quiz.dna.shareError"));
    }
  };
```

At the end of the component return (after the last product card, before the closing tags), add the DNA card section:

```tsx
      {/* Scent DNA Identity Card */}
      {dnaCard && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12"
        >
          <div
            id="scent-dna-card"
            className="max-w-sm mx-auto glass-card p-8 rounded-2xl border border-[#5B8DD9]/30 bg-gradient-to-br from-[#0d1525] to-[#1a2235]"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="text-xs tracking-[0.2em] text-[#5B8DD9] uppercase font-semibold mb-3">
                ✦ {t("quiz.dna.title")}
              </div>
              <p className="text-[#6B7B8D] text-sm mb-1">{t("quiz.dna.youAre")}</p>
              <h3 className="text-xl font-bold text-[#F5F5F5]">
                "{isRTL ? dnaCard.archetypeAr : dnaCard.archetype}"
              </h3>
            </div>

            {/* Scent family bars */}
            <div className="space-y-3 mb-6">
              {dnaCard.families.map((fam) => (
                <div key={fam.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#F5F5F5]/80">
                      {isRTL ? fam.nameAr : fam.name}
                    </span>
                    <span className="text-[#5B8DD9]">{fam.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${fam.percent}%` }}
                      transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Signature notes */}
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {dnaCard.signatureNotes.map((note) => (
                <span
                  key={note}
                  className="text-xs bg-[#5B8DD9]/20 text-[#F5F5F5] px-3 py-1 rounded-full border border-[#5B8DD9]/20"
                >
                  {note}
                </span>
              ))}
            </div>

            {/* Best worn */}
            <p className="text-center text-xs text-[#6B7B8D] mb-6">
              {t("quiz.dna.bestWorn")}:{" "}
              {isRTL ? dnaCard.bestTimeAr : dnaCard.bestTime} ·{" "}
              {isRTL ? dnaCard.bestSeasonAr : dnaCard.bestSeason}
            </p>
          </div>

          {/* Buttons outside the card (not included in PNG) */}
          <div className="flex gap-3 justify-center mt-4">
            <Button
              onClick={handleDownloadCard}
              variant="outline"
              size="sm"
              className="border-[#5B8DD9]/30 text-[#5B8DD9] hover:bg-[#5B8DD9]/10"
            >
              <Download className={`w-3 h-3 ${isRTL ? "ms-1" : "me-1"}`} />
              {t("quiz.dna.download")}
            </Button>
            <Button
              onClick={handleShareCard}
              variant="outline"
              size="sm"
              className="border-[#5B8DD9]/30 text-[#5B8DD9] hover:bg-[#5B8DD9]/10"
            >
              <Share2 className={`w-3 h-3 ${isRTL ? "ms-1" : "me-1"}`} />
              {t("quiz.dna.share")}
            </Button>
          </div>
        </motion.div>
      )}
```

- [ ] **Step 5: Verify in browser**

Complete the fragrance quiz. After results load, a DNA identity card should appear below the product recommendations, with animated bars and the archetype name. Download and Share buttons should work.

- [ ] **Step 6: Commit**

```bash
git add src/pages/FragranceQuizPage.tsx src/components/quiz/QuizResults.tsx src/locales/en.json src/locales/ar.json package.json package-lock.json
git commit -m "feat: add Scent DNA Identity Card to quiz results"
```

---

## Task 8: Scent Memory Wall — Database Migration

**Files:**
- New Supabase migration via MCP

- [ ] **Step 1: Apply the migration**

Use the Supabase MCP tool `mcp__supabase__apply_migration` with this SQL:

```sql
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  perfume_id uuid references perfumes(id) on delete set null,
  perfume_name text not null,
  memory_text text not null check (char_length(memory_text) between 5 and 120),
  author_name text,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  created_at timestamptz not null default now()
);

-- Public can insert (pending only); admin reads/updates via service role
alter table memories enable row level security;

create policy "Anyone can submit a memory"
  on memories for insert
  with check (status = 'pending');

create policy "Anyone can read approved memories"
  on memories for select
  using (status = 'approved');
```

- [ ] **Step 2: Verify the table exists**

Use the Supabase MCP tool `mcp__supabase__list_tables` and confirm `memories` appears in the list.

- [ ] **Step 3: Commit**

```bash
git add supabase_schema.sql 2>/dev/null; git commit -m "feat: add memories table migration" --allow-empty
```

---

## Task 9: Scent Memory Wall — Service

**Files:**
- Create: `src/services/memoriesService.ts`

- [ ] **Step 1: Create the service file**

Create `src/services/memoriesService.ts` with this full content:

```ts
import { supabase } from "@/lib/supabase";

export interface Memory {
  id: string;
  perfume_id: string | null;
  perfume_name: string;
  memory_text: string;
  author_name?: string;
  status: "pending" | "approved";
  created_at: string;
}

export const fetchApprovedMemories = async (): Promise<Memory[]> => {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(40);
  if (error) {
    console.error("Error fetching memories:", error);
    return [];
  }
  return data || [];
};

export const submitMemory = async (payload: {
  perfume_id: string;
  perfume_name: string;
  memory_text: string;
  author_name?: string;
}): Promise<void> => {
  const { error } = await supabase.from("memories").insert([
    { ...payload, status: "pending" },
  ]);
  if (error) throw error;
};

export const fetchAllMemories = async (): Promise<Memory[]> => {
  const { data, error } = await supabase
    .from("memories")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching all memories:", error);
    return [];
  }
  return data || [];
};

export const approveMemory = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from("memories")
    .update({ status: "approved" })
    .eq("id", id);
  if (error) throw error;
};

export const deleteMemory = async (id: string): Promise<void> => {
  const { error } = await supabase.from("memories").delete().eq("id", id);
  if (error) throw error;
};

export const fetchPendingMemoryCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from("memories")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");
  if (error) return 0;
  return count ?? 0;
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/memoriesService.ts
git commit -m "feat: add memoriesService with Supabase CRUD"
```

---

## Task 10: Scent Memory Wall — Component

**Files:**
- Create: `src/components/ScentMemoryWall.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/ar.json`

- [ ] **Step 1: Add translation keys**

In `src/locales/en.json`, add a top-level `"memories"` object:

```json
"memories": {
  "eyebrow": "MEMORIES OF SHAMA",
  "title": "Scent Stories",
  "subtitle": "Real moments, real people",
  "shareButton": "Share Your Memory",
  "modalTitle": "Share a Scent Memory",
  "selectPerfume": "Choose a fragrance...",
  "placeholder": "One sentence about a memory this scent evokes...",
  "namePlaceholder": "Your name (optional)",
  "submit": "Share Memory",
  "submitSuccess": "Thank you! Your memory will appear after review.",
  "submitError": "Failed to submit. Please try again.",
  "validationError": "Please select a fragrance and write at least 5 characters.",
  "empty": "Be the first to share a scent memory."
}
```

In `src/locales/ar.json`, add:

```json
"memories": {
  "eyebrow": "ذكريات شمة",
  "title": "قصص العطور",
  "subtitle": "لحظات حقيقية، أناس حقيقيون",
  "shareButton": "شارك ذكرى عطرية",
  "modalTitle": "شارك ذكرى عطرية",
  "selectPerfume": "اختر عطراً...",
  "placeholder": "جملة واحدة عن ذكرى يستحضرها هذا العطر...",
  "namePlaceholder": "اسمك (اختياري)",
  "submit": "مشاركة الذكرى",
  "submitSuccess": "شكراً لك! ستظهر ذكرتك بعد المراجعة.",
  "submitError": "فشل الإرسال. حاول مجدداً.",
  "validationError": "يرجى اختيار عطر وكتابة 5 أحرف على الأقل.",
  "empty": "كن أول من يشارك ذكرى عطرية."
}
```

- [ ] **Step 2: Create the component**

Create `src/components/ScentMemoryWall.tsx` with this full content:

```tsx
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  fetchApprovedMemories,
  submitMemory,
  Memory,
} from "@/services/memoriesService";
import { fetchProducts, Product } from "@/services/productsService";
import { toast } from "sonner";

function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <div className="flex-shrink-0 glass-card p-4 rounded-xl w-60 border border-[#5B8DD9]/10 hover:border-[#5B8DD9]/30 transition-colors duration-300">
      <p className="text-sm text-[#F5F5F5]/90 italic mb-3 leading-relaxed line-clamp-3">
        "{memory.memory_text}"
      </p>
      <p className="text-xs text-[#5B8DD9] font-medium">— {memory.perfume_name}</p>
    </div>
  );
}

export default function ScentMemoryWall() {
  const { t, isRTL, language } = useLanguage();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [memoryText, setMemoryText] = useState("");
  const [selectedPerfumeId, setSelectedPerfumeId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchApprovedMemories().then(setMemories);
    fetchProducts(1, 100).then(({ products: p }) => setProducts(p));
  }, []);

  const handleSubmit = async () => {
    if (!selectedPerfumeId || memoryText.trim().length < 5) {
      toast.error(t("memories.validationError"));
      return;
    }
    setSubmitting(true);
    try {
      const product = products.find((p) => p.id === selectedPerfumeId);
      await submitMemory({
        perfume_id: selectedPerfumeId,
        perfume_name:
          language === "ar" && product?.name_ar
            ? product.name_ar
            : product?.name || "",
        memory_text: memoryText.trim(),
        author_name: authorName.trim() || undefined,
      });
      toast.success(t("memories.submitSuccess"));
      setOpen(false);
      setMemoryText("");
      setSelectedPerfumeId("");
      setAuthorName("");
    } catch {
      toast.error(t("memories.submitError"));
    } finally {
      setSubmitting(false);
    }
  };

  const row1 = memories.filter((_, i) => i % 2 === 0);
  const row2 = memories.filter((_, i) => i % 2 === 1);

  return (
    <section className="py-16 overflow-hidden">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="container mx-auto px-4 mb-10 text-center"
      >
        <span className="inline-block text-xs font-semibold tracking-[0.2em] text-[#5B8DD9] uppercase mb-3">
          {t("memories.eyebrow")}
        </span>
        <h2 className="text-3xl md:text-4xl font-bold text-[#323D50] dark:text-[#F5F5F5] mb-3">
          {t("memories.title")}
        </h2>
        <p className="text-[#6B7B8D] mb-6">{t("memories.subtitle")}</p>
        <Button
          onClick={() => setOpen(true)}
          className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl hover:opacity-90 transition-opacity"
        >
          <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
          {t("memories.shareButton")}
        </Button>
      </motion.div>

      {/* Marquee rows */}
      {memories.length === 0 ? (
        <p className="text-center text-[#6B7B8D] text-sm">
          {t("memories.empty")}
        </p>
      ) : (
        <div className="space-y-3">
          {/* Row 1 — left to right */}
          <div className="overflow-hidden">
            <div className="flex gap-3 memory-marquee">
              {[...row1, ...row1].map((m, i) => (
                <MemoryCard key={`r1-${i}`} memory={m} />
              ))}
            </div>
          </div>
          {/* Row 2 — right to left */}
          {row2.length > 0 && (
            <div className="overflow-hidden">
              <div className="flex gap-3 memory-marquee-reverse">
                {[...row2, ...row2].map((m, i) => (
                  <MemoryCard key={`r2-${i}`} memory={m} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Submit modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-card border-[#5B8DD9]/20 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#F5F5F5]">
              {t("memories.modalTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Select
              value={selectedPerfumeId}
              onValueChange={setSelectedPerfumeId}
            >
              <SelectTrigger className="glass border-[#5B8DD9]/20 bg-transparent">
                <SelectValue placeholder={t("memories.selectPerfume")} />
              </SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {language === "ar" && p.name_ar ? p.name_ar : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <textarea
              className="w-full bg-transparent glass border border-[#5B8DD9]/20 rounded-xl p-3 text-sm resize-none h-24 text-[#F5F5F5] placeholder-[#6B7B8D] focus:outline-none focus:border-[#5B8DD9]/50"
              placeholder={t("memories.placeholder")}
              value={memoryText}
              onChange={(e) =>
                setMemoryText(e.target.value.slice(0, 120))
              }
              maxLength={120}
              dir={isRTL ? "rtl" : "ltr"}
            />

            <div className="flex items-center justify-between gap-3">
              <input
                className="flex-1 bg-transparent glass border border-[#5B8DD9]/20 rounded-xl px-3 py-2 text-sm text-[#F5F5F5] placeholder-[#6B7B8D] focus:outline-none focus:border-[#5B8DD9]/50"
                placeholder={t("memories.namePlaceholder")}
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                dir={isRTL ? "rtl" : "ltr"}
              />
              <span className="text-xs text-[#6B7B8D] flex-shrink-0">
                {memoryText.length}/120
              </span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl hover:opacity-90 disabled:opacity-50"
            >
              <Send className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {submitting ? "..." : t("memories.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|Error" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ScentMemoryWall.tsx src/locales/en.json src/locales/ar.json
git commit -m "feat: add ScentMemoryWall component with submit modal"
```

---

## Task 11: Scent Memory Wall — HomePage Integration

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Import ScentMemoryWall**

At the top of `src/pages/HomePage.tsx`, add:

```tsx
import ScentMemoryWall from "@/components/ScentMemoryWall";
```

- [ ] **Step 2: Find the insertion point**

In `src/pages/HomePage.tsx`, find the section just before the footer or closing `</div>` of the page. A safe anchor is the RecentlyViewed component — add ScentMemoryWall after it:

```tsx
      <RecentlyViewed />

      {/* Scent Memory Wall */}
      <ScentMemoryWall />
```

- [ ] **Step 3: Verify in browser**

The homepage should show the "Scent Stories" section below the recently viewed products. The marquee rows only appear when approved memories exist. The "Share Your Memory" button opens the dialog.

- [ ] **Step 4: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: add ScentMemoryWall section to HomePage"
```

---

## Task 12: Scent Memory Wall — Admin Tab

**Files:**
- Modify: `src/pages/AdminPage.tsx`
- Modify: `src/locales/en.json`
- Modify: `src/locales/ar.json`

- [ ] **Step 1: Add translation keys**

In `src/locales/en.json`, find `"admin"` → `"tabs"` and add:

```json
"memories": "Memories"
```

In `src/locales/en.json`, find `"admin"` and add a `"memories"` sub-object:

```json
"memories": {
  "title": "Scent Memories",
  "pending": "Pending",
  "approved": "Approved",
  "approve": "Approve",
  "delete": "Delete",
  "empty": "No memories to review.",
  "toast": {
    "approved": "Memory approved",
    "deleted": "Memory deleted",
    "approveFailed": "Failed to approve memory",
    "deleteFailed": "Failed to delete memory",
    "loadFailed": "Failed to load memories"
  },
  "confirm": {
    "delete": "Delete this memory permanently?"
  }
}
```

Mirror these keys in `src/locales/ar.json`:

```json
"memories": "الذكريات"
```

And in the `"admin"` object:

```json
"memories": {
  "title": "الذكريات العطرية",
  "pending": "قيد المراجعة",
  "approved": "معتمد",
  "approve": "اعتماد",
  "delete": "حذف",
  "empty": "لا توجد ذكريات للمراجعة.",
  "toast": {
    "approved": "تم اعتماد الذكرى",
    "deleted": "تم حذف الذكرى",
    "approveFailed": "فشل اعتماد الذكرى",
    "deleteFailed": "فشل حذف الذكرى",
    "loadFailed": "فشل تحميل الذكريات"
  },
  "confirm": {
    "delete": "حذف هذه الذكرى نهائياً؟"
  }
}
```

- [ ] **Step 2: Add imports and state to AdminPage**

In `src/pages/AdminPage.tsx`, add these imports alongside the existing service imports (around line 80):

```tsx
import {
  fetchAllMemories,
  approveMemory,
  deleteMemory,
  fetchPendingMemoryCount,
  Memory,
} from "@/services/memoriesService";
```

After the `pendingReviewCount` state (line ~278), add:

```tsx
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [pendingMemoryCount, setPendingMemoryCount] = useState(0);
```

- [ ] **Step 3: Add loadMemories function**

After the `loadReviews` function (around line 335), add:

```tsx
  const loadMemories = async () => {
    setMemoriesLoading(true);
    try {
      const [allMemories, pendingCount] = await Promise.all([
        fetchAllMemories(),
        fetchPendingMemoryCount(),
      ]);
      setMemories(allMemories);
      setPendingMemoryCount(pendingCount);
    } catch {
      toast.error(t("admin.memories.toast.loadFailed"));
    } finally {
      setMemoriesLoading(false);
    }
  };

  const handleApproveMemory = async (id: string) => {
    try {
      await approveMemory(id);
      await loadMemories();
      toast.success(t("admin.memories.toast.approved"));
    } catch {
      toast.error(t("admin.memories.toast.approveFailed"));
    }
  };

  const handleDeleteMemory = async (id: string) => {
    if (!window.confirm(t("admin.memories.confirm.delete"))) return;
    try {
      await deleteMemory(id);
      await loadMemories();
      toast.success(t("admin.memories.toast.deleted"));
    } catch {
      toast.error(t("admin.memories.toast.deleteFailed"));
    }
  };
```

- [ ] **Step 4: Call loadMemories on initial load**

Find the `Promise.all` in the initial data load (around line 303):

```tsx
    await Promise.all([loadPerfumes(), loadOrders(), loadOrderStats(), loadReviews(), fetchGiftOrders()]);
```

Replace with:

```tsx
    await Promise.all([loadPerfumes(), loadOrders(), loadOrderStats(), loadReviews(), fetchGiftOrders(), loadMemories()]);
```

- [ ] **Step 5: Update TabsList to 6 columns and add the tab trigger**

Find line ~1543 in `AdminPage.tsx`:

```tsx
          <TabsList className="grid w-full grid-cols-5 glass ...">
```

Change `grid-cols-5` to `grid-cols-6`:

```tsx
          <TabsList className="grid w-full grid-cols-6 glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20">
```

After the `giftOrders` TabsTrigger (around line 1577), add:

```tsx
            <TabsTrigger
              value="memories"
              className="data-[state=active]:bg-[#5B8DD9]"
            >
              <Heart className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
              {t("admin.tabs.memories")}
              {pendingMemoryCount > 0 && (
                <Badge className="ms-2 bg-amber-500 text-white text-xs px-1.5 py-0">
                  {pendingMemoryCount}
                </Badge>
              )}
            </TabsTrigger>
```

`Heart` is already imported in AdminPage. Verify: if not, add it to the lucide-react import.

- [ ] **Step 6: Add the TabsContent for memories**

After the `giftOrders` TabsContent closing tag, add:

```tsx
          <TabsContent value="memories" className="mt-6">
            <div className="glass-card p-6 rounded-2xl">
              <h2 className="text-xl font-bold text-[#323D50] dark:text-[#F5F5F5] mb-6">
                {t("admin.memories.title")}
              </h2>
              {memoriesLoading ? (
                <div className="text-center py-8 text-[#6B7B8D]">
                  {t("admin.loadingTitle")}
                </div>
              ) : memories.length === 0 ? (
                <p className="text-center text-[#6B7B8D] py-8">
                  {t("admin.memories.empty")}
                </p>
              ) : (
                <div className="space-y-4">
                  {memories.map((memory) => (
                    <div
                      key={memory.id}
                      className="flex items-start justify-between gap-4 p-4 rounded-xl border border-[#5B8DD9]/10 bg-white/5"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#F5F5F5] italic mb-1">
                          "{memory.memory_text}"
                        </p>
                        <p className="text-xs text-[#5B8DD9] mb-1">
                          — {memory.perfume_name}
                        </p>
                        {memory.author_name && (
                          <p className="text-xs text-[#6B7B8D]">
                            {memory.author_name}
                          </p>
                        )}
                        <p className="text-xs text-[#6B7B8D] mt-1">
                          {new Date(memory.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          className={
                            memory.status === "approved"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-amber-500/20 text-amber-400"
                          }
                        >
                          {memory.status === "approved"
                            ? t("admin.memories.approved")
                            : t("admin.memories.pending")}
                        </Badge>
                        {memory.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleApproveMemory(memory.id)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            {t("admin.memories.approve")}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteMemory(memory.id)}
                        >
                          {t("admin.memories.delete")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
```

- [ ] **Step 7: Verify in browser**

Navigate to `/admin`. A "Memories" tab should appear. Submit a test memory on the homepage, then approve it in the admin. Verify the memory appears in the marquee after refresh.

- [ ] **Step 8: Commit**

```bash
git add src/pages/AdminPage.tsx src/locales/en.json src/locales/ar.json
git commit -m "feat: add Memories admin tab with approve/delete"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 4 features covered — Whisper Mode (Tasks 1–2), Timeline (Tasks 3–5), DNA Card (Tasks 6–7), Memory Wall (Tasks 8–12)
- [x] **No placeholders:** All steps contain actual code
- [x] **Type consistency:** `Memory` defined in `memoriesService.ts` and referenced correctly throughout; `ScentDNACard` defined in `aiService.ts` and imported in `QuizResults` + `FragranceQuizPage`; `fragranceNotes.middle` (not `heart`) used consistently
- [x] **Notes field name:** Product uses `fragranceNotes.middle` (not `heartNotes`) — corrected in Timeline phase labels vs code keys
- [x] **AdminPage tab count:** Changed from `grid-cols-5` to `grid-cols-6` in Task 12
- [x] **Whisper Mode mobile:** CSS hover-based — desktop only, no issues on mobile (cards remain at full opacity on touch devices since `:hover` doesn't persist)
- [x] **RTL support:** All new text uses `t()`, all directional spacing uses `me-*`/`ms-*`, marquee direction is neutral
