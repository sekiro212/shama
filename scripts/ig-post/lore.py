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

Artwork: pass `character_image` to place a portrait behind slide 1's copy.
Use original or licensed art — a studio's official game/film art on a
commercial account invites a takedown. Omit the field and the palette and
words carry the reference alone.

Set `"rtl": true` for a fully Arabic edition of the same post.
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


TRIBUTE = """<meta charset="utf-8"><title>{TITLE}</title>
<style>
  *{{ box-sizing:border-box; margin:0; padding:0; }}
  body{{ background:#0b0708; font-family:system-ui,-apple-system,sans-serif; display:flex;
        flex-direction:column; align-items:center; gap:18px; padding:26px 0 40px; }}
  .rail{{ display:flex; flex-direction:column; gap:16px; padding:4px 22px 12px; }}
  .post{{ flex:0 0 auto; width:min(92vw,1080px); aspect-ratio:1/1; container-type:inline-size;
         position:relative; overflow:hidden; border-radius:14px;
         background:radial-gradient(120% 100% at 50% 0%, {G0} 0%, {G1} 55%, {G2} 100%);
         color:{INK}; }}
  .post.rtl{{ direction:rtl; }}
  .post::after{{ content:""; position:absolute; inset:3cqw; border:1px solid {BRD};
                border-radius:10px; pointer-events:none; }}
  .art{{ position:absolute; inset:0; background-size:cover; background-position:center top;
        filter:saturate(.85); }}
  .art::after{{ content:""; position:absolute; inset:0;
               background:linear-gradient(180deg, rgba(0,0,0,.34) 0%, {G1}d9 48%, {G2} 84%); }}
  .inner{{ position:relative; z-index:1; height:100%; padding:6.4cqw 6.8cqw;
          display:flex; flex-direction:column; }}
  .top{{ display:flex; align-items:center; justify-content:space-between; }}
  .logo .n{{ font-family:Georgia,serif; font-weight:700; font-size:4.4cqw; line-height:1; }}
  .logo .s{{ font-size:2.2cqw; letter-spacing:.06em; color:{SOFT}; margin-top:.7cqw; }}
  .pg{{ direction:ltr; unicode-bidi:isolate; font-size:2.2cqw; letter-spacing:.3em; color:{ACC}; }}
  .body{{ flex:1; display:flex; flex-direction:column; justify-content:flex-end; gap:2.6cqw;
         padding-bottom:1cqw; }}
  .mid{{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:4cqw;
        text-align:center; }}
  .name{{ font-size:{NAMESIZE}cqw; font-weight:700; line-height:1.05; }}
  .epithet{{ font-size:4cqw; color:{SOFT}; }}
  .dates{{ font-size:2.8cqw; letter-spacing:.28em; color:{ACC}; direction:ltr;
          unicode-bidi:isolate; }}
  .quote{{ font-size:5.2cqw; font-weight:600; line-height:1.5; }}
  .para{{ font-size:3.1cqw; line-height:1.85; color:{SOFT}; }}
  .mark{{ display:flex; align-items:center; justify-content:center; gap:2cqw;
         font-size:2.6cqw; color:{SOFT}; }}
  .rule{{ height:1px; background:{BRD}; margin:1cqw 0; }}
  .hint{{ color:#7a636a; font-size:12px; }}
</style>
<div class="rail">

  <div class="post {RTL}">{ART}<div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <span class="pg">01 / 03</span></div>
    <div class="body">
      <div class="dates">{DATES}</div>
      <div class="name">{CHAR}</div>
      <div class="epithet">{EPITHET}</div>
    </div>
  </div></div>

  <div class="post {RTL}"><div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <span class="pg">02 / 03</span></div>
    <div class="mid"><div class="quote">{QUOTE}</div></div>
  </div></div>

  <div class="post {RTL}"><div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <span class="pg">03 / 03</span></div>
    <div class="mid"><div class="para">{BODY}</div></div>
    <div class="rule"></div>
    <div class="mark">{MARK}</div>
  </div></div>

</div>
<p class="hint">tribute · 3 slides · 1080 × 1080 · no product</p>
"""


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


def _encode(im, box=1100, quality=88):
    im = im.convert("RGB")
    im.thumbnail((box, box))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def data_uri(url):
    raw = urllib.request.urlopen(url, timeout=30).read()
    return _encode(Image.open(io.BytesIO(raw)))


