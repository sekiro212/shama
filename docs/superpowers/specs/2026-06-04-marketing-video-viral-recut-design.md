# Marketing Video — Viral Recut (Design)

**Date:** 2026-06-04
**Component:** `src/remotion/` (Remotion compositions `ShamaVideo-EN` / `ShamaVideo-AR`)
**Surface:** Homepage `MarketingVideoSection` (plays pre-rendered `public/shama-{en,ar}.mp4`) + social export (TikTok / Instagram Reels).

## Goal

Recut the existing 33s brand film into a ~24s, **hook-first**, scroll-stopping vertical (1080×1920) video that:
- Works **sound-off** (homepage autoplays muted) AND sound-on (tap-to-unmute, social feed).
- Is fully **bilingual** EN + AR with correct **RTL/LTR** handling.
- Keeps the **dark-luxury** aesthetic but adds depth and real motion.
- Loops **seamlessly**.

## Decisions (user-approved)

- Distribution: **homepage + social**.
- Length: **tighten to ~24s** (hook-first).
- Voiceover: **regenerate** bilingual VO to match new copy.
- Visual style: **elevate current luxury** (depth, transitions, kinetic text, product motion).

## Constraints discovered (must respect)

1. **On-screen text and spoken VO are separate assets.** On-screen lives in `src/remotion/i18n.ts`; spoken script lives in `scripts/generate-voiceover-openrouter.mjs` (`SCRIPT`). They must be edited **in sync**, or what is shown desyncs from what is said.
2. **VO MP3s are fixed-length**, generated to fit `TARGET` seconds per scene. Retiming requires regenerating VO + re-fitting (`scripts/fit-voiceover.mjs`).
3. **Homepage plays muted by default** (`MarketingVideoSection.tsx`). On-screen text must carry the whole message sound-off.
4. **Nothing ships until re-render.** The homepage plays the two committed mp4s, not the source. Must re-render and replace `public/shama-{en,ar}.mp4`.
5. `@remotion/transitions` is installed but **unused**.
6. Render works in this environment (Chromium Headless Shell downloaded; smoke still rendered clean). VO regen works (`ffmpeg` present, `VITE_OPENROUTER_API_KEY` present, OpenRouter `openai/gpt-audio`).

## The recut — 6 beats (~24s)

Quiz scene **dropped from the cut** (redundant with AI Finder — both are "discover your scent"). File retained but unlinked from `Video.tsx`.

| # | Beat | Spoken + on-screen (synced) | Psychology lever |
|---|------|------------------------------|------------------|
| 1 | Hook/Problem | "Buying perfume blind? 500 LYD on a guess." | Loss aversion, rhetorical hook, frame-0 impact |
| 2 | Solution | "Try first. From 3ml." | Reframe, zero-risk (zero-price / endowment) |
| 3 | AI Finder | "Type what you want. We find it." | The wow / differentiator |
| 4 | Product | "Real perfumes. Fair prices. A sample in every bottle." | Proof + product beauty (anchoring on full-bottle price) |
| 5 | Delivery | "Vanex to your door. 48 hours." | Local trust, present bias |
| 6 | CTA | "shama.ly — Find your scent." | Action; visually loops back to hook |

## Visual system

- **`SceneBackdrop`** (new, reused): animated radial blue→gold glow + film grain + soft vignette over `#0A0A0A`. Removes dead black, adds depth on every scene.
- **`TransitionSeries`** with short (8–12 frame) fade/slide transitions between scenes — replaces independent per-scene opacity fades.
- **`KineticText`** (new): headline reveal via clip-path/translate mask (never per-character opacity, per Remotion text-animations rule).
- **`LightSweep`** (new): gold light sweep across hero text / product — premium signature.
- **Product motion**: slow float + scale (ken-burns) + glow instead of plain crossfade.
- **Gold particles** extended tastefully beyond CTA.

## Sound-off, loop, platform

- On-screen headline **is** the caption layer; keep punchy + legible. No redundant caption band.
- **Seamless loop**: CTA's final frames settle to the same backdrop state the Hook opens on → no jarring cut under `<video loop>`.
- **Safe zones**: all key content centered within a safe margin so TikTok/Reels right-rail + bottom UI never covers it.

## Architecture

- **Audio decoupled from visuals.** Move per-scene `<Audio>` out of scene components into `Video.tsx` at computed timeline offsets. `TransitionSeries` overlaps then affect visuals only; VO clips never double up. Continuous background music stays at timeline level.
- `timing.ts`: 6-scene durations, transition-overlap constant, computed absolute scene-start offsets, `TOTAL_FRAMES`. `Root.tsx` reads `TOTAL_FRAMES`.
- Scenes use the sequence's `useVideoConfig().durationInFrames` for exit timing instead of hardcoded frame counts (robust to retiming).
- `i18n.ts`: rewritten copy EN + AR.
- VO `SCRIPT` + `TARGET` rewritten to match new copy + new per-scene budgets.
- Full **RTL audit** per changed scene: `dir`/`isRtl`, reversed flex, `marginInline`, Arabic-Indic numerals via `formatPrice`, LTR islands for prices / ml / URL / handles / ⌘K.

## Verification

1. Render stills across all 6 scenes for EN + AR; review images; fix.
2. Full render both compositions; replace `public/shama-{en,ar}.mp4`.
3. `tsc -b` clean.
4. Spot-check homepage `MarketingVideoSection` still references the two mp4 paths (unchanged).

## Risks / mitigations

- **VO regen failure / off delivery** for a scene → keep that scene's existing MP3 and adjust its `TARGET`/timing.
- **Render time** (~24s × 2 langs @ 1080×1920) → a few minutes each; acceptable.
- **TransitionSeries + audio**: mitigated by decoupling audio to the timeline.
