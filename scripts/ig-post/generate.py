#!/usr/bin/env python3
"""
Shama Instagram post generator.

Given a product (by slug OR name), this:
  1. pulls its data from Supabase (name, price, size, notes, samples, primary image)
  2. samples the product photo to derive a coherent palette + light/dark mood
  3. fills the 3-slide square carousel template
  4. writes a self-contained HTML file (image embedded as a data URI)

Usage:
    python scripts/ig-post/generate.py "xerjoff-casamorati-mefisto"
    python scripts/ig-post/generate.py "Elie Saab Le Parfum"      # name also works
    python scripts/ig-post/generate.py <slug-or-name> out.html    # optional output path

Then open the HTML (or publish it as an Artifact) and screenshot each 1080x1080 slide.

Requires: Pillow (PIL). Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from the repo .env.
"""
import sys, os, re, json, base64, colorsys, urllib.request, urllib.parse
from collections import Counter
from io import BytesIO
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ---------- config ----------
def load_env():
    env = open(os.path.join(ROOT, ".env")).read()
    url = re.search(r"VITE_SUPABASE_URL=(.*)", env).group(1).strip()
    key = re.search(r"VITE_SUPABASE_ANON_KEY=(.*)", env).group(1).strip()
    return url, key

# ---------- supabase REST ----------
def clamp_sentence(text, limit=250):
    """Trim slide 3's blurb to whole sentences that fit the copy box.

    Most catalogue descriptions are two or three sentences and run 180-300
    chars. A blind character slice left them ending mid-word ("a rich base of
    sand"), which reads like a bug, so keep whole sentences and only fall back
    to a word boundary plus an ellipsis when even the first one is too long.
    """
    if len(text) <= limit:
        return text
    kept = ""
    for piece in re.findall(r"[^.!?]*[.!?]+|\S[^.!?]*$", text):
        if len(kept) + len(piece) > limit:
            break
        kept += piece
    kept = kept.strip()
    if kept:
        return kept
    return text[:limit].rsplit(" ", 1)[0].rstrip(",;:") + "…"


def conc_label(conc):
    """Slide 3 caption suffix for the concentration, e.g. " · PARFUM".

    Several houses in the catalogue sell parfum/extrait/EDT rather than EDP, so
    this follows the column instead of assuming. Anything unrecognised (gift
    sets, blank) yields an empty string so the slide shows the size alone
    rather than a wrong concentration.
    """
    label = {
        "edp": "EAU DE PARFUM",
        "edt": "EAU DE TOILETTE",
        "parfum": "PARFUM",
        "extrait": "EXTRAIT DE PARFUM",
        "extrait de parfum": "EXTRAIT DE PARFUM",
        "edc": "EAU DE COLOGNE",
        "cologne": "EAU DE COLOGNE",
    }.get((conc or "").strip().lower())
    return f" · {label}" if label else ""


def fetch_product(base, key, term):
    q = {
        "or": f"(slug.eq.{term},name.eq.{term})",
        "select": "name,name_ar,price,size,gender,concentration,description,fragrance_notes,"
                  "perfume_images(image_url,is_primary),"
                  "perfume_samples(size,price,is_active)",
        "limit": "1",
    }
    u = base.rstrip("/") + "/rest/v1/perfumes?" + urllib.parse.urlencode(q, safe="(),.*")
    req = urllib.request.Request(u, headers={"apikey": key, "Authorization": "Bearer " + key})
    rows = json.load(urllib.request.urlopen(req, timeout=30))
    if not rows:
        sys.exit(f"No product found for: {term}")
    return rows[0]

def primary_image_url(p):
    imgs = p.get("perfume_images") or []
    prim = [i for i in imgs if i.get("is_primary")]
    pick = (prim or imgs)
    if not pick:
        sys.exit("Product has no image.")
    return pick[0]["image_url"]