def local_uri(path):
    return _encode(Image.open(path), box=1300, quality=86)


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

  /* optional character portrait on slide 1, behind a scrim so copy stays legible.
     art_position moves the cover-crop window (a real face wants to sit high, above
     the copy block); art_scrim swaps the gradient when the default buries it. */
  .art{{ position:absolute; inset:0; background-size:cover; background-position:{ARTPOS}; }}
  .art::after{{ content:""; position:absolute; inset:0; background:{ARTSCRIM}; }}
  .post.rtl{{ direction:rtl; }}
  .post.rtl .q, .post.rtl .line{{ direction:rtl; }}

  /* slide 1 — the question */
  .who{{ flex:1; display:flex; flex-direction:column; justify-content:flex-end; gap:2.4cqw;
        padding-bottom:2cqw; }}
  .kicker{{ font-size:2.5cqw; letter-spacing:.36em; text-transform:uppercase; color:{ACC}; }}
  .name{{ font-family:Georgia,'Hoefler Text',serif; font-weight:600;
         font-size:{NAMESIZE}cqw; line-height:.98; letter-spacing:-.01em; }}
  .epithet{{ font-family:Georgia,'Hoefler Text',serif; font-style:italic;
            font-weight:300; font-size:4.4cqw; color:{SOFT}; }}
  .q{{ font-size:3cqw; line-height:1.6; color:{SOFT}; max-width:74%; }}
  .quote{{ font-family:Georgia,'Hoefler Text',serif; font-style:italic;
          font-size:3.4cqw; line-height:1.5; color:{INK}; border-inline-start:2px solid {ACC};
          padding-inline-start:3cqw; }}

  /* slide 2 — the scent(s). Two products render side by side, each with its own
     caption, so a character can be split across a pair (the blade / the bloom). */
  .bottlewrap{{ flex:1; display:flex; align-items:center; justify-content:center;
               position:relative; min-height:0; margin:1cqw 0; gap:4cqw; }}
  .duo{{ display:flex; align-items:flex-end; justify-content:center; gap:5cqw;
        width:100%; height:100%; }}
  .one{{ display:flex; flex-direction:column; align-items:center; justify-content:flex-end;
        gap:2cqw; height:100%; flex:1; min-width:0; }}
  .one img{{ max-height:40cqw; width:auto; object-fit:contain; border-radius:8px;
            box-shadow:0 22px 44px -24px rgba(0,0,0,.85); }}
  .one .cap{{ font-family:Georgia,'Hoefler Text',serif; font-style:italic;
             font-size:3.6cqw; line-height:1.15; text-align:center; }}
  .one .sub{{ font-size:2.3cqw; letter-spacing:.2em; text-transform:uppercase;
             color:{ACC}; text-align:center; }}
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
  /* Numerals stay LTR: in an RTL box the bidi algorithm renders "01 / 03" as "03 / 01". */
  .pg{{ direction:ltr; unicode-bidi:isolate; }}
  .foot .g{{ width:2.2cqw; height:2.2cqw; border-radius:50%; background:{ACC};
            display:inline-block; margin-inline-end:1.2cqw; }}
  .dots{{ display:flex; gap:7px; }}
  .dots i{{ width:7px; height:7px; border-radius:50%; background:#6b5158; opacity:.5; }}
  .hint{{ color:#7a636a; font-size:12px; }}
</style>
<div class="rail">

  <div class="post {RTL}">{ART}<div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <span class="tagsm">{SERIES}</span></div>
    <div class="who">
      <div class="kicker">{KICKER}</div>
      <div class="name">{CHAR}</div>
      <div class="epithet">{EPITHET}</div>
      <div class="quote">{QUOTE}</div>
      <div class="q">{QUESTION}</div>
    </div>
    <div class="foot"><span>اسحب · swipe {ARROW}</span><span class="pg">01 / 03</span></div>
  </div></div>

  <div class="post {RTL}"><div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <span class="tagsm pg">02 / 03</span></div>
    <div class="bottlewrap"><div class="glow"></div>{BOTTLES}</div>
    {PNAMEBLOCK}
  </div></div>

  <div class="post {RTL}"><div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <span class="tagsm pg">03 / 03</span></div>
    <div class="why">
      <div class="line">{WHY_EN}</div>
      <div class="notes">{CHIPS}</div>
      <div class="line ar">{WHY_AR}</div>
    </div>
    <div class="foot"><span><span class="g"></span>shama.ly</span><span class="pg">{SIZE}</span></div>
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

    if cfg.get("mode") == "tribute":
        art = ""
        if cfg.get("character_image"):
            ip = cfg["character_image"]
            if not os.path.isabs(ip):
                ip = os.path.join(here, "lore", ip)
            art = f'<div class="art" style="background-image:url({local_uri(ip)})"></div>'
        html = TRIBUTE.format(
            TITLE=f'{cfg["character"]} — Shama', ART=art,
            RTL="rtl" if cfg.get("rtl") else "",
            CHAR=cfg["character"], EPITHET=cfg.get("epithet", ""),
            DATES=cfg.get("dates", ""), QUOTE=cfg.get("quote", ""),
            BODY=cfg.get("body", ""), MARK=cfg.get("mark", ""),
            NAMESIZE=cfg.get("name_size", 11), **cfg["palette"])
        with open(out, "w", encoding="utf-8") as f:
            f.write(html)
        print(f'OK  {cfg["character"]} (tribute)')
        print(f"    wrote {out}  ({len(html)//1024} KB)")
        return

    slugs = cfg["product_slug"]
    if isinstance(slugs, str):
        slugs = [slugs]
    prods = [fetch_product(env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"], sg)
             for sg in slugs]
    p = prods[0]

    notes = p.get("fragrance_notes") or {}
    picked = cfg.get("note_chips") or (notes.get("top", []) + notes.get("middle", []))[:6]
    chips = "".join(f'<span class="chip">{c}</span>' for c in picked)

    def short(prod):
        f = prod["name"]
        h = cfg.get("house") or " ".join(f.split()[:2])
        return f[len(h):].strip() if f.startswith(h) else f

    caps = cfg.get("product_captions") or []
    if len(prods) == 1:
        bottles = f'<img class="bottle" src="{data_uri(p["image"])}" alt="{p["name"]}" />'
        pnameblock = (f'<div class="pname"><div class="h">{(cfg.get("house") or "").upper()}</div>'
                      f'<div class="t">{short(p)}</div>'
                      f'<div class="ar">{p.get("name_ar") or ""}</div></div>')
    else:
        cells = ""
        for i, pr in enumerate(prods):
            cap = caps[i] if i < len(caps) else ""
            cells += (f'<div class="one"><img src="{data_uri(pr["image"])}" alt="{pr["name"]}" />'
                      f'<div class="sub">{cap}</div>'
                      f'<div class="cap">{short(pr)}</div></div>')
        bottles = f'<div class="duo">{cells}</div>'
        pnameblock = (f'<div class="pname"><div class="h">'
                      f'{(cfg.get("house") or "").upper()}</div></div>')

    full = p["name"]
    house = cfg.get("house") or " ".join(full.split()[:2])
    pshort = short(p)

    art_html = ""
    if cfg.get("character_image"):
        ipath = cfg["character_image"]
        if not os.path.isabs(ipath):
            ipath = os.path.join(here, "lore", ipath)
        art_html = f'<div class="art" style="background-image:url({local_uri(ipath)})"></div>'

    name = cfg["character"]
    html = TEMPLATE.format(
        TITLE=f'{name} — Shama', SERIES=cfg.get("series", "SCENT PROFILE"),
        KICKER=cfg.get("kicker", "IF SHE WORE A PERFUME"),
        CHAR=name, EPITHET=cfg.get("epithet", ""), QUOTE=cfg.get("quote", ""),
        QUESTION=cfg.get("question", ""),
        NAMESIZE=cfg.get("name_size", 11),
        ART=art_html, RTL="rtl" if cfg.get("rtl") else "",
        ARTPOS=cfg.get("art_position", "center top"),
        ARTSCRIM=cfg.get(
            "art_scrim",
            "linear-gradient(180deg, rgba(0,0,0,.30) 0%, {G1}cc 46%, {G2} 82%)"
        ).format(**cfg["palette"]),
        ARROW="←" if cfg.get("rtl") else "→",
        BOTTLES=bottles, PNAMEBLOCK=pnameblock,
        PNAME=full, HOUSE=house.upper(), PSHORT=pshort,
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
