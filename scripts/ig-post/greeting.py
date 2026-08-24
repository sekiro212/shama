#!/usr/bin/env python3
"""
Occasion greeting — Mawlid, Ramadan, Eid.

A religious occasion is not a sales slot. The greeting carries the post and the
bottles sit underneath as a quiet second slide, because a hard CTA on Mawlid
reads as using the occasion rather than marking it.

    python3 scripts/ig-post/greeting.py scripts/ig-post/lore/mawlid.json
    node scripts/ig-post/render.cjs greeting-mawlid

Ornament is drawn here rather than sourced — an eight-fold girih rosette, the
geometry that is everywhere in Islamic architecture and belongs to nobody.
"""
import base64
import io
import json
import math
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


def data_uri(url, box=520, quality=88):
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


def rosette(cx, cy, r, acc):
    """One eight-fold girih rosette: two squares crossed, inside two circles."""
    pts = lambda n, rot: " ".join(
        f"{cx + r * math.cos(math.radians(rot + i * 360 / n)):.1f},"
        f"{cy + r * math.sin(math.radians(rot + i * 360 / n)):.1f}"
        for i in range(n))
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" stroke="{acc}" '
            f'stroke-opacity=".22" stroke-width="1.2"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r*0.62:.1f}" fill="none" stroke="{acc}" '
            f'stroke-opacity=".14" stroke-width="1"/>'
            f'<polygon points="{pts(4, 0)}" fill="none" stroke="{acc}" '
            f'stroke-opacity=".30" stroke-width="1.2"/>'
            f'<polygon points="{pts(4, 45)}" fill="none" stroke="{acc}" '
            f'stroke-opacity=".30" stroke-width="1.2"/>'
            f'<polygon points="{pts(8, 22.5)}" fill="none" stroke="{acc}" '
            f'stroke-opacity=".18" stroke-width="1"/>')