# ---------- color helpers ----------
def hx(r, g, b): return f"#{int(r):02X}{int(g):02X}{int(b):02X}"
def to_hls(r, g, b): return colorsys.rgb_to_hls(r/255, g/255, b/255)          # h,l,s
def from_hls(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h, max(0, min(1, l)), max(0, min(1, s)))
    return hx(r*255, g*255, b*255)

def sample_palette(img_bytes):
    im = Image.open(BytesIO(img_bytes)).convert("RGB").resize((120, 160))
    px = list(im.getdata())
    # average luminance -> light vs dark mood
    lum = sum(0.299*r + 0.587*g + 0.114*b for r, g, b in px) / len(px)
    dark = lum < 120
    # dominant vibrant colour: bucket, score by frequency * saturation, ignore near-grey/very dark/very light
    def q(c): return tuple((v//16)*16 + 8 for v in c)
    cnt = Counter(q(p) for p in px)
    best, best_score = None, -1
    for (r, g, b), n in cnt.items():
        h, l, s = to_hls(r, g, b)
        if l < 0.12 or l > 0.9:      # skip near-black / near-white
            continue
        score = n * (0.25 + s)       # weight frequency, reward saturation
        if score > best_score:
            best, best_score = (h, l, s), score
    if best is None:                 # fully desaturated image -> neutral accent
        best = (0.58, 0.5, 0.15)
    h, _, s = best
    s = max(0.30, min(0.62, s))      # keep accent tasteful, never neon
    return dark, h, s

def build_tokens(dark, h, s):
    """Return the CSS custom-property block derived from the photo."""
    if dark:
        t = {
            "page":   from_hls(h, 0.07, min(s, .4)),
            "c_top":  from_hls(h, 0.30, min(s, .5)),
            "c_mid":  from_hls(h, 0.17, min(s, .5)),
            "c_low":  from_hls(h, 0.11, min(s, .45)),
            "acc":    from_hls(h, 0.60, s),
            "acc_dp": from_hls(h, 0.44, s),
            "ink":    "#F4F8FC",
            "soft":   from_hls(h, 0.80, .18),
            "muted":  from_hls(h, 0.68, .22),
            "faint":  from_hls(h, 0.55, .18),
            "glass":  "rgba(255,255,255,.06)",
            "brd":    "rgba(255,255,255,.12)",
            "brd2":   "rgba(255,255,255,.07)",
            "dot":    "rgba(200,215,240,.10)",
            "frame_in": "rgba(255,255,255,.5)",
            "shadow": "rgba(0,0,0,.55)",
            "title":  f"linear-gradient(135deg,#FFFFFF 0%, {from_hls(h,0.82,.35)} 50%, {from_hls(h,0.6,s)} 100%)",
            "cta_ink": "#fff",
        }
    else:
        t = {
            "page":   from_hls(h, 0.84, min(s, .38)),
            "c_top":  from_hls(h, 0.95, min(s, .35)),
            "c_mid":  from_hls(h, 0.87, min(s, .40)),
            "c_low":  from_hls(h, 0.78, min(s, .42)),
            "acc":    from_hls(h, 0.46, s),
            "acc_dp": from_hls(h, 0.34, s),
            "ink":    from_hls(h, 0.20, .35),
            "soft":   from_hls(h, 0.34, .28),
            "muted":  from_hls(h, 0.48, .24),
            "faint":  from_hls(h, 0.60, .22),
            "glass":  "rgba(255,255,255,.52)",
            "brd":    from_hls(h, 0.30, .30).replace("#", "") ,  # placeholder replaced below
            "brd2":   "",
            "dot":    "",
            "frame_in": "rgba(255,255,255,.55)",
            "shadow": "rgba(80,55,40,.5)",
            "title":  f"linear-gradient(135deg,{from_hls(h,0.24,.4)} 0%, {from_hls(h,0.46,s)} 60%, {from_hls(h,0.62,s*.8)} 100%)",
            "cta_ink": "#fff",
        }
        # translucent, hue-tinted borders/dots for the light theme
        rr, gg, bb = [int(from_hls(h, 0.30, .30)[i:i+2], 16) for i in (1, 3, 5)]
        t["brd"]  = f"rgba({rr},{gg},{bb},.18)"
        t["brd2"] = f"rgba({rr},{gg},{bb},.10)"
        t["dot"]  = f"rgba({rr},{gg},{bb},.13)"
    return t

# ---------- content ----------
def notes_line(nd, keys):
    out = []
    for k in keys:
        vals = (nd or {}).get(k) or []
        if vals:
            out.append(" · ".join(vals))
    return out

def fmt_int(x):
    try: return str(int(float(x)))
    except Exception: return str(x)

# ---------- template ----------
TEMPLATE = r"""<title>{TITLE_EN} — Shama</title>
<style>
  :root{{
    --page:{page}; --c-top:{c_top}; --c-mid:{c_mid}; --c-low:{c_low};
    --acc:{acc}; --acc-dp:{acc_dp};
    --ink:{ink}; --soft:{soft}; --muted:{muted}; --faint:{faint};
    --glass:{glass}; --brd:{brd}; --brd-2:{brd2}; --dot:{dot};
    --frame-in:{frame_in}; --shadow:{shadow};
  }}
  *{{ box-sizing:border-box; margin:0; padding:0; }}
  body{{ font-family:"Manrope",system-ui,-apple-system,"Segoe UI",sans-serif; }}
  .stage{{ min-height:100vh; background:var(--page); display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:14px; padding:24px 0 30px; }}
  .rail{{ display:flex; gap:16px; width:100%; max-width:1240px; overflow-x:auto;
    scroll-snap-type:x mandatory; padding:6px 22px 12px; scrollbar-width:none; }}
  .rail::-webkit-scrollbar{{ display:none; }}
  .post{{ flex:0 0 auto; width:min(90vw,560px); aspect-ratio:1/1; container-type:inline-size;
    scroll-snap-align:center; color:var(--ink); position:relative; overflow:hidden; border-radius:16px;
    background:linear-gradient(180deg, var(--c-top) 0%, var(--c-mid) 42%, var(--c-low) 100%);
    box-shadow:0 24px 62px -32px var(--shadow), 0 0 0 1px var(--frame-in) inset; }}
  .post::before{{ content:""; position:absolute; inset:0;
    background-image:radial-gradient(var(--dot) 1px, transparent 1.4px); background-size:26px 26px; opacity:.6; pointer-events:none; }}
  .post::after{{ content:""; position:absolute; inset:3cqw; border:1px solid var(--brd-2); border-radius:11px; pointer-events:none; }}
  .inner{{ position:relative; z-index:1; height:100%; padding:5.6cqw 6cqw; display:flex; flex-direction:column; }}
  .top{{ display:flex; align-items:center; justify-content:space-between; }}
  .logo .n{{ font-family:Georgia,serif; font-weight:700; font-size:4.6cqw; line-height:1; }}
  .logo .s{{ font-size:2.5cqw; color:var(--acc-dp); letter-spacing:.06em; margin-top:.5cqw; }}
  .pill{{ display:inline-flex; align-items:center; gap:1.4cqw; padding:1.6cqw 3cqw; border-radius:100px;
    background:var(--glass); border:1px solid var(--brd); font-size:2.5cqw; color:var(--acc-dp); backdrop-filter:blur(6px); }}
  .pill .dia{{ width:2cqw; height:2cqw; background:var(--acc); transform:rotate(45deg); border-radius:1px; }}
  .idx{{ font-size:2.4cqw; letter-spacing:.22em; color:var(--faint); }}
  .hero{{ position:relative; flex:1; display:flex; align-items:center; justify-content:center; margin-top:1cqw; min-height:0; }}
  .glow{{ position:absolute; width:82%; aspect-ratio:1; border-radius:50%;
    background:radial-gradient(circle, {glow0} 0%, {glow1} 44%, transparent 66%); animation:breathe 6s ease-in-out infinite; }}
  @keyframes breathe{{ 0%,100%{{ transform:scale(1); opacity:.88 }} 50%{{ transform:scale(1.07); opacity:1 }} }}
  .bottle{{ position:relative; height:100%; max-height:56cqw; width:auto; object-fit:contain; border-radius:10px;
    box-shadow:0 22px 38px -18px var(--shadow); }}
  .name{{ text-align:center; margin-top:1cqw; }}
  .name .house{{ font-size:3.1cqw; letter-spacing:.4em; text-indent:.4em; color:var(--acc-dp); font-weight:600; }}
  .name .title{{ font-family:Georgia,"Hoefler Text",serif; font-style:italic; font-weight:400; font-size:{titlesize}cqw; line-height:1;
    margin:1.2cqw 0 1cqw; text-wrap:balance; background:{title}; -webkit-background-clip:text; background-clip:text; color:transparent; }}
  .name .ar{{ font-size:3.2cqw; color:var(--muted); direction:rtl; }}
  .swipe{{ margin-top:auto; padding-top:2.4cqw; display:flex; align-items:center; justify-content:center; gap:1.6cqw;
    color:var(--faint); font-size:2.6cqw; letter-spacing:.16em; text-transform:uppercase; }}
  .swipe .arrow{{ color:var(--acc); animation:nudge 1.6s ease-in-out infinite; }}
  @keyframes nudge{{ 0%,100%{{ transform:translateX(0) }} 50%{{ transform:translateX(4px) }} }}
  .s-head{{ text-align:center; margin-top:2cqw; }}
  .s-head .k{{ font-size:2.6cqw; letter-spacing:.26em; color:var(--acc-dp); text-transform:uppercase; font-weight:600; }}
  .s-head h2{{ font-family:Georgia,serif; font-weight:400; font-style:italic; font-size:6.2cqw; margin-top:1cqw; color:var(--ink); }}
  .journey{{ position:relative; margin:auto 0; padding:1cqw 0; display:flex; flex-direction:column; gap:3.2cqw; }}
  .journey::before{{ content:""; position:absolute; left:9cqw; top:6cqw; bottom:6cqw; width:2px;
    background:linear-gradient(var(--acc),var(--acc-dp)); opacity:.6; }}
  .step{{ display:grid; grid-template-columns:18cqw 1fr; align-items:center; gap:4cqw; position:relative; }}
  .node{{ justify-self:center; width:7cqw; height:7cqw; border-radius:50%; background:var(--glass); border:1px solid var(--brd);
    display:flex; align-items:center; justify-content:center; backdrop-filter:blur(6px); position:relative; z-index:1; }}
  .node b{{ font-family:Georgia,serif; font-size:3cqw; color:var(--acc); }}
  .card{{ background:var(--glass); border:1px solid var(--brd); border-radius:12px; padding:3cqw 3.6cqw; backdrop-filter:blur(8px); }}
  .card .t{{ font-size:2.4cqw; letter-spacing:.2em; text-transform:uppercase; color:var(--acc-dp); font-weight:600; }}
  .card .n{{ margin-top:1cqw; font-family:Georgia,serif; font-size:3.4cqw; line-height:1.35; color:var(--ink); }}
  .credit{{ text-align:center; font-size:2.5cqw; color:var(--faint); letter-spacing:.04em; padding-top:1.6cqw; }}
  .offer{{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:3cqw; }}
  .ohead{{ display:flex; align-items:center; justify-content:space-between; }}
  .ohead .avail{{ font-size:2.6cqw; letter-spacing:.22em; color:var(--acc-dp); text-transform:uppercase; font-weight:600; }}
  .ohead .thumb{{ height:24cqw; border-radius:8px; box-shadow:0 14px 24px -14px var(--shadow); }}
  .line{{ background:var(--glass); border:1px solid var(--brd); border-radius:12px; padding:3.2cqw 3.6cqw; backdrop-filter:blur(8px);
    text-align:center; font-family:Georgia,serif; font-size:3cqw; line-height:1.5; color:var(--soft); }}
  .sizes{{ display:grid; grid-template-columns:repeat({ncols},1fr); gap:2.4cqw; }}
  .size{{ background:var(--glass); border:1px solid var(--brd); border-radius:11px; padding:2.6cqw 2cqw; text-align:center; }}
  .size.sel{{ background:linear-gradient(135deg,var(--acc),var(--acc-dp)); border-color:transparent; }}
  .size .lab{{ font-size:2.6cqw; color:var(--ink); font-weight:600; }}
  .size.sel .lab{{ color:#fff; }}
  .size .pr{{ font-size:2.5cqw; color:var(--muted); margin-top:.8cqw; font-variant-numeric:tabular-nums; }}
  .size.sel .pr{{ color:rgba(255,255,255,.9); }}
  .priceRow{{ display:flex; align-items:flex-end; justify-content:space-between; }}
  .bigprice .cur{{ font-size:3.4cqw; letter-spacing:.16em; color:var(--acc-dp); }}
  .bigprice .amt{{ font-family:Georgia,serif; font-size:12cqw; font-weight:700; line-height:1; font-variant-numeric:tabular-nums; }}
  .bigprice .size2{{ display:block; font-size:2.5cqw; color:var(--muted); letter-spacing:.14em; margin-top:1cqw; }}
  .cta{{ display:flex; align-items:center; justify-content:center; gap:2cqw; padding:3.2cqw; border-radius:12px;
    background:linear-gradient(135deg,var(--acc),var(--acc-dp)); color:{cta_ink}; font-size:3.4cqw; font-weight:700; letter-spacing:.04em;
    box-shadow:0 14px 30px -12px var(--shadow); }}
  .handle{{ display:inline-flex; align-items:center; gap:1.6cqw; font-size:3cqw; color:var(--muted); letter-spacing:.06em; }}
  .handle .g{{ width:2.4cqw; height:2.4cqw; border-radius:50%; background:linear-gradient(135deg,var(--acc),var(--acc-dp)); }}
  .dots{{ display:flex; gap:8px; }}
  .dots i{{ width:7px; height:7px; border-radius:50%; background:var(--muted); opacity:.4; }}
  .hint{{ color:var(--faint); font-size:12px; letter-spacing:.04em; }}
  @media (prefers-reduced-motion:reduce){{ .glow,.swipe .arrow{{ animation:none }} }}
</style>
<div class="stage"><div class="rail">
  <div class="post"><div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <span class="pill"><span class="dia"></span>فاخر</span></div>
    <div class="hero"><div class="glow"></div><img class="bottle" src="{IMG}" alt="{TITLE_EN} bottle" /></div>
    <div class="name"><div class="house">{HOUSE}</div><div class="title">{TITLE_DISPLAY}</div><div class="ar">{TITLE_AR}</div></div>
    <div class="swipe"><span>اسحب · swipe</span><span class="arrow">→</span></div>
  </div></div>
  <div class="post"><div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div><span class="idx">02 / 03</span></div>
    <div class="s-head"><div class="k">رحلة العطر · The Journey</div><h2>{TAGLINE}</h2></div>
    <div class="journey">{JOURNEY}</div>
    <div class="credit">{CREDIT}</div>
  </div></div>
  <div class="post"><div class="inner">
    <div class="top"><div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div><span class="idx">03 / 03</span></div>
    <div class="offer">
      <div class="ohead"><span class="avail">متوفر الآن · available</span><img class="bottle thumb" src="{IMG}" alt="{TITLE_EN}" /></div>
      {OFFER_MID}
      <div class="priceRow"><div class="bigprice"><span class="cur">LYD</span> <span class="amt">{PRICE}</span>
        <span class="size2">{SIZE}{CONC}</span></div><span class="handle"><span class="g"></span>shama.ly</span></div>
      <div class="cta">أضف للسلة · Add to bag</div>
    </div>
  </div></div>
</div>
<div class="dots"><i></i><i></i><i></i></div>
<p class="hint">3-slide square carousel · 1080 × 1080 · palette drawn from the product photo</p>
</div>"""

STEP = '<div class="step"><div class="node"><b>{i}</b></div><div class="card"><div class="t">{t}</div><div class="n">{n}</div></div></div>'

def rgba_from_hex_hls(h, l, s, a):
    hexc = from_hls(h, l, s)
    r, g, b = [int(hexc[i:i+2], 16) for i in (1, 3, 5)]
    return f"rgba({r},{g},{b},{a})"

def main():
    if len(sys.argv) < 2:
        sys.exit("usage: python generate.py <slug-or-name> [out.html]")
    term = sys.argv[1]
    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(__file__), "out",
        re.sub(r"[^a-z0-9]+", "-", term.lower()).strip("-") + ".html")
    os.makedirs(os.path.dirname(out), exist_ok=True)

    base, key = load_env()
    p = fetch_product(base, key, term)
    img_url = primary_image_url(p)

    img_bytes = urllib.request.urlopen(img_url, timeout=30).read()
    dark, h, s = sample_palette(img_bytes)
    tok = build_tokens(dark, h, s)
    data_uri = "data:image/jpeg;base64," + base64.b64encode(img_bytes).decode()

    # glow tints from accent hue
    tok["glow0"] = rgba_from_hex_hls(h, 0.62 if dark else 0.72, s, .30 if dark else .5)
    tok["glow1"] = rgba_from_hex_hls(h, 0.62 if dark else 0.72, s, .09 if dark else .16)

    # ----- content -----
    name = p["name"]
    house = name.split()[0].upper()
    display = name[len(name.split()[0]):].strip() or name
    tagline = "Discover the scent"
    notes = p.get("fragrance_notes") or {}
    tiers = [("Top · القمة", notes.get("top")), ("Heart · القلب", notes.get("middle")), ("Base · القاعدة", notes.get("base"))]
    journey = "".join(
        STEP.format(i=i+1, t=t, n=" · ".join(v)) for i, (t, v) in enumerate(tiers) if v)
    if not journey:
        journey = STEP.format(i=1, t="Notes", n="A luxury eau de parfum")

    # samples -> size selector; else a description line
    samples = sorted([x for x in (p.get("perfume_samples") or []) if x.get("is_active")],
                     key=lambda x: float(x["price"]))
    size_main = (p.get("size") or "100ml")
    if samples:
        cells = "".join(
            f'<div class="size"><div class="lab">{sm["size"]}</div><div class="pr">{fmt_int(sm["price"])} LYD</div></div>'
            for sm in samples)
        cells += f'<div class="size sel"><div class="lab">الحجم الأصلي</div><div class="pr">{fmt_int(p["price"])} LYD</div></div>'
        ncols = len(samples) + 1
        offer_mid = f'<div class="sizes" style="grid-template-columns:repeat({ncols},1fr)">{cells}</div>'
    else:
        ncols = 1
        desc = clamp_sentence((p.get("description") or "").strip())
        offer_mid = f'<div class="line">{desc}</div>' if desc else ""

    title_size = 9 if len(display) <= 11 else (7.2 if len(display) <= 18 else 6)

    html = TEMPLATE.format(
        TITLE_EN=name, TITLE_DISPLAY=display, TITLE_AR=p.get("name_ar") or "", HOUSE=house,
        TAGLINE=tagline, JOURNEY=journey, CREDIT="Eau de Parfum",
        PRICE=fmt_int(p["price"]), SIZE=size_main.upper(), CONC=conc_label(p.get("concentration")),
        OFFER_MID=offer_mid, ncols=ncols, titlesize=title_size,
        IMG=data_uri, **tok)

    open(out, "w").write(html)
    mood = "dark" if dark else "light"
    print(f"OK  {name}")
    print(f"    mood={mood}  accent={tok['acc']}  ground={tok['c_top']}→{tok['c_low']}")
    print(f"    wrote {out}  ({len(html)//1024} KB)")

if __name__ == "__main__":
    main()
