#!/usr/bin/env python3
"""
Generate an Instagram caption per product for a catalogue slice.

    python3 scripts/ig-post/build-product-captions.py men

Writes scripts/ig-post/captions/<gender>/<slug>.txt, one per reel, so every
video ships with copy ready to paste. Nothing here is invented: the body is the
product's own Arabic description, and decant prices are read from
perfume_samples so a caption never advertises a size that is not on sale.
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))

CONC = {"edp": "أو دو بارفان", "edt": "أو دو تواليت", "parfum": "بارفان",
        "extrait": "إكستريه دو بارفان", "edc": "أو دو كولونيا"}

TAGS = {"women": "#عطور_نسائية", "men": "#عطور_رجالية", "unisex": "#عطور_للجنسين"}


def load_env(path):
    out = {}
    for line in open(path):
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*)", line)
        if m:
            out[m.group(1)] = m.group(2).strip().strip("\"'")
    return out


def get(base, key, table, q, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(
                base.rstrip("/") + "/rest/v1/" + table + "?" + urllib.parse.urlencode(q),
                headers={"apikey": key, "Authorization": "Bearer " + key})
            return json.load(urllib.request.urlopen(req, timeout=120))
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2 * (i + 1))


def main():
    gender = sys.argv[1] if len(sys.argv) > 1 else "women"
    env = load_env(os.path.join(ROOT, ".env"))
    base, key = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]
    outdir = os.path.join(HERE, "captions", gender)
    os.makedirs(outdir, exist_ok=True)

    rows = get(base, key, "perfumes", {
        "select": "id,slug,name,name_ar,price,size,concentration,description_ar,type",
        "is_active": "eq.true", "gender": f"eq.{gender}", "limit": "400"})
    idmap = {p["id"]: p["slug"] for p in rows}
    samples = defaultdict(list)
    for s in get(base, key, "perfume_samples",
                 {"select": "perfume_id,size,price,is_active", "limit": "3000"}):
        if s["is_active"] and s["perfume_id"] in idmap:
            samples[idmap[s["perfume_id"]]].append(s)

    ids_file = os.path.join("/tmp", f"{gender}-ids.txt")
    want = None
    if os.path.exists(ids_file):
        want = {l.strip() for l in open(ids_file) if l.strip()}

    n = 0
    for p in rows:
        if want is not None and p["slug"] not in want:
            continue
        desc = (p.get("description_ar") or "").strip()
        if not desc:
            continue
        name = (p.get("name_ar") or p["name"]).strip()
        line = " · ".join(x for x in [
            p.get("size"), CONC.get((p.get("concentration") or "").lower())] if x)

        block = ""
        ss = sorted(samples.get(p["slug"], []), key=lambda x: float(x["price"]))
        if ss:
            block = ("\nمتوفّر بالعيّنات:\n"
                     + "\n".join(f"• {s['size']} — {int(s['price'])} د.ل" for s in ss) + "\n")

        txt = (f"✨ {name}\n\n{desc}\n\n"
               f"{line} · {int(p['price'])} د.ل\n{block}\n"
               f"متوفّر على shama.ly أو عبر واتساب.\n\n"
               f"#شمة #عطور_فاخرة {TAGS.get(gender,'')} #عطور_ليبيا #طرابلس #نيتش\n")
        open(os.path.join(outdir, f"{p['slug']}.txt"), "w", encoding="utf-8").write(txt)
        n += 1

    print(f"wrote {n} captions -> {os.path.relpath(outdir, ROOT)}")


if __name__ == "__main__":
    main()
