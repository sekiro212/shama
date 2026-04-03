# "The Ritual" — Feature Design Spec

**Date:** 2026-04-03
**Project:** Shama Luxury Perfume E-commerce
**Goal:** Make visitors say "I've never seen a website like this" — through immersion, prestige, and personalization.

---

## Strategic Direction

Three target feelings in priority order:
1. **Wonder / Immersion** — feels cinematic, sensory, like stepping into a boutique
2. **Prestige / Luxury** — every interaction feels premium
3. **Hyper-personalization** — the site feels like it knows you (bonus layer)

---

## Features Overview

| # | Feature | Location | Complexity |
|---|---|---|---|
| 1 | Animated Fragrance Timeline | ProductPage — new "Journey" tab | Medium |
| 2 | Scent DNA Identity Card | QuizResults — section below recommendations | Medium |
| 3 | Whisper Mode | Global — Header toggle + CSS | Easy |
| 4 | Scent Memory Wall | HomePage — new section above footer | Medium |

All features are self-contained. Each can be built and shipped independently without touching the others.

---

## Feature 1: Animated Fragrance Timeline

### What it is
A visual, interactive timeline on the product page showing how a fragrance evolves from first spray to dry-down.

### Location
`ProductPage.tsx` — new "Journey" tab added alongside the existing Details / Notes / Reviews tabs.

### Visual layout
```
● ──────────────── ◉ ──────────────── ◆
Top Notes          Heart Notes        Base Notes
0 – 30 min         30 min – 2 hrs     2 hrs+
Bergamot, Lemon    Rose, Jasmine      Oud, Musk, Amber
```

### Interactions
- A shimmer/pulse animation travels left → right along the path continuously, representing diffusion
- Each node pulses gently via CSS keyframe
- Clicking a node expands it to show the notes list + a one-line AI-generated description of that phase
- A drag handle lets users scrub through time; background hue shifts from bright citrus tones (top) to warm gold (base)

### AI
One Gemini call per product on first tab open: given the product name and its notes for each phase, generate a one-sentence poetic description per phase (e.g. *"A bright citrus opening that announces your arrival"*). Result cached in component state for the session.

### Data
No DB changes required. Uses existing `top_notes`, `heart_notes`, `base_notes` fields already on the `perfumes` table.

### New files
- `src/components/FragranceTimeline.tsx`

### Bilingual
All phase labels and AI descriptions requested in the current active language (`language` from `useLanguage()`).

---

## Feature 2: Scent DNA Identity Card

### What it is
After completing the fragrance quiz, the user receives a beautiful shareable "Fragrance Personality Card" showing their scent archetype, dominant note families, and signature notes.

### Location
`src/components/quiz/QuizResults.tsx` — new section rendered below the 3 product recommendations.

### Visual layout
```
┌─────────────────────────────────────────┐
│  ✦ SHAMA FRAGRANCE IDENTITY             │
│                                         │
│  You are                                │
│  "The Desert Wanderer"                  │
│                                         │
│  ████ Oriental  ██ Woody  █ Fresh       │
│                                         │
│  Signature Notes: Oud · Amber · Vetiver │
│  Best worn: Evening · Autumn · Winter   │
│                                         │
│  [ Download Card ]  [ Share ]           │
└─────────────────────────────────────────┘
```

### AI
One Gemini call added to the existing `getQuizRecommendations` flow in `aiService.ts`. The call receives the quiz answers and returns:
```json
{
  "archetype": "The Desert Wanderer",
  "archetypeAr": "مسافر الصحراء",
  "dominantFamilies": { "Oriental": 60, "Woody": 30, "Fresh": 10 },
  "signatureNotes": ["Oud", "Amber", "Vetiver"],
  "bestWorn": { "time": "Evening", "season": "Autumn" }
}
```
Archetype names should be poetic and evocative (e.g. *"The Midnight Bloom"*, *"The Silk Road Dreamer"*, *"The Ocean Philosopher"*).

### Download / Share
- `html-to-image` library renders the card div to a PNG
- **Download:** triggers a file download of the PNG
- **Share:** copies the PNG + a pre-written caption to clipboard, ready for Instagram/WhatsApp