def ornament(acc, w=1080, h=1350, step=190):
    """Tiled rosettes, faint enough to read as texture rather than pattern."""
    body = "".join(
        rosette(x, y, step * 0.46, acc)
        for y in range(-step // 2, h + step, step)
        for x in range(-step // 2, w + step, step))
    return (f'<svg viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg" '
            f'aria-hidden="true">{body}</svg>')


TPL = """<meta charset="utf-8"><title>{TITLE}</title>
<style>
  /* System fonts only — a webfont @import raced render.cjs's first screenshot. */
  *{{ box-sizing:border-box; margin:0; padding:0; }}
  /* Block, not a flex column: render.cjs pins .post with `flex:0 0 1080px`, and
     flex-basis in a column container is HEIGHT, which would eat the 4:5. */
  body{{ background:#050b09; font-family:system-ui,-apple-system,"Segoe UI",sans-serif;
        display:block; text-align:center; padding:26px 0 40px; }}
  .post{{ width:min(92vw,1080px); aspect-ratio:4/5; margin:0 auto 18px; text-align:start;
         direction:rtl; container-type:inline-size; position:relative; overflow:hidden;
         color:{INK};
         background:radial-gradient(120% 85% at 50% 8%, {G0} 0%, {G1} 55%, {G2} 100%); }}
  .orn{{ position:absolute; inset:0; opacity:.5; }}
  .orn svg{{ width:100%; height:100%; }}
  .glow{{ position:absolute; left:50%; top:26%; width:78cqw; aspect-ratio:1;
         transform:translate(-50%,-50%); border-radius:50%;
         background:radial-gradient(circle,{GLOW} 0%,transparent 68%); }}
  .frame{{ position:absolute; inset:2.2cqw; border:1px solid {BRD}; border-radius:9px; }}
  .inner{{ position:relative; z-index:2; height:100%; padding:5.4cqw 6cqw;
          display:flex; flex-direction:column; }}
  .top{{ display:flex; align-items:flex-start; justify-content:space-between; }}
  .logo .n{{ font-family:Georgia,serif; font-weight:700; font-size:3.8cqw; line-height:1;
            direction:ltr; }}
  .logo .s{{ font-size:1.9cqw; color:{SOFT}; margin-top:.5cqw; }}
  .tag{{ font-size:1.9cqw; color:{ACC}; text-align:start; }}

  .mid{{ flex:1; display:flex; flex-direction:column; align-items:center;
        justify-content:center; text-align:center; gap:2.6cqw; }}
  .eyebrow{{ font-size:2.4cqw; color:{ACC}; }}
  /* Arabic display type: tashkeel rides outside the em box, so the line-height
     stays generous or the marks collide with whatever sits above. */
  .big{{ font-family:Georgia,'Hoefler Text',serif; font-weight:700;
        font-size:{BIGSIZE}cqw; line-height:1.35; }}
  .sub{{ font-size:3cqw; line-height:1.7; color:{SOFT}; max-width:86%; }}
  .rule{{ width:26cqw; height:1px; background:{ACC}; opacity:.55; }}

  .quote{{ font-size:3.1cqw; line-height:1.85; color:{INK}; text-align:center;
          max-width:92%; margin:0 auto; }}
  .attr{{ font-size:2.2cqw; color:{SOFT}; margin-top:2cqw; text-align:center; }}
  .row{{ display:flex; gap:2.6cqw; margin-top:auto; }}
  .cell{{ flex:1; text-align:center; }}
  .cell img{{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:7px;
             box-shadow:0 12px 28px -14px rgba(0,0,0,.9); }}
  .cell .nm{{ font-size:2.1cqw; line-height:1.35; margin-top:1.4cqw; color:{SOFT}; }}
  .foot{{ display:flex; align-items:center; justify-content:space-between;
         margin-top:3cqw; font-size:2cqw; color:{SOFT}; }}
  .foot .g{{ width:1.7cqw; height:1.7cqw; border-radius:50%; background:{ACC};
            display:inline-block; margin-inline-end:1cqw; }}
  .hint{{ color:#4d5a54; font-size:12px; }}
</style>

<div class="post">
  <div class="orn">{ORN}</div>
  <div class="glow"></div>
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <div class="tag">{DATELINE}</div>
    </div>
    <div class="mid">
      <div class="eyebrow">{EYEBROW}</div>
      <div class="big">{HEADLINE}</div>
      <div class="rule"></div>
      <div class="sub">{SUB}</div>
    </div>
    <div class="foot"><span><span class="g"></span>shama.ly</span><span>{FOOTNOTE}</span></div>
  </div>
</div>

<div class="post">
  <div class="orn">{ORN}</div>
  <div class="frame"></div>
  <div class="inner">
    <div class="top">
      <div class="logo"><div class="n">Shama</div><div class="s">عطور فاخرة</div></div>
      <div class="tag">{DATELINE}</div>
    </div>
    <div class="mid">
      <div class="quote">{QUOTE}</div>
      <div class="attr">{ATTR}</div>
    </div>
    <div class="row">{CELLS}</div>
    <div class="foot"><span><span class="g"></span>shama.ly</span><span>{FOOTNOTE2}</span></div>
  </div>
</div>
<p class="hint">greeting · 2 slides · 1080 × 1350 (4:5)</p>
"""


def main():
    if len(sys.argv) < 2:
        sys.exit("usage: greeting.py <config.json> [out.html]")
    cfg = json.load(open(sys.argv[1], encoding="utf-8"))
    env = load_env(os.path.join(ROOT, ".env"))
    base, key = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]
    pal = cfg["palette"]

    cells = ""
    for e in cfg.get("products", []):
        r = api(base, key, "perfumes?" + urllib.parse.urlencode(
            {"select": "name,name_ar,image,is_active", "slug": f"eq.{e['slug']}", "limit": "1"}))
        if not r:
            sys.exit(f"no product with slug {e['slug']}")
        if not r[0]["is_active"]:
            sys.exit(f"{e['slug']} is inactive")
        label = e.get("label") or r[0].get("name_ar") or r[0]["name"]
        cells += (f'<div class="cell"><img src="{data_uri(r[0]["image"])}" alt="">'
                  f'<div class="nm">{label}</div></div>')

    html = TPL.format(
        TITLE=cfg["headline"], ORN=ornament(pal["ACC"]),
        DATELINE=cfg.get("dateline", ""), EYEBROW=cfg.get("eyebrow", ""),
        HEADLINE=cfg["headline"], SUB=cfg.get("sub", ""),
        BIGSIZE=cfg.get("big_size", 8.4),
        QUOTE=cfg.get("quote", ""), ATTR=cfg.get("attribution", ""),
        CELLS=cells, FOOTNOTE=cfg.get("footnote", "عطور فاخرة · ليبيا"),
        FOOTNOTE2=cfg.get("footnote2", "عطور فاخرة · ليبيا"), **pal)

    out = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        HERE, "out", cfg.get("slug_out", "greeting") + ".html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8").write(html)
    print(f'OK  {cfg["headline"]} -> {os.path.basename(out)}')


if __name__ == "__main__":
    main()
