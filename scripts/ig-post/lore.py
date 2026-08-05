#!/usr/bin/env python3
"""
lore.py — "which perfume would this character wear" Instagram post.

A different animal from generate.py: that one sells a product (price, sizes,
add-to-bag). This one is editorial — a character, a scent, and the line that
connects them. No price, no CTA, so it reads as a story rather than an advert.

  python3 scripts/ig-post/lore.py <config.json> [out.html]

The config carries the character and copy; the product (bottle photo, notes,
Arabic name) is pulled live from Supabase by slug, so the notes on the slide
can never drift from the catalogue.

Deliberately ships NO character artwork: game/film art is owned by its studio
and reposting it on a commercial account invites a takedown. The palette and
the words carry the reference instead.
"""
import base64
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request

from PIL import Image


def load_env(path):
    out = {}
    for line in open(path):
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*)", line)
        if m:
            out[m.group(1)] = m.group(2).strip().strip("\"'")
    return out


def fetch_product(base, key, slug):
    q = urllib.parse.urlencode({
        "slug": f"eq.{slug}",
        "select": "name,name_ar,size,image,fragrance_notes,fragrance_notes_ar",
        "limit": "1",
    }, safe="(),.*")
    req = urllib.request.Request(base.rstrip("/") + "/rest/v1/perfumes?" + q,
                                 headers={"apikey": key, "Authorization": "Bearer " + key})
    rows = json.load(urllib.request.urlopen(req, timeout=30))
    if not rows:
        sys.exit(f"no product with slug {slug}")
    return rows[0]


def data_uri(url):
    raw = urllib.request.urlopen(url, timeout=30).read()
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    im.thumbnail((1100, 1100))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=88)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


