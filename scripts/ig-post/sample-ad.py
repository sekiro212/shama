#!/usr/bin/env python3
"""
Meta-ad carousels for the decant/sample offer.

Three slides: the objection, the bottles, the CTA. Deliberately carries NO
prices — the price is the WhatsApp conversation, and a number on the creative
only gives people a reason to scroll past. Products are pulled live and only
ones that genuinely have rows in perfume_samples are allowed in, so the ad can
never promise a sample that does not exist.

    python3 scripts/ig-post/sample-ad.py            # all sets
    python3 scripts/ig-post/sample-ad.py blind      # one set

Then: node scripts/ig-post/render.cjs ad-blind ad-blind-ar ...
"""
import base64
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

WHATSAPP = "0924138980"

SETS = {
    "blind": dict(
        slugs=["xerjoff-torino21", "sospiro-vibrato", "roja-parfums-burlington-1819",
               "byredo-mojave-ghost", "marc-antoine-barrois-ganymede",
               "bois-imp-rial-essential-parfums"],
        hook_ar="لا تشتري عطر\nما شمّيتوش.",
        hook_en="Never blind-buy\nagain.",
        sub_ar="أغلى العطور، بحجم تقدر تجرّبه أول.",
        sub_en="The ones you'd never risk. In a size you can try first.",
        kicker_ar="عيّنات أصلية", kicker_en="Real decants",
        accent="#c9a24a", g0="#2a2214", g1="#16110a",
    ),
    "oud": dict(
        slugs=["boadicea-the-victorious-azraq", "fragrance-du-bois-lucius",
               "oman-luxury-flowerlush", "tom-ford-oud-wood",
               "xerjoff-casamorati-italica", "nishane-wulong-cha-x"],
        hook_ar="عود وشرق.\nجرّب قبل ما تلتزم.",
        hook_en="Oud and the East.\nTry before you commit.",
        sub_ar="ستة عطور شرقية، كلها متوفرة كعيّنة.",
        sub_en="Six oriental houses, every one available as a decant.",
        kicker_ar="عيّنات أصلية", kicker_en="Real decants",
        accent="#c98a3a", g0="#2b1a12", g1="#170e09",
    ),
    "start": dict(
        slugs=["xerjoff-casamorati-mefisto", "diptyque-tempo",
               "lorenzo-pazzaglia-cherry-ink", "rosendo-mateu-no-8",
               "maison-margiela-replica-by-the-fireplace",
               "ex-nihilo-chandigarh-express"],
        hook_ar="ابدأ من هنا.",
        hook_en="Start here.",
        sub_ar="ستة عطور يسألوا عليها كل يوم — جرّبهم قبل الزجاجة.",
        sub_en="Six people ask about every day. Sample them before the bottle.",
        kicker_ar="عيّنات أصلية", kicker_en="Real decants",
        accent="#7fa8d8", g0="#16233a", g1="#0c1421",
    ),
}


def load_env(path):
    out = {}
    for line in open(path):
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*)", line)
        if m:
            out[m.group(1)] = m.group(2).strip().strip("\"'")
    return out


def api(base, key, path):
    url = base.rstrip("/") + "/rest/v1/" + path
    req = urllib.request.Request(url, headers={"apikey": key,
                                               "Authorization": "Bearer " + key})
    try:
        return json.load(urllib.request.urlopen(req, timeout=90))
    except urllib.error.HTTPError as e:
        sys.exit(f"API {e.code} on {url}\n{e.read().decode()[:300]}")


def data_uri(url, box=760, quality=86, label=""):
    try:
        raw = urllib.request.urlopen(url, timeout=60).read()
    except urllib.error.HTTPError as e:
        sys.exit(f"image {e.code} for {label or url} — stored object is missing")
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    im.thumbnail((box, box))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


