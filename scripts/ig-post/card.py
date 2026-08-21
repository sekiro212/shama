#!/usr/bin/env python3
"""
Single-slide lore card — one character, one image, one post.

The 3-slide carousel buries the character behind a swipe. For a cast series
(one post per Nightfarer, per house, per crew member) a single 4:5 card puts
the whole idea in the feed at full height, which is what gets stopped on.

    python3 scripts/ig-post/card.py scripts/ig-post/lore/wylder.json
    node scripts/ig-post/render.cjs card-wylder

Configs are the same shape as lore/*.json. `art_svg` inlines original artwork
(no raster round-trip, so it stays crisp at 2160px); `character_image` still
works when a supplied portrait is used instead.
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

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))


def load_env(path):
    out = {}
    for line in open(path):
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*)", line)
        if m:
            out[m.group(1)] = m.group(2).strip().strip("\"'")
    return out


def _encode(im, box, quality):
    im = im.convert("RGB")
    im.thumbnail((box, box))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def data_uri(url, box=760, quality=88):
    raw = urllib.request.urlopen(url, timeout=60).read()
    return _encode(Image.open(io.BytesIO(raw)), box, quality)


def local_uri(path, box=1500, quality=86):
    return _encode(Image.open(path), box, quality)


def api(base, key, path):
    req = urllib.request.Request(base.rstrip("/") + "/rest/v1/" + path,
                                 headers={"apikey": key, "Authorization": "Bearer " + key})
    return json.load(urllib.request.urlopen(req, timeout=90))


TPL = """<meta charset="utf-8"><title>{TITLE}</title>
<style>
  /* System fonts only — a webfont @import raced render.cjs's first screenshot. */
  *{{ box-sizing:border-box; margin:0; padding:0; }}
  /* Block, not a flex column. render.cjs pins every .post with `flex:0 0 1080px`,
     and flex-basis in a column container is HEIGHT — which squared this card off
     at 1080 and ate the 4:5. As a block child that declaration simply does not
     apply, so the aspect-ratio below holds and render.cjs stays untouched. */
  body{{ background:#07080c; font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        display:block; text-align:center; padding:26px 0 40px; }}
  /* 4:5 — a lone image should take the most feed height Instagram allows. */
  .post{{ width:min(92vw,1080px); aspect-ratio:4/5; margin:0 auto; text-align:start;
         container-type:inline-size;
         position:relative; overflow:hidden; color:{INK};
         background:radial-gradient(120% 80% at 50% 0%, {G0} 0%, {G1} 55%, {G2} 100%); }}
  .post.rtl{{ direction:rtl; }}

  /* Art sits in the upper half and fades out rather than ending on a hard edge,
     so the copy reads as the same surface and not a caption pasted underneath. */
  .art{{ position:absolute; top:0; left:0; right:0; height:60%;
        display:flex; align-items:center; justify-content:center; }}
  .art svg, .art img{{ width:100%; height:100%; object-fit:cover; }}
  .art::after{{ content:""; position:absolute; inset:0;
               background:linear-gradient(180deg, rgba(0,0,0,.10) 0%, transparent 28%,
                          {G1}55 58%, {G1}ee 84%, {G2} 100%); }}
  .frame{{ position:absolute; inset:2cqw; border:1px solid {BRD}; border-radius:8px;
          pointer-events:none; z-index:3; }}

  .inner{{ position:relative; z-index:2; height:100%; padding:5cqw 5.6cqw;
          display:flex; flex-direction:column; }}
  .top{{ display:flex; align-items:flex-start; justify-content:space-between; }}
  .logo .n{{ font-family:Georgia,serif; font-weight:700; font-size:4cqw; line-height:1; }}
  .logo .s{{ font-size:1.9cqw; color:{SOFT}; margin-top:.6cqw; }}
  .tag{{ font-size:1.9cqw; letter-spacing:.3em; text-transform:uppercase; color:{ACC};
        text-align:end; }}

  .body{{ margin-top:auto; }}
  .kicker{{ font-size:2.1cqw; letter-spacing:.34em; text-transform:uppercase; color:{ACC}; }}
  .char{{ font-family:Georgia,'Hoefler Text',serif; font-weight:700; font-size:{NAMESIZE}cqw;
         line-height:1.02; letter-spacing:-.01em; margin-top:1.4cqw; }}
  .epithet{{ font-family:Georgia,serif; font-style:italic; font-size:2.9cqw; color:{SOFT};
            margin-top:1.4cqw; }}
  .rule{{ width:14cqw; height:2px; background:{ACC}; margin:3cqw 0; }}

  /* The pairing: bottle beside the reason. Grid, not flex, so a long line of
     copy can never squeeze the bottle out of the card. */
  .pair{{ display:grid; grid-template-columns:22cqw 1fr; gap:4cqw; align-items:center; }}
  .pair > img{{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:6px;
               box-shadow:0 10px 26px -10px rgba(0,0,0,.8); }}
  .duo{{ display:flex; gap:1.4cqw; }}
  .duo img{{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:6px;
            box-shadow:0 10px 26px -10px rgba(0,0,0,.8); }}
  .house{{ font-size:1.9cqw; letter-spacing:.28em; text-transform:uppercase; color:{ACC}; }}
  .pname{{ font-family:Georgia,serif; font-size:3.4cqw; line-height:1.15; margin-top:.8cqw; }}
  .why{{ font-size:2.5cqw; line-height:1.5; color:{SOFT}; margin-top:1.6cqw; }}

  .chips{{ display:flex; flex-wrap:wrap; gap:1.2cqw; margin-top:3.2cqw; }}
  .chip{{ font-size:1.9cqw; letter-spacing:.05em; padding:1cqw 2cqw; border-radius:999px;
         border:1px solid {BRD}; color:{SOFT}; }}
  .foot{{ display:flex; align-items:center; justify-content:space-between;
         margin-top:3.4cqw; font-size:2cqw; color:{SOFT}; }}
  .foot .g{{ width:1.8cqw; height:1.8cqw; border-radius:50%; background:{ACC};
            display:inline-block; margin-inline-end:1cqw; }}
  .hint{{ color:#5d6470; font-size:12px; }}
</style>

<div class="post {RTL}">
  <div class="art">{ART}</div>
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <div class="tag">{SERIES}</div>
    </div>
    <div class="body">
      <div class="kicker">{KICKER}</div>
      <div class="char">{CHAR}</div>
      <div class="epithet">{EPITHET}</div>
      <div class="rule"></div>
      <div class="pair">
        {BOTTLES}
        <div>
          <div class="house">{HOUSE}</div>
          <div class="pname">{PNAME}</div>
          <div class="why">{WHY}</div>
        </div>
      </div>
      <div class="chips">{CHIPS}</div>
      <div class="foot"><span><span class="g"></span>shama.ly</span><span>{FOOTNOTE}</span></div>
    </div>
  </div>
</div>
<p class="hint">lore card · 1 slide · 1080 × 1350 (4:5)</p>
"""

# Same trailing-house handling as generate.py: the house belongs on its own
# line, not on the front of the product name.
TRAILING = ("Frederic Malle", "Frédéric Malle", "Giorgio Armani", "Yves Saint Laurent",
            "Jean Paul Gaultier", "Dolce&Gabbana", "Dolce & Gabbana")
LEADING = ("Stephane Humbert Lucas 777", "Stephane Humbert Lucas", "Parfums de Marly",
           "Marc-Antoine Barrois", "Liquides Imaginaires", "Clive Christian",
           "Maison Francis Kurkdjian", "Fragrance Du Bois", "Oman Luxury", "Ex Nihilo",
           "Lorenzo Pazzaglia", "Tom Ford", "Le Labo", "BDK Parfums", "Roja Parfums",
           "Amouage", "Xerjoff", "Sospiro", "Creed", "Byredo", "Diptyque", "Initio",
           "Nishane", "Kilian", "Boadicea the Victorious")


def split_house(name, override=None):
    if override is not None:
        return override, name
    for t in TRAILING:
        if name.endswith(t):
            return t, name[: -len(t)].strip() or name
    for h in sorted(LEADING, key=len, reverse=True):
        if name.startswith(h):
            rest = name[len(h):].strip()
            if rest:
                return h, rest
    return "", name


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: card.py <config.json> [out.html]")
    cfg = json.load(open(sys.argv[1], encoding="utf-8"))
    env = load_env(os.path.join(ROOT, ".env"))
    base, key = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]

    slugs = cfg["product_slug"]
    if isinstance(slugs, str):
        slugs = [slugs]
    prods = []
    for s in slugs:
        r = api(base, key, "perfumes?" + urllib.parse.urlencode(
            {"select": "name,name_ar,image,is_active", "slug": f"eq.{s}", "limit": "1"}))
        if not r:
            sys.exit(f"no product with slug {s}")
        prods.append(r[0])

    rtl = bool(cfg.get("rtl"))
    if len(prods) > 1:
        cells = "".join(f'<img src="{data_uri(p["image"])}" alt="">' for p in prods)
        bottles = f'<div class="duo">{cells}</div>'
    else:
        bottles = f'<img src="{data_uri(prods[0]["image"])}" alt="">'

    p0 = prods[0]
    house, short = split_house(p0["name"], cfg.get("house"))
    if rtl and p0.get("name_ar"):
        short = p0["name_ar"]
    pname = cfg.get("product_label") or (
        " + ".join(split_house(p["name"])[1] for p in prods) if len(prods) > 1 else short)

    art = ""
    if cfg.get("art_svg"):
        path = cfg["art_svg"]
        if not os.path.isabs(path):
            path = os.path.join(HERE, "lore", path)
        art = open(path, encoding="utf-8").read()
    elif cfg.get("character_image"):
        path = cfg["character_image"]
        if not os.path.isabs(path):
            path = os.path.join(HERE, "lore", path)
        art = f'<img src="{local_uri(path)}" alt="">'

    html = TPL.format(
        TITLE=f'{cfg["character"]} — Shama', RTL="rtl" if rtl else "", ART=art,
        SERIES=cfg.get("series", ""), KICKER=cfg.get("kicker", ""),
        CHAR=cfg["character"], EPITHET=cfg.get("epithet", ""),
        NAMESIZE=cfg.get("name_size", 8.4),
        BOTTLES=bottles, HOUSE=house.upper(), PNAME=pname,
        WHY=cfg["why_ar"] if rtl else cfg["why_en"],
        CHIPS="".join(f'<span class="chip">{c}</span>' for c in cfg.get("note_chips", [])),
        FOOTNOTE=cfg.get("footnote", "عطور فاخرة · ليبيا" if rtl else "Luxury perfume · Libya"),
        **cfg["palette"])

    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        HERE, "out", cfg.get("slug_out", "card") + ".html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    print(f'OK  {cfg["character"]} -> {os.path.basename(out)}  ({len(html)//1024} KB)')


if __name__ == "__main__":
    main()
