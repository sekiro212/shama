#!/usr/bin/env python3
"""
Cast carousel — a cover slide, then one slide per character.

The roster card fits a whole ensemble on one image but gives each member two
lines. This gives each character a full slide (art, bottle, the reason) behind a
cover that explains what the thing even is, so someone who has never played the
game still knows what they are looking at by slide two.

    python3 scripts/ig-post/carousel.py scripts/ig-post/lore/nightreign-carousel.json
    node scripts/ig-post/render.cjs carousel-nightreign

Every slide is one `.post` in a single HTML, which is what render.cjs already
walks — so a 6-character cast renders as -1..-7 with no extra plumbing.
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


def data_uri(url, box=520, quality=88):
    raw = urllib.request.urlopen(url, timeout=60).read()
    return _encode(Image.open(io.BytesIO(raw)), box, quality)


def local_uri(path, box=1400, quality=85):
    return _encode(Image.open(path), box, quality)


def api(base, key, path):
    req = urllib.request.Request(base.rstrip("/") + "/rest/v1/" + path,
                                 headers={"apikey": key, "Authorization": "Bearer " + key})
    return json.load(urllib.request.urlopen(req, timeout=90))


CSS = """<meta charset="utf-8"><title>{TITLE}</title>
<style>
  /* System fonts only — a webfont @import raced render.cjs's first screenshot. */
  *{{ box-sizing:border-box; margin:0; padding:0; }}
  /* Block, not a flex column: render.cjs pins every .post with `flex:0 0 1080px`
     and flex-basis in a column container is HEIGHT, which would square these
     off and eat the 4:5. As block children that declaration does not apply. */
  body{{ background:#07080c; font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        display:block; text-align:center; padding:26px 0 40px; }}
  .post{{ width:min(92vw,1080px); aspect-ratio:4/5; margin:0 auto 18px; text-align:start;
         container-type:inline-size; position:relative; overflow:hidden; color:{INK};
         background:radial-gradient(120% 80% at 50% 0%, {G0} 0%, {G1} 55%, {G2} 100%); }}
  .post.rtl{{ direction:rtl; }}
  .frame{{ position:absolute; inset:2cqw; border:1px solid {BRD}; border-radius:8px;
          pointer-events:none; z-index:3; }}
  .inner{{ position:relative; z-index:2; height:100%; padding:5cqw 5.6cqw;
          display:flex; flex-direction:column; }}
  .top{{ display:flex; align-items:flex-start; justify-content:space-between; }}
  .logo .n{{ font-family:Georgia,serif; font-weight:700; font-size:3.6cqw; line-height:1; }}
  .logo .s{{ font-size:1.8cqw; color:{SOFT}; margin-top:.5cqw; }}
  .tag{{ font-size:1.8cqw; letter-spacing:.3em; text-transform:uppercase; color:{ACC};
        text-align:end; }}
  .foot{{ display:flex; align-items:center; justify-content:space-between;
         margin-top:3.2cqw; font-size:2cqw; color:{SOFT}; }}
  .foot .g{{ width:1.7cqw; height:1.7cqw; border-radius:50%; background:{ACC};
            display:inline-block; margin-inline-end:1cqw; }}
  .pg{{ direction:ltr; unicode-bidi:isolate; letter-spacing:.2em; }}

  /* Art fades out rather than ending on a hard edge, so the copy reads as the
     same surface and not a caption pasted underneath. */
  .art{{ position:absolute; top:0; left:0; right:0; height:{ARTH}%;
        display:flex; align-items:center; justify-content:center; }}
  .art svg, .art img{{ width:100%; height:100%; object-fit:cover;
                      object-position:{ARTPOS}; }}
  .art::after{{ content:""; position:absolute; inset:0;
               background:linear-gradient(180deg, rgba(0,0,0,.12) 0%, transparent 26%,
                          {G1}55 56%, {G1}ee 82%, {G2} 100%); }}

  .body{{ margin-top:auto; }}
  .post.noart .body{{ margin-top:auto; margin-bottom:auto; }}
  .kicker{{ font-size:2cqw; letter-spacing:.34em; text-transform:uppercase; color:{ACC}; }}
  .char{{ font-family:Georgia,'Hoefler Text',serif; font-weight:700;
         line-height:1.02; letter-spacing:-.01em; margin-top:1.3cqw; }}
  .epithet{{ font-family:Georgia,serif; font-style:italic; font-size:2.7cqw; color:{SOFT};
            margin-top:1.2cqw; }}
  .rule{{ width:14cqw; height:2px; background:{ACC}; margin:2.8cqw 0; }}
  .pair{{ display:grid; grid-template-columns:20cqw 1fr; gap:3.6cqw; align-items:center; }}
  .pair > img{{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:6px;
               box-shadow:0 10px 26px -10px rgba(0,0,0,.8); }}
  .house{{ font-size:1.8cqw; letter-spacing:.28em; text-transform:uppercase; color:{ACC}; }}
  .pname{{ font-family:Georgia,serif; font-size:3.2cqw; line-height:1.15; margin-top:.7cqw; }}
  .why{{ font-size:2.4cqw; line-height:1.5; color:{SOFT}; margin-top:1.4cqw; }}

  /* cover */
  .cover .lede{{ font-size:2.6cqw; line-height:1.6; color:{SOFT}; margin-top:2.6cqw;
                max-width:88%; }}
  .cover .big{{ font-family:Georgia,'Hoefler Text',serif; font-weight:700;
               font-size:{COVERSIZE}cqw; line-height:1.02; margin-top:1.4cqw; }}
  .strip{{ display:flex; gap:1cqw; margin-top:3.4cqw; flex-wrap:nowrap; }}
  .strip img{{ flex:1 1 0; min-width:0; aspect-ratio:1; object-fit:cover; border-radius:4px;
              box-shadow:0 6px 14px -8px rgba(0,0,0,.85); }}
  .post.rtl .kicker, .post.rtl .tag, .post.rtl .house, .post.rtl .pg{{
    letter-spacing:normal; }}
  /* Tashkeel rides above the letters, and the Latin line-heights gave it no
     headroom — the damma and shadda on "المُنفِّذ" climbed into the kicker. */
  .post.rtl .char{{ line-height:1.32; margin-top:2.6cqw; }}
  .post.rtl .epithet{{ line-height:1.55; }}
  .post.rtl .pname{{ line-height:1.4; }}
  .post.rtl .big{{ line-height:1.3; }}
  .hint{{ color:#5d6470; font-size:12px; }}
</style>
"""

COVER = """
<div class="post cover {RTL}">
  {ART}
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <div class="tag">{SERIES}</div>
    </div>
    <div class="body">
      <div class="kicker">{KICKER}</div>
      <div class="big">{HEADLINE}</div>
      <div class="lede">{LEDE}</div>
      <div class="strip">{STRIP}</div>
    </div>
    <div class="foot"><span><span class="g"></span>shama.ly</span><span>{SWIPE}</span></div>
  </div>
</div>
"""

SLIDE = """
<div class="post {NOART}{RTL}">
  {ART}
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <div class="tag">{SERIES}</div>
    </div>
    <div class="body">
      <div class="kicker">{KICKER}</div>
      <div class="char" style="font-size:{NAMESIZE}cqw">{CHAR}</div>
      <div class="epithet">{EPITHET}</div>
      <div class="rule"></div>
      <div class="pair">
        <img src="{BOTTLE}" alt="">
        <div>
          <div class="house">{HOUSE}</div>
          <div class="pname">{PNAME}</div>
          <div class="why">{WHY}</div>
        </div>
      </div>
    </div>
    <div class="foot"><span class="pg">{N} / {TOTAL}</span><span>{FOOTNOTE}</span></div>
  </div>
</div>
"""

TRAILING = ("Frederic Malle", "Frédéric Malle", "Giorgio Armani", "Yves Saint Laurent",
            "Jean Paul Gaultier", "Dolce&Gabbana", "Dolce & Gabbana")
LEADING = ("Stephane Humbert Lucas 777", "Stephane Humbert Lucas", "Liquides Imaginaires",
           "Parfums de Marly", "Clive Christian", "Lorenzo Pazzaglia", "Oman Luxury",
           "Louis Vuitton", "Ex Nihilo", "Amouage", "Xerjoff", "Sospiro", "Creed",
           "Byredo", "Diptyque", "Initio", "Nishane", "Kilian", "Memo Paris")


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


def art_block(cfg, key_img="art", key_svg="art_svg"):
    """Inline SVG stays crisp at 2160px; a supplied portrait is embedded raster.

    `art_position` is per-entry as well as global — a face sits at a different
    height in every portrait, and one shared crop buried some of them.
    """
    if cfg.get(key_svg):
        p = cfg[key_svg]
        if not os.path.isabs(p):
            p = os.path.join(HERE, "lore", p)
        return f'<div class="art">{open(p, encoding="utf-8").read()}</div>'
    if cfg.get(key_img):
        p = cfg[key_img]
        if not os.path.isabs(p):
            p = os.path.join(HERE, "lore", p)
        pos = cfg.get("art_position")
        style = f' style="object-position:{pos}"' if pos else ""
        return f'<div class="art"><img src="{local_uri(p)}"{style} alt=""></div>'
    return ""


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: carousel.py <config.json> [out.html]")
    cfg = json.load(open(sys.argv[1], encoding="utf-8"))
    env = load_env(os.path.join(ROOT, ".env"))
    base, key = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]
    rtl = bool(cfg.get("rtl"))
    pal = cfg["palette"]
    total = len(cfg["entries"]) + 1

    prods, bottles = [], []
    for e in cfg["entries"]:
        r = api(base, key, "perfumes?" + urllib.parse.urlencode(
            {"select": "name,name_ar,image,is_active", "slug": f"eq.{e['slug']}", "limit": "1"}))
        if not r:
            sys.exit(f"no product with slug {e['slug']}")
        if not r[0]["is_active"]:
            sys.exit(f"{e['slug']} is inactive — a cast post must only show what sells")
        prods.append(r[0])
        bottles.append(data_uri(r[0]["image"]))

    html = CSS.format(TITLE=cfg["headline"], ARTH=cfg.get("art_height", 58),
                      ARTPOS=cfg.get("art_position", "center 30%"),
                      COVERSIZE=cfg.get("cover_size", 8.2), **pal)

    html += COVER.format(
        RTL="rtl" if rtl else "", ART=art_block(cfg, "cover_art", "cover_art_svg"),
        SERIES=cfg.get("series", ""), KICKER=cfg.get("kicker", ""),
        HEADLINE=cfg["headline"], LEDE=cfg.get("lede", ""),
        STRIP="".join(f'<img src="{b}" alt="">' for b in bottles),
        SWIPE=cfg.get("swipe", "اسحب ←" if rtl else "swipe →"))

    for i, (e, p, b) in enumerate(zip(cfg["entries"], prods, bottles), start=2):
        house, short = split_house(p["name"], e.get("house"))
        if rtl and p.get("name_ar"):
            short = p["name_ar"]
        html += SLIDE.format(
            RTL="rtl" if rtl else "",
            NOART="" if (e.get("art") or e.get("art_svg")) else "noart ",
            ART=art_block(e),
            SERIES=cfg.get("series", ""), KICKER=cfg.get("slide_kicker", ""),
            NAMESIZE=e.get("name_size", cfg.get("name_size", 8.6)),
            CHAR=e["character"], EPITHET=e.get("epithet", ""),
            BOTTLE=b, HOUSE=house.upper(), PNAME=e.get("label") or short,
            WHY=e["line"], N=i, TOTAL=total,
            FOOTNOTE=cfg.get("footnote", "عطور فاخرة · ليبيا" if rtl else "shama.ly"))

    html += '<p class="hint">cast carousel · %d slides · 1080 × 1350 (4:5)</p>' % total

    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        HERE, "out", cfg.get("slug_out", "carousel") + ".html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    print(f'OK  {cfg["headline"]} — cover + {total-1} characters -> {os.path.basename(out)}')


if __name__ == "__main__":
    main()
