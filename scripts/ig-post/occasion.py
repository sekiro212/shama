#!/usr/bin/env python3
"""
"وش تلبس في..." — a scent for the occasion.

Sister series to the character profiles, aimed at conversion rather than reach:
every entry answers a question someone actually has (gym, first date, wedding)
with bottles that are in stock. Libyan dialect, because the joke only lands
spoken.

    python3 scripts/ig-post/occasion.py legday

Then: node scripts/ig-post/render.cjs occ-legday occ-legday-ar
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

SETS = {
    "legday": dict(
        no="٠١", no_en="01",
        kicker_ar="وش تلبس في", kicker_en="What to wear to",
        title_ar="الجيم", title_en="the gym",
        hook_ar="يوم الأرجل\nمش يوم عطرك الغالي.",
        hook_en="Leg day is not\nthe day for your good bottle.",
        sub_ar="الـ٤٠٠٠ دينار متاعك ما يستاهلش يتبخّر على البار.",
        sub_en="Your 4,000-dinar extrait does not deserve the squat rack.",
        ask_ar="وشن تلبس انت في الجيم؟",
        ask_en="So what do you wear to the gym?",
        asksub_ar="قوللنا في الكومنت — وإذا ما عندكش، ابدأ بواحد من هاذي.",
        asksub_en="Tell us in the comments — and if you have none, start with one of these.",
        picks=[
            ("versace-eros", "نعناع وتفاح أخضر. حلو وما يخنق حد.",
             "Mint and green apple. Sweet, and it never chokes the room."),
            ("versace-dylan-blue-pour-homme", "مايّة ونظافة. أأمن اختيار في قاعة مسكّرة.",
             "Water and clean skin. The safest thing in a closed room."),
            ("kenzo-homme-intense", "هادي، ما يفوح على اللي جنبك.",
             "Quiet. It stays on you, not on the next machine."),
            ("acqua-di-gi-profondo-giorgio-armani", "بحر. لو تبي شي أرقى شوية.",
             "The sea. For when you want something a bit more grown-up."),
        ],
        accent="#7ec8a9", g0="#12302a", g1="#0a1a17",
        mute="#bccfc7", mute2="#93a8a0", scrim_rgb="4,13,11",
        # A real Libyan gym floor, not a stock rack — the series only works if the
        # room looks like the one the reader trains in.
        art="gym.jpg", art_position="center 42%", art_position_3="center 88%",
    ),
    "firstdate": dict(
        no="٠٢", no_en="02",
        kicker_ar="وش تلبس في", kicker_en="What to wear to",
        title_ar="أول موعد", title_en="a first date",
        hook_ar="المسافة بينكم ٦٠ سنتي.\nمش ٦ متر.",
        hook_en="The table is sixty centimetres wide.\nNot six metres.",
        sub_ar="بخّتين. اللي يشمّه هي بس — مش القهوة كاملة.",
        sub_en="Two sprays. She should smell it — not the whole café.",
        ask_ar="وشن لبست في أول موعد ليك؟",
        ask_en="So what did you wear to your first date?",
        asksub_ar="قوللنا في الكومنت. وقاعدة وحدة: بخّتين، مش خمسة.",
        asksub_en="Tell us in the comments. One rule: two sprays, not five.",
        picks=[
            ("ysl-y-eau-de-parfum", "نظيف وحديث. يقرّب منك بدون ما يهجم.",
             "Clean and modern. It invites her closer without shouting."),
            ("emporio-armani-stronger-with-you-intensely",
             "فانيليا وكستناء. هذا اللي يخلّيها تسأل «وش لابس؟»",
             "Vanilla and chestnut. This is the one that gets you asked."),
            ("bleu-de-chanel", "ما يغلطش. لو ما تعرفش وين باش تاخذها.",
             "It cannot be wrong. For when you don't know where the night goes."),
            ("parfums-de-marly-layton", "تفاح ولافندر. يقعد في الجو بعد ما تمشي.",
             "Apple and lavender. It stays in the room after you leave."),
        ],
        accent="#e3a76b", g0="#3a201a", g1="#1b0f0d",
        mute="#dcc6b6", mute2="#b09a8c", scrim_rgb="20,11,8",
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
    req = urllib.request.Request(base.rstrip("/") + "/rest/v1/" + path,
                                 headers={"apikey": key, "Authorization": "Bearer " + key})
    return json.load(urllib.request.urlopen(req, timeout=90))


def _encode(im, box, quality):
    im = im.convert("RGB")
    im.thumbnail((box, box))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality)
    return "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode()


def data_uri(url, box=560, quality=86):
    raw = urllib.request.urlopen(url, timeout=60).read()
    return _encode(Image.open(io.BytesIO(raw)), box, quality)


def local_uri(path, box=1400, quality=84):
    # Full-bleed backdrop: needs the long edge at ~2160px render scale, so it is
    # encoded far larger than the 14cqw product thumbnails.
    return _encode(Image.open(path), box, quality)


TPL = """<meta charset="utf-8"><title>{TITLE}</title>
<style>
  /* System fonts only — a webfont @import raced render.cjs's first screenshot. */
  *{{ box-sizing:border-box; margin:0; padding:0; }}
  body{{ background:#070a09; font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        display:flex; flex-direction:column; align-items:center; gap:18px; padding:26px 0 40px; }}
  .post{{ width:1080px; height:1080px; container-type:inline-size; position:relative;
         overflow:hidden; color:#f2f7f4;
         background:radial-gradient(120% 95% at 24% 6%, {G0} 0%, {G1} 52%, #06100e 100%); }}
  .post.rtl{{ direction:rtl; }}
  /* Backdrop = the occasion's actual room. `.dim` is the copy-dense picks slide,
     where a sharp photo competes with the four product thumbnails; the scale
     compensates for blur eating the edges. */
  .art{{ position:absolute; inset:0; background-size:cover; background-position:{ARTPOS}; }}
  /* Slide 3 re-crops low, onto the floor and the plates — sharing slide 1's
     framing made the last card read as a reprint of the first. */
  .p3 .art{{ background-position:{ARTPOS3}; }}
  .dim .art{{ filter:blur(3px) saturate(.8); transform:scale(1.05); }}
  .scrim{{ position:absolute; inset:0; background:{SCRIM}; }}
  .dim .scrim{{ background:{SCRIMDIM}; }}
  .frame{{ position:absolute; inset:2.4cqw; border:1px solid rgba(255,255,255,.16);
          border-radius:10px; pointer-events:none; }}
  .inner{{ position:relative; z-index:1; height:100%; padding:6.2cqw 6.6cqw;
          display:flex; flex-direction:column; }}
  .top{{ display:flex; align-items:center; justify-content:space-between; }}
  .logo .n{{ font-family:Georgia,serif; font-weight:700; font-size:4.2cqw; line-height:1; }}
  .logo .s{{ font-size:2.1cqw; color:{MUTE}; margin-top:.7cqw; }}
  .tagsm{{ font-size:2.1cqw; letter-spacing:.3em; color:{ACC}; text-transform:uppercase; }}
  .pg{{ direction:ltr; unicode-bidi:isolate; font-size:2.3cqw; letter-spacing:.2em; color:{MUTE2}; }}
  .foot{{ margin-top:auto; display:flex; align-items:flex-end; justify-content:space-between; }}
  .rule{{ width:12cqw; height:2px; background:{ACC}; }}
  .big{{ font-family:Georgia,'Hoefler Text',serif; font-weight:700; font-size:{HOOKSIZE}cqw;
        line-height:1.06; letter-spacing:-.02em; white-space:pre-line; }}
  /* 80% stranded "rack." on its own line in the English hook. */
  .sub{{ font-size:3cqw; line-height:1.6; color:{MUTE}; max-width:88%; }}

  /* slide 1 — the occasion, stated like a label */
  .hook{{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:2.8cqw; }}
  .occ{{ display:flex; align-items:baseline; gap:2cqw; flex-wrap:wrap; }}
  .occ .lab{{ font-size:3cqw; letter-spacing:.2em; color:{ACC}; }}
  .occ .val{{ font-family:Georgia,serif; font-size:6.6cqw; line-height:1; }}

  /* slide 2 — four picks, each with its one line */
  .list{{ flex:1; display:flex; flex-direction:column; gap:2.2cqw; justify-content:center; }}
  .row{{ display:grid; grid-template-columns:14cqw 1fr; gap:3.2cqw; align-items:center; }}
  .row img{{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:8px;
            box-shadow:0 6px 16px rgba(0,0,0,.5); }}
  .nm{{ font-family:Georgia,serif; font-size:3.2cqw; line-height:1.15; }}
  .ln{{ font-size:2.5cqw; color:{MUTE}; line-height:1.45; margin-top:.7cqw; }}
  .head2{{ font-family:Georgia,serif; font-size:4.6cqw; line-height:1.1; }}

  /* slide 3 — the question back */
  .cta{{ flex:1; display:flex; flex-direction:column; justify-content:center; gap:3.2cqw; }}
</style>

<div class="post {RTL}">
  {ART}
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <div class="tagsm">{SERIES}</div>
    </div>
    <div class="hook">
      <div class="occ"><span class="lab">{KICKER}</span><span class="val">{OCC}</span></div>
      <div class="rule"></div>
      <div class="big">{HOOK}</div>
      <div class="sub">{SUB}</div>
    </div>
    <div class="foot"><span class="pg">01 / 03</span><span class="tagsm">{SWIPE}</span></div>
  </div>
</div>

<div class="post dim {RTL}">
  {ART}
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="head2">{SHELF}</div>
      <div class="tagsm">{SERIES}</div>
    </div>
    <div class="list">{ROWS}</div>
    <div class="foot"><span class="pg">02 / 03</span><span class="tagsm">shama.ly</span></div>
  </div>
</div>

<div class="post p3 {RTL}">
  {ART}
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <div class="tagsm">{SERIES}</div>
    </div>
    <div class="cta">
      <div class="rule"></div>
      <div class="big" style="font-size:6.4cqw">{ASK}</div>
      <div class="sub">{ASKSUB}</div>
    </div>
    <div class="foot"><span class="pg">03 / 03</span><span class="tagsm">{FOOTNOTE}</span></div>
  </div>
</div>
"""

MULTIWORD = ("Acqua di Giò", "Dolce & Gabbana", "Giorgio Armani")


def short_name(name):
    # Trailing-house rows like "Acqua di Giò Profondo Giorgio Armani" read badly
    # with the house on the front of the line.
    for h in ("Giorgio Armani", "Dolce&Gabbana", "Dolce & Gabbana"):
        if name.endswith(h):
            return name[: -len(h)].strip()
    return name


# A concentration tail is dead weight on a row this narrow — "إيف سان لوران واي
# او دو بارفان" wraps where "إيف سان لوران واي" does not.
CONC_AR = re.compile(r"\s*[أاإ]و\s+دو\s+(بارفان|تواليت|كولون)\s*$")
CONC_EN = re.compile(r"\s+Eau\s+de\s+(Parfum|Toilette|Cologne)\s*$", re.I)


def strip_concentration(name):
    return CONC_EN.sub("", CONC_AR.sub("", name)).strip()


def build(key_name, cfg, base, anon, rtl):
    rows = ""
    for slug, line_ar, line_en in cfg["picks"]:
        r = api(base, anon, "perfumes?" + urllib.parse.urlencode(
            {"select": "name,name_ar,image,is_active", "slug": f"eq.{slug}", "limit": "1"}))
        if not r:
            sys.exit(f"{key_name}: no product with slug {slug}")
        p = r[0]
        if not p["is_active"] or not (p["image"] or "").startswith("http"):
            sys.exit(f"{key_name}: {slug} inactive or image not a URL")
        nm = p["name_ar"] if rtl and p.get("name_ar") else short_name(p["name"])
        nm = strip_concentration(nm)
        rows += (f'<div class="row"><img src="{data_uri(p["image"])}" alt="">'
                 f'<div><div class="nm">{nm}</div>'
                 f'<div class="ln">{line_ar if rtl else line_en}</div></div></div>')

    rgb = cfg.get("scrim_rgb", "4,13,11")
    art = ""
    if cfg.get("art"):
        ap = cfg["art"]
        if not os.path.isabs(ap):
            ap = os.path.join(HERE, "art", ap)
        art = (f'<div class="art" style="background-image:url({local_uri(ap)})"></div>'
               '<div class="scrim"></div>')

    html = TPL.format(
        TITLE=f"Shama — {key_name}", RTL="rtl" if rtl else "",
        ART=art, ARTPOS=cfg.get("art_position", "center"),
        ARTPOS3=cfg.get("art_position_3", cfg.get("art_position", "center")),
        # Heavy enough that Georgia at 7cqw stays legible over a lit mirror wall,
        # light enough that the room is still readable. Tinted per set — a
        # green-black veil over a warm room turns the photo to sludge.
        SCRIM=cfg.get("scrim", f"linear-gradient(180deg, rgba({rgb},.66) 0%, "
                               f"rgba({rgb},.80) 52%, rgba({rgb},.95) 100%)"),
        SCRIMDIM=cfg.get("scrim_dim", f"linear-gradient(180deg, rgba({rgb},.80) 0%, "
                                      f"rgba({rgb},.89) 100%)"),
        G0=cfg["g0"], G1=cfg["g1"], ACC=cfg["accent"],
        MUTE=cfg.get("mute", "#bccfc7"), MUTE2=cfg.get("mute2", "#93a8a0"),
        HOOKSIZE=7.4 if rtl else 7.0,
        SERIES=f'{cfg["kicker_ar"] if rtl else cfg["kicker_en"]} {"—" if rtl else "·"} {cfg["no"] if rtl else cfg["no_en"]}',
        KICKER=cfg["kicker_ar"] if rtl else cfg["kicker_en"],
        OCC=cfg["title_ar"] if rtl else cfg["title_en"],
        HOOK=cfg["hook_ar"] if rtl else cfg["hook_en"],
        SUB=cfg["sub_ar"] if rtl else cfg["sub_en"],
        SWIPE="اسحب ←" if rtl else "swipe →",
        SHELF="اختياراتنا" if rtl else "Our picks",
        ROWS=rows,
        ASK=cfg["ask_ar"] if rtl else cfg["ask_en"],
        ASKSUB=cfg["asksub_ar"] if rtl else cfg["asksub_en"],
        FOOTNOTE="عطور فاخرة · ليبيا" if rtl else "Luxury perfume · Libya",
    )
    name = f"occ-{key_name}" + ("-ar" if rtl else "")
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"OK  {name}  ({len(cfg['picks'])} picks)")
    return name


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