TPL = """<meta charset="utf-8"><title>{TITLE}</title>
<style>
  /* System fonts only — a webfont @import raced the first element screenshot
     in render.cjs and captured a shifting layout. */
  *{{ box-sizing:border-box; margin:0; padding:0; }}
  body{{ background:#0b0708; font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        display:flex; flex-direction:column; align-items:center; gap:18px; padding:26px 0 40px; }}
  .post{{ width:1080px; height:1080px; container-type:inline-size; position:relative;
         overflow:hidden; color:{INK};
         background:radial-gradient(120% 95% at 24% 6%, {G0} 0%, {G1} 52%, #06070a 100%); }}
  .post.rtl{{ direction:rtl; }}
  .frame{{ position:absolute; inset:2.4cqw; border:1px solid {BRD}; border-radius:10px;
          pointer-events:none; }}
  .inner{{ position:relative; z-index:1; height:100%; padding:6.4cqw 6.8cqw;
          display:flex; flex-direction:column; }}
  .top{{ display:flex; align-items:center; justify-content:space-between; }}
  .logo .n{{ font-family:Georgia,serif; font-weight:700; font-size:4.4cqw; line-height:1; }}
  .logo .s{{ font-size:2.2cqw; letter-spacing:.06em; color:{SOFT}; margin-top:.7cqw; }}
  .tagsm{{ font-size:2.2cqw; letter-spacing:.34em; color:{ACC}; text-transform:uppercase; }}
  .pg{{ direction:ltr; unicode-bidi:isolate; font-size:2.4cqw; letter-spacing:.2em; color:{SOFT}; }}
  .foot{{ margin-top:auto; display:flex; align-items:flex-end; justify-content:space-between; }}

  /* slide 1 — the objection */
  .hook{{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:3cqw; }}
  .kicker{{ font-size:2.5cqw; letter-spacing:.36em; text-transform:uppercase; color:{ACC}; }}
  .big{{ font-family:Georgia,'Hoefler Text',serif; font-weight:700; font-size:{HOOKSIZE}cqw;
        line-height:1.04; letter-spacing:-.02em; white-space:pre-line; }}
  .sub{{ font-size:3.1cqw; line-height:1.6; color:{SOFT}; max-width:74%; }}
  .rule{{ width:12cqw; height:2px; background:{ACC}; }}

  /* slide 2 — the shelf */
  .grid{{ flex:1; display:grid; grid-template-columns:repeat(3,1fr); gap:2.6cqw;
         align-content:center; margin:2cqw 0; }}
  .cell{{ display:flex; flex-direction:column; gap:1.4cqw; }}
  .cell img{{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:8px;
             box-shadow:0 6px 18px rgba(0,0,0,.5); }}
  .cn{{ font-size:2.1cqw; line-height:1.3; color:{INK}; }}
  .ch{{ font-size:1.7cqw; letter-spacing:.16em; text-transform:uppercase; color:{ACC}; }}
  .head2{{ font-family:Georgia,serif; font-size:5cqw; line-height:1.1; }}

  /* slide 3 — the CTA */
  .cta{{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:3.4cqw; }}
  .sizes{{ display:flex; gap:2cqw; flex-wrap:wrap; }}
  .chip{{ border:1px solid {BRD}; border-radius:100px; padding:1.5cqw 3.6cqw;
         font-size:2.6cqw; color:{INK}; }}
  .wa{{ display:flex; align-items:center; gap:2.4cqw; background:{ACC}; color:#10120f;
       border-radius:100px; padding:3cqw 5cqw; font-size:4.2cqw; font-weight:700;
       align-self:flex-start; direction:ltr; unicode-bidi:isolate; }}
  .site{{ font-size:2.6cqw; letter-spacing:.2em; color:{SOFT}; text-transform:uppercase; }}
</style>

<div class="post {RTL}">
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <div class="tagsm">{KICKER}</div>
    </div>
    <div class="hook">
      <div class="rule"></div>
      <div class="big">{HOOK}</div>
      <div class="sub">{SUB}</div>
    </div>
    <div class="foot"><span class="pg">01 / 03</span><span class="tagsm">{SWIPE}</span></div>
  </div>
</div>

<div class="post {RTL}">
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="head2">{SHELF}</div>
      <div class="tagsm">{KICKER}</div>
    </div>
    <div class="grid">{CELLS}</div>
    <div class="foot"><span class="pg">02 / 03</span><span class="tagsm">shama.ly</span></div>
  </div>
</div>

<div class="post {RTL}">
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <div class="tagsm">{KICKER}</div>
    </div>
    <div class="cta">
      <div class="rule"></div>
      <div class="big" style="font-size:6.4cqw">{CTAHEAD}</div>
      <div class="sizes">{CHIPS}</div>
      <div class="wa">WhatsApp · {WA}</div>
      <div class="site">shama.ly</div>
    </div>
    <div class="foot"><span class="pg">03 / 03</span><span class="tagsm">{DELIVER}</span></div>
  </div>
</div>
"""


