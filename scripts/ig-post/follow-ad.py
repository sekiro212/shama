#!/usr/bin/env python3
"""
Follower-acquisition carousel.

Different job from sample-ad.py: this one sells the account, not a bottle. It
shows the scent-profile series as a running thing and asks for the follow, on
the theory that people follow for what comes next, not for a discount. No
prices, no product links — a purchase CTA here would compete with the follow.

Character art and the perfume each one was paired with come from the lore
configs, so the montage can never claim a pairing the series did not publish.

    python3 scripts/ig-post/follow-ad.py

Then: node scripts/ig-post/render.cjs ad-follow ad-follow-ar
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
OUT = os.path.join(HERE, "out")
LORE = os.path.join(HERE, "lore")

HANDLE = "@shama.ly"

# Four entries with the widest reach between them: a game, a novelist, a
# caliph and a Libyan hero — deliberately not four of the same kind.
PICKS = ["malenia", "dostoevsky", "harun", "omar"]


def load_env(path):
    out = {}
    for line in open(path):
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*)", line)
        if m:
            out[m.group(1)] = m.group(2).strip().strip("\"'")
    return out


def enc(im, box, quality=86):
    im = im.convert("RGB")
    im.thumbnail((box, box))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def local_uri(path, box=620):
    return enc(Image.open(path), box)


def remote_uri(url, box=420):
    return enc(Image.open(io.BytesIO(urllib.request.urlopen(url, timeout=60).read())), box)


def product_name(base, key, slug):
    q = urllib.parse.urlencode({"select": "name,name_ar,image", "slug": f"eq.{slug}", "limit": "1"})
    req = urllib.request.Request(base.rstrip("/") + "/rest/v1/perfumes?" + q,
                                 headers={"apikey": key, "Authorization": "Bearer " + key})
    rows = json.load(urllib.request.urlopen(req, timeout=90))
    if not rows:
        sys.exit(f"no product with slug {slug}")
    return rows[0]


TPL = """<meta charset="utf-8"><title>{TITLE}</title>
<style>
  /* System fonts only — a webfont @import raced render.cjs's first screenshot. */
  *{{ box-sizing:border-box; margin:0; padding:0; }}
  body{{ background:#08070a; font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        display:flex; flex-direction:column; align-items:center; gap:18px; padding:26px 0 40px; }}
  .post{{ width:1080px; height:1080px; container-type:inline-size; position:relative;
         overflow:hidden; color:#f4efe4;
         background:radial-gradient(120% 95% at 22% 4%, #2b2333 0%, #14111b 52%, #07060a 100%); }}
  .post.rtl{{ direction:rtl; }}
  .frame{{ position:absolute; inset:2.4cqw; border:1px solid rgba(255,255,255,.16);
          border-radius:10px; pointer-events:none; }}
  .inner{{ position:relative; z-index:1; height:100%; padding:6.2cqw 6.6cqw;
          display:flex; flex-direction:column; }}
  .top{{ display:flex; align-items:center; justify-content:space-between; }}
  .logo .n{{ font-family:Georgia,serif; font-weight:700; font-size:4.2cqw; line-height:1; }}
  .logo .s{{ font-size:2.1cqw; color:#b3a9bd; margin-top:.7cqw; }}
  .tagsm{{ font-size:2.1cqw; letter-spacing:.32em; color:#c9a24a; text-transform:uppercase; }}
  .pg{{ direction:ltr; unicode-bidi:isolate; font-size:2.3cqw; letter-spacing:.2em; color:#9d94a8; }}
  .foot{{ margin-top:auto; display:flex; align-items:flex-end; justify-content:space-between; }}
  .rule{{ width:12cqw; height:2px; background:#c9a24a; }}
  .big{{ font-family:Georgia,'Hoefler Text',serif; font-weight:700; font-size:{HOOKSIZE}cqw;
        line-height:1.05; letter-spacing:-.02em; white-space:pre-line; }}
  .sub{{ font-size:3cqw; line-height:1.6; color:#c0b6c9; max-width:78%; }}

  /* slide 1 — four faces behind the promise */
  .faces{{ position:absolute; inset:0; display:grid; grid-template-columns:repeat(2,1fr);
          grid-template-rows:repeat(2,1fr); opacity:.5; }}
  .faces img{{ width:100%; height:100%; object-fit:cover; filter:grayscale(.35) contrast(1.05); }}
  .scrim{{ position:absolute; inset:0;
          background:linear-gradient(180deg, rgba(8,7,10,.55) 0%, rgba(8,7,10,.72) 42%,
                    rgba(8,7,10,.94) 72%, #07060a 100%); }}
  .hook{{ flex:1; display:flex; flex-direction:column; justify-content:flex-end; gap:2.6cqw;
         padding-bottom:2cqw; }}

  /* slide 2 — the pairings */
  .pairs{{ flex:1; display:flex; flex-direction:column; gap:2.4cqw; justify-content:center; }}
  .pair{{ display:grid; grid-template-columns:15cqw 1fr 15cqw; gap:3cqw; align-items:center; }}
  .pair img{{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:8px;
             box-shadow:0 6px 16px rgba(0,0,0,.55); }}
  .mid{{ text-align:center; }}
  .who{{ font-family:Georgia,serif; font-size:3.4cqw; line-height:1.15; }}
  .arrow{{ font-size:2.4cqw; color:#c9a24a; margin:.6cqw 0; }}
  .what{{ font-size:2.3cqw; color:#c0b6c9; line-height:1.3; }}
  .head2{{ font-family:Georgia,serif; font-size:4.6cqw; line-height:1.1; }}

  /* slide 3 — the ask */
  .cta{{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:3.4cqw; }}
  .handle{{ background:#c9a24a; color:#141018; border-radius:100px; padding:2.8cqw 5cqw;
           font-size:4.6cqw; font-weight:700; align-self:flex-start;
           direction:ltr; unicode-bidi:isolate; }}
</style>

<div class="post {RTL}">
  <div class="faces">{FACES}</div>
  <div class="scrim"></div>
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
    <div class="pairs">{PAIRS}</div>
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
      <div class="big" style="font-size:6.2cqw">{CTAHEAD}</div>
      <div class="sub">{CTASUB}</div>
      <div class="handle">{HANDLE}</div>
    </div>
    <div class="foot"><span class="pg">03 / 03</span><span class="tagsm">{FOOTNOTE}</span></div>
  </div>
</div>
"""


def build(rtl, base, anon):
    faces, pairs = "", ""
    for slug in PICKS:
        cfg = json.load(open(os.path.join(LORE, f"{slug}{'-ar' if rtl else ''}.json"), encoding="utf-8"))
        art = cfg.get("character_image")
        if not art:
            sys.exit(f"{slug}: no character_image in the config")
        art = art if os.path.isabs(art) else os.path.join(LORE, art)
        faces += f'<img src="{local_uri(art)}" alt="">'

        ps = cfg["product_slug"]
        ps = [ps] if isinstance(ps, str) else ps
        p = product_name(base, anon, ps[0])
        pname = p["name_ar"] if rtl and p.get("name_ar") else p["name"]
        pairs += (
            f'<div class="pair">'
            f'<img src="{local_uri(art, 320)}" alt="">'
            f'<div class="mid"><div class="who">{cfg["character"]}</div>'
            f'<div class="arrow">↓</div>'
            f'<div class="what">{pname}</div></div>'
            f'<img src="{remote_uri(p["image"])}" alt=""></div>')

    html = TPL.format(
        TITLE="Shama — follow", RTL="rtl" if rtl else "",
        HOOKSIZE=7.4 if rtl else 8.0,
        FACES=faces, PAIRS=pairs,
        KICKER="بروفايل عطري" if rtl else "Scent profile",
        HOOK="لو كانت الشخصيات\nتلبس عطورًا." if rtl else "If characters\nwore perfume.",
        SUB=("نأخذ شخصية — من لعبة، من رواية، من التاريخ — ونختار لها عطرًا حقيقيًا من الرفّ."
             if rtl else
             "We take a character — from a game, a novel, history — and choose them a real "
             "perfume off the shelf."),
        SWIPE="اسحب ←" if rtl else "swipe →",
        SHELF="من السلسلة" if rtl else "From the series",
        CTAHEAD="شخصية جديدة\nكل أسبوع." if rtl else "A new character\nevery week.",
        CTASUB=("تابعنا وما تفوّتش وحدة. وإذا عندك شخصية في بالك، اكتبها في التعليقات."
                if rtl else
                "Follow so you don't miss one. Got a character in mind? Put it in the comments."),
        HANDLE=HANDLE,
        FOOTNOTE="عطور فاخرة · ليبيا" if rtl else "Luxury perfume · Libya",
    )
    name = "ad-follow" + ("-ar" if rtl else "")
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"OK  {name}  ({len(PICKS)} characters)")
    return name


def main():
    env = load_env(os.path.join(ROOT, ".env"))
    base, anon = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]
    built = [build(rtl, base, anon) for rtl in (True, False)]
    print("\nrender with:\n  node scripts/ig-post/render.cjs " + " ".join(built))


if __name__ == "__main__":
    main()
