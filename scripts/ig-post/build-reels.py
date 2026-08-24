#!/usr/bin/env python3
"""
Generate the Remotion reel props from the existing lore configs.

Twelve characters, each already carrying its palette, question, why-line and
note chips in scripts/ig-post/lore/*.json. Re-typing all of that into Root.tsx
would mean two sources of truth that drift, so this reads the configs, pulls
the matching bottles from Supabase, copies every asset into public/lore/, and
writes src/remotion/lore/characters.ts for Root.tsx to map over.

    python3 scripts/ig-post/build-reels.py

Arabic copy comes from the -ar.json variant, which is where the translated
character name, epithet, question and chips already live.
"""
import json
import os
import re
import shutil
import sys
import urllib.parse
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
LORE = os.path.join(HERE, "lore")
PUBLIC = os.path.join(ROOT, "public", "lore")
OUT_TS = os.path.join(ROOT, "src", "remotion", "lore", "characters.ts")

# tribute mode has no product to pair, and the roster/greeting configs are not
# characters at all
SKIP = {
    "omar-mukhtar", "nightreign", "nightreign-carousel", "mawlid", "wylder",
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


def ts(v):
    return json.dumps(v, ensure_ascii=False)


def main():
    env = load_env(os.path.join(ROOT, ".env"))
    base, key = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]
    os.makedirs(PUBLIC, exist_ok=True)

    entries = []
    for f in sorted(os.listdir(LORE)):
        if not f.endswith(".json") or f.endswith("-ar.json"):
            continue
        slug = f[:-5]
        if slug in SKIP:
            continue
        cfg = json.load(open(os.path.join(LORE, f), encoding="utf-8"))
        ar_path = os.path.join(LORE, f"{slug}-ar.json")
        if not os.path.exists(ar_path):
            print(f"skip {slug}: no -ar variant")
            continue
        ar = json.load(open(ar_path, encoding="utf-8"))

        art = cfg.get("character_image")
        if not art:
            print(f"skip {slug}: no character image")
            continue
        src = art if os.path.isabs(art) else os.path.join(LORE, art)
        if not os.path.exists(src):
            print(f"skip {slug}: art missing at {src}")
            continue
        art_name = f"{slug}-art.jpg"
        shutil.copy(src, os.path.join(PUBLIC, art_name))

        slugs = cfg["product_slug"]
        if isinstance(slugs, str):
            slugs = [slugs]
        bottles, ar_names = [], []
        for i, ps in enumerate(slugs):
            r = api(base, key, "perfumes?" + urllib.parse.urlencode(
                {"select": "name,name_ar,image,is_active,price,size",
                 "slug": f"eq.{ps}", "limit": "1"}))
            if not r or not r[0]["is_active"]:
                print(f"skip {slug}: {ps} missing or inactive")
                bottles = []
                break
            p = r[0]
            fn = f"{slug}-bottle{i + 1}.jpg"
            urllib.request.urlretrieve(p["image"], os.path.join(PUBLIC, fn))
            bottles.append(f"lore/{fn}")
            ar_names.append(p.get("name_ar") or p["name"])
            if i == 0:
                price, size = p["price"], p.get("size") or ""
        if not bottles:
            continue

        pal = cfg["palette"]
        entries.append({
            "id": slug,
            "characterImage": f"lore/{art_name}",
            "bottleImages": bottles,
            "kicker": ar.get("kicker", "لو كان له عطر"),
            "character": ar.get("character", cfg["character"]),
            "epithet": ar.get("epithet", cfg.get("epithet", "")),
            "question": ar.get("question", cfg.get("question", "")),
            "house": "",
            "product": " + ".join(ar_names),
            "why": cfg.get("why_ar", ""),
            "notes": ar.get("note_chips", [])[:6],
            "price": f"{int(price)} د.ل" + (f" · {size}" if size else ""),
            "palette": {
                "g0": pal["G0"], "g1": pal["G1"], "g2": pal["G2"],
                "ink": pal["INK"], "soft": pal["SOFT"], "acc": pal["ACC"],
            },
        })
        print(f"OK  {slug:16} {len(bottles)} bottle(s)")

    body = ",\n".join(
        "  {\n" + ",\n".join(f"    {k}: {ts(v)}" for k, v in e.items()) + "\n  }"
        for e in entries)
    src_ts = (
        "// مولَّد آليًّا بواسطة scripts/ig-post/build-reels.py — لا يُحرَّر يدويًّا.\n"
        "// المصدر: scripts/ig-post/lore/*.json\n"
        'import type { LoreReelProps } from "./LoreReel";\n'
        'import type { LorePalette } from "./theme";\n\n'
        "export type CharacterEntry = Omit<LoreReelProps, \"language\"> & {\n"
        "  id: string;\n  palette: LorePalette;\n};\n\n"
        f"export const CHARACTERS: CharacterEntry[] = [\n{body},\n];\n")
    open(OUT_TS, "w", encoding="utf-8").write(src_ts)
    print(f"\nwrote {len(entries)} characters -> {os.path.relpath(OUT_TS, ROOT)}")


if __name__ == "__main__":
    main()
