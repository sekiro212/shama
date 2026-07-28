# Shama Instagram post generator

Generate a 3-slide square (1080×1080) Instagram carousel for **any product** in the
store. The palette is sampled from the product's own photo, so every post matches its
bottle — dark & moody or light & warm, with an accent pulled from the dominant colour.

## Use

```bash
python scripts/ig-post/generate.py "<slug-or-name>"          # e.g. "elie-saab-le-parfum"
python scripts/ig-post/generate.py "Elie Saab Le Parfum"     # product name also works
python scripts/ig-post/generate.py "<slug-or-name>" out.html # custom output path
```

Output lands in `scripts/ig-post/out/<slug>.html` (self-contained — the image is embedded
as a data URI). Open it in a browser, or publish it as an Artifact, then screenshot each
of the three 1080×1080 slides and post them as a carousel.

The command prints the mood (light/dark) and the accent hex it derived, e.g.:

```
OK  Xerjoff Casamorati Italica
    mood=light  accent=#A57545  ground=#F6F2ED→#DDC6AF
```

## What each slide holds

1. **Cover** — bottle on a photo-matched ground, house + name (EN / display / Arabic), swipe cue
2. **رحلة العطر** — the fragrance's Top / Heart / Base notes as glass cards on an accent spine
3. **Offer** — sample sizes (if any) as a size selector, big price + `@shama.ly` + CTA

All copy comes straight from the database (name, `fragrance_notes`, price, `perfume_samples`).
A product with no samples shows its description instead of the size selector.

## Requirements

- Python 3 with **Pillow** (`pip install pillow`)
- The repo `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (already present)

## Notes

- Uses the Supabase REST API with the anon key — read-only, no writes.
- The design mirrors the site: dark navy glassmorphism vibe, blue/accent gradients, gold
  micro-labels, "Shama · عطور فاخرة" header. For a light-photo product it flips to a warm
  light treatment automatically.
- To tweak the look for everyone, edit `TEMPLATE` / `build_tokens()` in `generate.py`.