def build(key_name, cfg, base, anon, rtl):
    ids = {}
    for slug in cfg["slugs"]:
        rows = api(base, anon, "perfumes?" + urllib.parse.urlencode(
            {"select": "id,name,name_ar,image,is_active", "slug": f"eq.{slug}", "limit": "1"}))
        if not rows:
            sys.exit(f"{key_name}: no product with slug {slug}")
        p = rows[0]
        if not p["is_active"] or not p["image"]:
            sys.exit(f"{key_name}: {slug} is inactive or has no photo")
        # 11 active rows hold junk in `image` ("dsf", or a relative /perfumes/
        # path that 403s). Refuse rather than render a broken tile into an ad.
        if not p["image"].startswith("http"):
            sys.exit(f"{key_name}: {slug} has a non-URL image ({p['image']!r})")
        ids[slug] = p

    # Only advertise what genuinely has decants on file.
    sizes = set()
    for slug, p in ids.items():
        smp = api(base, anon, "perfume_samples?" + urllib.parse.urlencode(
            {"select": "size", "perfume_id": f"eq.{p['id']}"}))
        if not smp:
            sys.exit(f"{key_name}: {slug} has no rows in perfume_samples — refusing to advertise it")
        sizes.update(s["size"] for s in smp)

    cells = ""
    for slug in cfg["slugs"]:
        p = ids[slug]
        house, short = split_name(p["name"])
        label = p["name_ar"] if rtl and p.get("name_ar") else short
        cells += (f'<div class="cell"><img src="{data_uri(p["image"], label=p["name"])}" alt="{p["name"]}">'
                  f'<div class="ch">{house}</div><div class="cn">{label}</div></div>')

    order = ["3ml", "5ml", "10ml", "30ml"]
    have = [s for s in order if s in sizes]
    chips = "".join(f'<span class="chip">{s}</span>' for s in have)

    hook = cfg["hook_ar"] if rtl else cfg["hook_en"]
    html = TPL.format(
        TITLE=f'Shama ad — {key_name}',
        RTL="rtl" if rtl else "",
        INK="#f6f1e6", SOFT="#b9ae99", ACC=cfg["accent"],
        BRD="rgba(255,255,255,.18)", G0=cfg["g0"], G1=cfg["g1"],
        HOOKSIZE=8.2 if rtl else 9.0,
        KICKER=cfg["kicker_ar"] if rtl else cfg["kicker_en"],
        HOOK=hook, SUB=cfg["sub_ar"] if rtl else cfg["sub_en"],
        SWIPE="اسحب ←" if rtl else "swipe →",
        SHELF="من الرفّ" if rtl else "From the shelf",
        CELLS=cells,
        CTAHEAD="اطلب عيّنتك\nعلى واتساب." if rtl else "Order your\ndecant on WhatsApp.",
        CHIPS=chips, WA=WHATSAPP,
        DELIVER="توصيل داخل ليبيا" if rtl else "Delivery across Libya",
    )
    name = f"ad-{key_name}" + ("-ar" if rtl else "")
    path = os.path.join(OUT, name + ".html")
    os.makedirs(OUT, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"OK  {name}  ({len(cfg['slugs'])} products, sizes {'/'.join(have)})")
    return name


MULTIWORD = ("Marc-Antoine Barrois", "Fragrance Du Bois", "Boadicea the Victorious",
             "Xerjoff Casamorati", "Oman Luxury", "Lorenzo Pazzaglia", "Rosendo Mateu",
             "Maison Margiela", "Roja Parfums", "Tom Ford", "Ex Nihilo",
             "Bois Impérial")


def split_name(name):
    for h in sorted(MULTIWORD, key=len, reverse=True):
        if name.startswith(h):
            rest = name[len(h):].strip()
            if rest:
                return h.upper(), rest
    first = name.split()[0]
    rest = name[len(first):].strip()
    return (first.upper(), rest) if rest else ("", name)


def main():
    env = load_env(os.path.join(ROOT, ".env"))
    base, anon = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]
    wanted = sys.argv[1:] or list(SETS)
    built = []
    for k in wanted:
        if k not in SETS:
            sys.exit(f"unknown set {k}; have {list(SETS)}")
        for rtl in (True, False):
            built.append(build(k, SETS[k], base, anon, rtl))
    print("\nrender with:\n  node scripts/ig-post/render.cjs " + " ".join(built))


if __name__ == "__main__":
    main()