### Styling
Uses existing brand colors (`#5B8DD9` / `#3E6BB5`) on dark background (`#1a2235`). The DNA bars animate in from zero width on mount.

### No DB changes
Card is generated fresh from quiz answers each time. Nothing stored.

### New files
- No new files — extend `QuizResults.tsx` and `aiService.ts`

---

## Feature 3: Whisper Mode

### What it is
A global focus mode toggle. When active, all product cards dim except the one the cursor is hovering — like a spotlight in a dark gallery.

### Location
- Toggle button in `Header.tsx` (next to the existing dark/light mode toggle)
- `isWhisperMode` boolean in a React context (can reuse or extend existing context)
- `whisper-mode` class toggled on `<body>`

### Behavior
```
Normal mode:   [Card] [Card] [Card] [Card]   ← all fully visible

Whisper mode:  [dim]  [GLOW] [dim]  [dim]   ← only hovered card is alive
                       ↑ cursor here
```

- All `.product-card` elements dim to ~20% opacity
- Hovered card returns to full opacity + gets a soft animated border glow (`box-shadow` pulse)
- Navbar fades to minimal — logo stays bright, links dim slightly
- A small `"Whisper Mode"` pill label appears fixed in the bottom-left corner while active
- Clicking the toggle again exits the mode; all opacities restore with a smooth transition

### Implementation
- ~40 lines total
- CSS: `.whisper-mode .product-card { opacity: 0.2; transition: opacity 0.4s }` + `.whisper-mode .product-card:hover { opacity: 1; box-shadow: 0 0 20px rgba(91,141,217,0.5) }`
- Header toggle icon: a simple eye/feather icon from lucide-react

### No DB changes, no new files
Extend `Header.tsx` and add a small CSS block to `index.css`.

---

## Feature 4: Scent Memory Wall

### What it is
A community section on the homepage where users share one-sentence memories tied to a Shama fragrance. Cards drift across the screen in a slow infinite marquee.

### Location
`src/pages/HomePage.tsx` — new section inserted between the product grid and the footer.

### Visual layout
Two rows of cards moving in opposite directions (infinite marquee):
```
→  "This smells like my grandmother's garden" — Oud Royal
←  "My mother wore this every Friday"          — Rose Silk
→  "Wedding night in Dubai"                    — Amber Nights
```

Each card: memory text + fragrance name. No user names shown (privacy-first).

### Submit flow
- "Share Your Memory" button opens a modal
- User picks a fragrance (dropdown of active products) and writes one sentence (max 120 characters)
- Optional: first name only
- No login required
- Submitted to `memories` table with `status: 'pending'`
- Admin approves in AdminPage (new "Memories" tab, same pattern as existing Reviews tab)
- Approved memories appear on the wall in real time

### New DB table
```sql
create table memories (
  id uuid primary key default gen_random_uuid(),
  perfume_id uuid references perfumes(id),
  perfume_name text not null,
  memory_text text not null,
  author_name text,
  status text default 'pending',
  created_at timestamptz default now()
);

-- RLS: public can insert (pending), only authenticated admin can update status
```

### Animation
CSS infinite marquee — two `<div>` rows with `animation: marquee 40s linear infinite` and `animation-direction: reverse` on the second row. No JS animation library needed.

### New files
- `src/components/ScentMemoryWall.tsx` — wall display + submit modal
- `src/services/memoriesService.ts` — `fetchApprovedMemories`, `submitMemory`, `approveMemory`, `fetchPendingMemoryCount`

### Admin
New "Memories" tab in `AdminPage.tsx` following the exact same pattern as the existing Reviews tab.

### Bilingual
Submit modal and all labels use `t()` keys. Memory text submitted as-is (user's own language).

---

## Build Order

1. **Whisper Mode** — easiest, ships in an afternoon, immediately impressive
2. **Fragrance Timeline** — medium effort, high editorial impact
3. **Scent DNA Card** — medium effort, highest viral potential
4. **Scent Memory Wall** — requires DB migration + admin work, build last

---

## What is NOT in scope
- Any changes to existing features
- Mobile-specific gesture support (whisper mode is desktop-only for hover)
- User accounts required for Memory Wall submissions
- Storing DNA card results in the database