TEMPLATE = """<meta charset="utf-8"><title>{TITLE}</title>
<style>
  /* System fonts only, matching generate.py. A webfont @import made the first
     element screenshot race the font load and capture a shifting layout. */
  *{{ box-sizing:border-box; margin:0; padding:0; }}
  body{{ background:#0b0708; font-family:system-ui,-apple-system,sans-serif; display:flex;
        flex-direction:column; align-items:center; gap:18px; padding:26px 0 40px; }}
  /* Slides stack VERTICALLY on purpose. A horizontal rail overflows to ~3300px
     once render.cjs forces each slide to 1080px, and the element screenshot then
     captures a box sized from the override while the content still paints at the
     pre-override width. A column has no horizontal overflow, so capture is exact. */
  .rail{{ display:flex; flex-direction:column; gap:16px; padding:4px 22px 12px; }}
  .post{{ flex:0 0 auto; width:min(92vw,1080px); aspect-ratio:1/1; container-type:inline-size;
         position:relative; overflow:hidden; border-radius:14px;
         background:radial-gradient(120% 100% at 50% 0%, {G0} 0%, {G1} 55%, {G2} 100%);
         color:{INK}; }}
  .post::after{{ content:""; position:absolute; inset:3cqw; border:1px solid {BRD};
                border-radius:10px; pointer-events:none; }}
  .inner{{ position:relative; z-index:1; height:100%; padding:6.4cqw 6.8cqw;
          display:flex; flex-direction:column; }}
  .top{{ display:flex; align-items:center; justify-content:space-between; }}
  .logo .n{{ font-family:Georgia,serif; font-weight:700; font-size:4.4cqw; line-height:1; }}
  .logo .s{{ font-size:2.2cqw; letter-spacing:.06em; color:{SOFT}; margin-top:.7cqw; }}
  .tagsm{{ font-size:2.2cqw; letter-spacing:.34em; color:{ACC}; text-transform:uppercase; }}

  /* slide 1 — the question */
  .who{{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:2.4cqw; }}
  .kicker{{ font-size:2.5cqw; letter-spacing:.36em; text-transform:uppercase; color:{ACC}; }}
  .name{{ font-family:Georgia,'Hoefler Text',serif; font-weight:600;
         font-size:{NAMESIZE}cqw; line-height:.98; letter-spacing:-.01em; }}
  .epithet{{ font-family:Georgia,'Hoefler Text',serif; font-style:italic;
            font-weight:300; font-size:4.4cqw; color:{SOFT}; }}
  .q{{ font-size:3cqw; line-height:1.6; color:{SOFT}; max-width:74%; }}
  .quote{{ font-family:Georgia,'Hoefler Text',serif; font-style:italic;
          font-size:3.4cqw; line-height:1.5; color:{INK}; border-inline-start:2px solid {ACC};
          padding-inline-start:3cqw; }}

  /* slide 2 — the scent */
  .bottlewrap{{ flex:1; display:flex; align-items:center; justify-content:center;
               position:relative; min-height:0; margin:1cqw 0; }}
  .glow{{ position:absolute; width:78%; aspect-ratio:1; border-radius:50%;
         background:radial-gradient(circle,{GLOW0} 0%,{GLOW1} 45%,transparent 70%); }}
  .bottle{{ position:relative; height:100%; max-height:52cqw; width:auto; object-fit:contain;
           border-radius:8px; box-shadow:0 26px 50px -26px rgba(0,0,0,.85); }}
  .pname{{ text-align:center; }}
  .pname .h{{ font-size:2.6cqw; letter-spacing:.34em; text-transform:uppercase; color:{ACC}; }}
  .pname .t{{ font-family:Georgia,'Hoefler Text',serif; font-style:italic;
             font-size:6.4cqw; line-height:1.05; margin-top:1cqw; }}
  .pname .ar{{ font-size:3cqw; color:{SOFT}; margin-top:1cqw; }}

  /* slide 3 — why */
  .why{{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:3.2cqw; }}
  .line{{ font-family:Georgia,'Hoefler Text',serif; font-size:4cqw; line-height:1.42; }}
  .line.ar{{ font-family:system-ui,-apple-system,sans-serif; font-size:3.2cqw; line-height:1.75; color:{SOFT};
            direction:rtl; }}
  .notes{{ display:flex; flex-wrap:wrap; gap:1.6cqw; }}
  .chip{{ font-size:2.4cqw; letter-spacing:.06em; padding:1.4cqw 2.6cqw; border-radius:999px;
         border:1px solid {BRD}; color:{SOFT}; }}
  .foot{{ display:flex; align-items:center; justify-content:space-between;
         font-size:2.4cqw; color:{SOFT}; }}
  .foot .g{{ width:2.2cqw; height:2.2cqw; border-radius:50%; background:{ACC};
            display:inline-block; margin-inline-end:1.2cqw; }}
  .dots{{ display:flex; gap:7px; }}
  .dots i{{ width:7px; height:7px; border-radius:50%; background:#6b5158; opacity:.5; }}
  .hint{{ color:#7a636a; font-size:12px; }}
</style>
<div class="rail">

  <div class="post"><div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <span class="tagsm">{SERIES}</span></div>
    <div class="who">
      <div class="kicker">{KICKER}</div>
      <div class="name">{CHAR}</div>
      <div class="epithet">{EPITHET}</div>
      <div class="quote">{QUOTE}</div>
      <div class="q">{QUESTION}</div>
    </div>
    <div class="foot"><span>اسحب · swipe →</span><span>01 / 03</span></div>
  </div></div>

  <div class="post"><div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <span class="tagsm">02 / 03</span></div>
    <div class="bottlewrap"><div class="glow"></div>
      <img class="bottle" src="{IMG}" alt="{PNAME}" /></div>
    <div class="pname">
      <div class="h">{HOUSE}</div>
      <div class="t">{PSHORT}</div>
      <div class="ar">{PNAME_AR}</div>
    </div>
  </div></div>

  <div class="post"><div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <span class="tagsm">03 / 03</span></div>
    <div class="why">
      <div class="line">{WHY_EN}</div>
      <div class="notes">{CHIPS}</div>
      <div class="line ar">{WHY_AR}</div>
    </div>
    <div class="foot"><span><span class="g"></span>shama.ly</span><span>{SIZE}</span></div>
  </div></div>

</div>
<div class="dots"><i></i><i></i><i></i></div>
<p class="hint">lore post · 3 slides · 1080 × 1080</p>
"""


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python lore.py <config.json> [out.html]")
    cfg = json.load(open(sys.argv[1]))
    here = os.path.dirname(os.path.abspath(__file__))
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        here, "out", cfg.get("slug_out", "lore-post") + ".html")
    os.makedirs(os.path.dirname(out), exist_ok=True)

    repo = os.path.abspath(os.path.join(here, "..", ".."))
    env = load_env(os.path.join(repo, ".env"))
    p = fetch_product(env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"], cfg["product_slug"])

    notes = p.get("fragrance_notes") or {}
    picked = cfg.get("note_chips") or (notes.get("top", []) + notes.get("middle", []))[:6]
    chips = "".join(f'<span class="chip">{c}</span>' for c in picked)

    full = p["name"]
    house = cfg.get("house") or " ".join(full.split()[:2])
    pshort = full[len(house):].strip() if full.startswith(house) else full

    name = cfg["character"]
    html = TEMPLATE.format(
        TITLE=f'{name} — Shama', SERIES=cfg.get("series", "SCENT PROFILE"),
        KICKER=cfg.get("kicker", "IF SHE WORE A PERFUME"),
        CHAR=name, EPITHET=cfg.get("epithet", ""), QUOTE=cfg.get("quote", ""),
        QUESTION=cfg.get("question", ""),
        NAMESIZE=cfg.get("name_size", 11),
        IMG=data_uri(p["image"]), PNAME=full, HOUSE=house.upper(), PSHORT=pshort,
        PNAME_AR=p.get("name_ar") or "", SIZE=(p.get("size") or "").upper(),
        WHY_EN=cfg["why_en"], WHY_AR=cfg["why_ar"], CHIPS=chips,
        **cfg["palette"],
    )
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"OK  {name} -> {p['name']}")
    print(f"    wrote {out}  ({len(html)//1024} KB)")


if __name__ == "__main__":
    main()
