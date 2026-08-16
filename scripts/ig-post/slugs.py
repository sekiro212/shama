#!/usr/bin/env python3
"""
Emit the batch's work list from the live catalogue, one slug per line.

`keep-slugs.txt` was a hand-frozen list of 181 slugs; every product added after
it was written stayed invisible to batch.sh forever. This derives the list at
run time instead, so new stock enters the pipeline on its own.

    python3 scripts/ig-post/slugs.py              # every active product with an image
    python3 scripts/ig-post/slugs.py --missing    # only those with no rendered PNG yet

A product with no `image` URL is skipped either way — generate.py samples the
product photo to build the palette and cannot run without one.
"""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PNG = os.path.join(HERE, "out", "png")


def load_env(path):
    out = {}
    for line in open(path):
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*)", line)
        if m:
            out[m.group(1)] = m.group(2).strip().strip("\"'")
    return out


def main():
    env = load_env(os.path.join(ROOT, ".env"))
    base, anon = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]
    q = urllib.parse.urlencode({
        "select": "slug,image,is_active",
        "is_active": "eq.true",
        "order": "created_at.desc",
        "limit": "1000",
    })
    req = urllib.request.Request(base.rstrip("/") + "/rest/v1/perfumes?" + q,
                                 headers={"apikey": anon, "Authorization": "Bearer " + anon})
    rows = json.load(urllib.request.urlopen(req, timeout=90))

    slugs = [r["slug"] for r in rows if str(r.get("image") or "").startswith("http")]
    skipped = [r["slug"] for r in rows if not str(r.get("image") or "").startswith("http")]

    if "--missing" in sys.argv:
        done = set()
        if os.path.isdir(PNG):
            done = {re.sub(r"-\d+\.png$", "", f) for f in os.listdir(PNG) if f.endswith(".png")}
        slugs = [s for s in slugs if s not in done]

    for s in slugs:
        print(s)
    if skipped:
        print(f"skipped {len(skipped)} with no image: {', '.join(skipped)}", file=sys.stderr)


if __name__ == "__main__":
    main()
