#!/usr/bin/env python3
"""
Cast card — a whole ensemble in one post.

One character per row is a carousel nobody finishes. A roster puts the entire
cast on a single image: the argument is the *set*, and people tag each other
with "you're the Recluse". Reusable for any ensemble — a game's classes, a
show's houses, a film's crew.

    python3 scripts/ig-post/roster.py scripts/ig-post/lore/nightreign.json
    node scripts/ig-post/render.cjs roster-nightreign

The bottles are the artwork. No character art is embedded: official art is
copyrighted and this is a commercial account, and ten real product photos carry
the card better than one borrowed key-art would.
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


def data_uri(url, box=420, quality=86):
    raw = urllib.request.urlopen(url, timeout=60).read()
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    im.thumbnail((box, box))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def api(base, key, path):
    req = urllib.request.Request(base.rstrip("/") + "/rest/v1/" + path,
                                 headers={"apikey": key, "Authorization": "Bearer " + key})
    return json.load(urllib.request.urlopen(req, timeout=90))


TPL = """<meta charset="utf-8"><title>{TITLE}</title>
<style>
  /* System fonts only — a webfont @import raced render.cjs's first screenshot. */
  *{{ box-sizing:border-box; margin:0; padding:0; }}
  /* Block, not a flex column: render.cjs pins every .post with `flex:0 0 1080px`
     and flex-basis in a column container is HEIGHT, which would square the card
     off and eat the 4:5. As a block child that declaration does not apply. */
  body{{ background:#07080c; font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        display:block; text-align:center; padding:26px 0 40px; }}
  .post{{ width:min(92vw,1080px); aspect-ratio:4/5; margin:0 auto; text-align:start;
         container-type:inline-size; position:relative; overflow:hidden; color:{INK};
         background:radial-gradient(120% 70% at 50% 0%, {G0} 0%, {G1} 52%, {G2} 100%); }}
  .post.rtl{{ direction:rtl; }}
  .frame{{ position:absolute; inset:1.8cqw; border:1px solid {BRD}; border-radius:8px;
          pointer-events:none; }}
  .inner{{ position:relative; height:100%; padding:4.6cqw 4.8cqw;
          display:flex; flex-direction:column; }}

  .top{{ display:flex; align-items:flex-start; justify-content:space-between; }}
  .logo .n{{ font-family:Georgia,serif; font-weight:700; font-size:3.4cqw; line-height:1; }}
  .logo .s{{ font-size:1.7cqw; color:{SOFT}; margin-top:.5cqw; }}
  .tag{{ font-size:1.7cqw; letter-spacing:.3em; text-transform:uppercase; color:{ACC};
        text-align:end; }}

  .head{{ margin-top:3.4cqw; }}
  .kicker{{ font-size:1.9cqw; letter-spacing:.34em; text-transform:uppercase; color:{ACC}; }}
  .title{{ font-family:Georgia,'Hoefler Text',serif; font-weight:700; font-size:{TITLESIZE}cqw;
          line-height:1.04; margin-top:1.2cqw; }}
  .sub{{ font-family:Georgia,serif; font-style:italic; font-size:2.4cqw; color:{SOFT};
        margin-top:1cqw; }}

  /* Two columns of five. One column would run off the card; four would starve
     the perfume name, which is the part that has to be readable to be bought. */
  /* space-between, not start: with five rows the grid otherwise stopped short
     and left the bottom third of the card empty. */
  .grid{{ margin-top:3.4cqw; flex:1; display:grid; grid-template-columns:1fr 1fr;
         gap:1.6cqw 3.4cqw; align-content:space-between; }}
  .cell{{ display:grid; grid-template-columns:13cqw 1fr; gap:2.4cqw; align-items:center; }}
  .cell img{{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:5px;
             box-shadow:0 6px 16px -8px rgba(0,0,0,.85); }}
  .who{{ font-family:Georgia,serif; font-size:3cqw; line-height:1.1; }}
  .what{{ font-size:1.95cqw; line-height:1.38; color:{SOFT}; margin-top:.5cqw; }}
  .what b{{ color:{ACC}; font-weight:400; letter-spacing:.08em;
           text-transform:uppercase; font-size:1.65cqw; display:block;
           margin-bottom:.3cqw; }}

  .foot{{ display:flex; align-items:center; justify-content:space-between;
         margin-top:2.6cqw; font-size:1.9cqw; color:{SOFT}; }}
  .foot .g{{ width:1.6cqw; height:1.6cqw; border-radius:50%; background:{ACC};
            display:inline-block; margin-inline-end:1cqw; }}
  .hint{{ color:#5d6470; font-size:12px; }}
</style>

<div class="post {RTL}">
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <div class="tag">{SERIES}</div>
    </div>
    <div class="head">
      <div class="kicker">{KICKER}</div>
      <div class="title">{HEADLINE}</div>
      <div class="sub">{SUBTITLE}</div>
    </div>
    <div class="grid">{CELLS}</div>
    <div class="foot"><span><span class="g"></span>shama.ly</span><span>{FOOTNOTE}</span></div>
  </div>
</div>
<p class="hint">cast card · 1 slide · 1080 × 1350 (4:5)</p>
"""

TRAILING = ("Frederic Malle", "Frédéric Malle", "Giorgio Armani", "Yves Saint Laurent",
            "Jean Paul Gaultier", "Dolce&Gabbana", "Dolce & Gabbana")
LEADING = ("Stephane Humbert Lucas 777", "Stephane Humbert Lucas", "Liquides Imaginaires",
           "Parfums de Marly", "Clive Christian", "Lorenzo Pazzaglia", "Oman Luxury",
           "Louis Vuitton", "Ex Nihilo", "Amouage", "Xerjoff", "Sospiro", "Creed",
           "Byredo", "Diptyque", "Initio", "Nishane", "Kilian", "Memo Paris")


def short_name(name):
    """Drop the house — the cell has no room for it and the row above says who."""
    for t in TRAILING:
        if name.endswith(t):
            return name[: -len(t)].strip() or name
    for h in sorted(LEADING, key=len, reverse=True):
        if name.startswith(h):
            rest = name[len(h):].strip()
            if rest:
                return rest
    return name


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: roster.py <config.json> [out.html]")
    cfg = json.load(open(sys.argv[1], encoding="utf-8"))
    env = load_env(os.path.join(ROOT, ".env"))
    base, key = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]
    rtl = bool(cfg.get("rtl"))

    cells = ""
    for e in cfg["entries"]:
        r = api(base, key, "perfumes?" + urllib.parse.urlencode(
            {"select": "name,name_ar,image,is_active,stock_quantity",
             "slug": f"eq.{e['slug']}", "limit": "1"}))
        if not r:
            sys.exit(f"no product with slug {e['slug']}")
        p = r[0]
        if not p["is_active"]:
            sys.exit(f"{e['slug']} is inactive — a cast card must only show what sells")
        label = e.get("label") or short_name(
            p["name_ar"] if rtl and p.get("name_ar") else p["name"])
        cells += (f'<div class="cell"><img src="{data_uri(p["image"])}" alt="">'
                  f'<div><div class="who">{e["character"]}</div>'
                  f'<div class="what"><b>{label}</b>{e["line"]}</div></div></div>')

    html = TPL.format(
        TITLE=cfg.get("headline", "Shama"), RTL="rtl" if rtl else "",
        SERIES=cfg.get("series", ""), KICKER=cfg.get("kicker", ""),
        HEADLINE=cfg["headline"], SUBTITLE=cfg.get("subtitle", ""),
        TITLESIZE=cfg.get("title_size", 6.6), CELLS=cells,
        FOOTNOTE=cfg.get("footnote", "عطور فاخرة · ليبيا" if rtl else "Luxury perfume · Libya"),
        **cfg["palette"])

    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        HERE, "out", cfg.get("slug_out", "roster") + ".html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    print(f'OK  {cfg["headline"]} — {len(cfg["entries"])} entries -> {os.path.basename(out)}')


if __name__ == "__main__":
    main()
