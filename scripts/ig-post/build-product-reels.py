#!/usr/bin/env python3
"""
Generate ProductReel props for a whole slice of the catalogue.

    python3 scripts/ig-post/build-product-reels.py women

Writes src/remotion/lore/products.ts and copies every bottle into
public/lore/products/. Root.tsx maps over the list, so adding a slice is a
config change rather than fifty hand-written prop blocks.

The pyramid is stored in English, so notes are translated here. Anything
already in Arabic passes through; a few rows have a whole tier squashed into
one string ("الكمثري  تانجرين  البرغموت") and are split on the double space.
"""
import json
import os
import re
import sys
import time
import colorsys
import urllib.parse
import urllib.request
from collections import Counter

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
PUBLIC = os.path.join(ROOT, "public", "lore", "products")
OUT_DIR = os.path.join(ROOT, "src", "remotion", "lore")

AR = {
 "Vanilla":"فانيليا","Musk":"مسك","Musks":"مسك","Bergamot":"برغموت","Patchouli":"باتشولي",
 "Jasmine":"ياسمين","Orange Blossom":"زهر البرتقال","Sandalwood":"خشب الصندل","Amber":"عنبر",
 "Rose":"ورد","Mandarin":"ماندرين","Mandarin Orange":"ماندرين","Ylang-Ylang":"يلانغ يلانغ",
 "Vetiver":"فيتيفر","Peony":"فاوانيا","Pear":"كمثرى","Cedar":"أرز","Cedarwood":"خشب الأرز",
 "Blackcurrant":"كشمش أسود","Neroli":"نيرولي","Tuberose":"مسك الروم","Magnolia":"ماغنوليا",
 "Turkish Rose":"ورد تركي","Incense":"بخور","Pink Pepper":"فلفل وردي","Osmanthus":"أوسمانثوس",
 "Raspberry":"توت العليق","Melon":"شمّام","Violet":"بنفسج","Pomegranate":"رمّان","Iris":"سوسن",
 "Orris":"سوسن","Tonka Bean":"حبوب التونكا","Tonka":"تونكا","Bulgarian Rose":"ورد بلغاري",
 "Orchid":"أوركيد","Oakmoss":"طحلب البلوط","Moss":"طحلب","Yuzu":"يوزو","Lotus":"لوتس",
 "Lemon":"ليمون","Geranium":"جيرانيوم","White Peach":"خوخ أبيض","White Flowers":"زهور بيضاء",
 "White Musk":"مسك أبيض","White Musks":"مسك أبيض","Akigalawood":"أكيغالاوود",
 "Cashmeran":"كشميران","Lychee":"ليتشي","Litchi":"ليتشي","Rhubarb":"راوند","Pepper":"فلفل",
 "Cardamom":"هيل","Gardenia":"غاردينيا","Lilac":"ليلك","Bourbon Vanilla":"فانيليا البوربون",
 "Vanilla Bourbon":"فانيليا البوربون","Almond":"لوز","Rum":"رَم","Ambroxan":"أمبروكسان",
 "Plum":"برقوق","Benzoin":"بنزوين","Woody Notes":"نفحات خشبية","Lavender":"لافندر",
 "Mimosa":"ميموزا","Frangipani":"فرانجيباني","Grapefruit":"جريب فروت","Ice Accord":"أكورد جليدي",
 "Mahogany":"ماهوغني","Mahogany Wood":"خشب الماهوغني","Green Apple":"تفاح أخضر","Apple":"تفاح",
 "Rose Petals":"بتلات الورد","Wisteria":"وستارية","Praline":"برالين","Tiaré Flower":"زهرة التياري",
 "Tiare Flower":"زهرة التياري","Lily of the Valley":"زنبق الوادي","Lily-of-the-Valley":"زنبق الوادي",
 "Lily":"زنبق","Orange":"برتقال","Cherry":"كرز","Cherry Accord":"أكورد الكرز","Saffron":"زعفران",
 "Ginger":"زنجبيل","Almond Milk":"حليب اللوز","Pineapple":"أناناس","Blueberry":"توت أزرق",
 "Rose de Mai":"ورد مايو","Water Notes":"نفحات مائية","Jasmine Grandiflorum":"ياسمين كبير الزهر",
 "Jasmine Sambac":"ياسمين سامباك","Jasmine Absolute":"مطلق الياسمين",
 "Jasmine Superinfusion":"خلاصة الياسمين","White Honey":"عسل أبيض","Virginia Cedar":"أرز فرجينيا",
 "Virginian Cedar":"أرز فرجينيا","Bergamot Essence":"زيت البرغموت","Neroli Bud":"برعم النيرولي",
 "Neroli Essence":"زيت النيرولي","Ambrofix":"أمبروفيكس","Serenolide":"سيرينولايد",
 "Coconut Water":"ماء جوز الهند","Coconut":"جوز الهند","Calypsone":"كاليبسون",
 "Pink Berry":"توت وردي","Meringue":"مرينغ","Damascena Rose":"ورد دمشقي",
 "Damask Rose Essence":"زيت الورد الدمشقي","Damask Rose Absolute":"مطلق الورد الدمشقي",
 "Candied Lemon":"ليمون مسكّر","Panna Cotta":"بانا كوتا","Coumarin":"كومارين",
 "Pear Blossom":"زهر الكمثرى","Madagascar Vanilla":"فانيليا مدغشقر",
 "Madagascan Vanilla":"فانيليا مدغشقر","Amberwood":"خشب العنبر","Cacao Pod":"ثمرة الكاكاو",
 "Cacao":"كاكاو","Cocoa":"كاكاو","Caramel":"كراميل","Pitaya":"فاكهة التنين",
 "Dragon Fruit":"فاكهة التنين","Cherry Peony":"فاوانيا الكرز","Red Frangipani":"فرانجيباني أحمر",
 "Solar Vanilla":"فانيليا شمسية","Aldehydes":"ألدهيدات","Rosemary":"إكليل الجبل",
 "Pimento":"فلفل حارّ","Carnation":"قرنفل هندي","Clove":"قرنفل","Frankincense":"لبان",
 "Peach":"خوخ","Heliotrope":"هليوتروب","Honey":"عسل","Galbanum":"غلبانوم",
 "Green Leaves":"أوراق خضراء","Mango Blossom":"زهر المانجو","Tahitian Gardenia":"غاردينيا تاهيتي",
 "Artemisia":"شيح","Violet Leaf":"ورق البنفسج","Tolu Balsam":"بلسم تولو",
 "Carrot Seeds":"بذور الجزر","Beeswax":"شمع العسل","Dried Fruits":"فواكه مجفّفة",
 "Strawberry":"فراولة","Anise":"يانسون","Leather":"جلد","Grapefruit Blossom":"زهر الجريب فروت",
 "Hibiscus Seed":"بذور الكركديه","Tobacco":"تبغ","Cypress":"سرو","Parasol Pine":"صنوبر مظلّي",
 "Pink Laurel":"غار وردي","Sesame":"سمسم","White Grapefruit":"جريب فروت أبيض",
 "Red Berries":"توت أحمر","Sugared Petals":"بتلات مسكّرة","Soft Spices":"توابل ناعمة",
 "Warm Musk":"مسك دافئ","Creamy Woods":"أخشاب كريمية",
}

def palette_from(path):
    """Derive a dark gradient + accent from the bottle photo.

    One shared palette across forty-six products put a pink Prada bottle on an
    amber ground. Sampling each shot the way generate.py does keeps every reel
    in its own product's colour.
    """
    im = Image.open(path).convert("RGB")
    im.thumbnail((120, 120))
    px = [c for c in im.getdata()]
    # ignore near-white and near-black so the backdrop does not decide the hue
    lively = []
    for r, g, b in px:
        h, l, sat = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if 0.12 < l < 0.88 and sat > 0.18:
            lively.append((h, sat, l))
    if not lively:
        return dict(g0="#3a3026", g1="#1d1811", g2="#0c0a07",
                    ink="#f7f1e6", soft="#c8bba6", acc="#d8a552")
    hb = Counter(round(h * 24) for h, _, _ in lively).most_common(1)[0][0]
    hue = hb / 24.0
    sat = sorted(s for h, s, _ in lively if round(h * 24) == hb)[len(
        [1 for h, _, _ in lively if round(h * 24) == hb]) // 2]
    sat = max(0.30, min(0.72, sat))

    def hexof(h, l, s_):
        r, g, b = colorsys.hls_to_rgb(h, l, s_)
        return "#%02X%02X%02X" % (int(r * 255), int(g * 255), int(b * 255))

    return dict(
        g0=hexof(hue, 0.24, sat * 0.85),
        g1=hexof(hue, 0.11, sat * 0.75),
        g2=hexof(hue, 0.045, sat * 0.6),
        ink="#F7F2EA",
        soft=hexof(hue, 0.72, sat * 0.32),
        acc=hexof(hue, 0.60, min(0.85, sat + 0.22)),
    )


SPLIT = re.compile(r"\s{2,}")
ARABIC = re.compile(r"[؀-ۿ]")


def ar_note(x):
    """Translate one note, pass Arabic through, split squashed multi-note rows."""
    x = str(x).strip()
    if ARABIC.search(x):
        return [p.strip() for p in SPLIT.split(x) if p.strip()]
    return [AR.get(x, x)]


def tier(notes, key, cap=4):
    out = []
    for n in (notes.get(key) or []):
        out.extend(ar_note(n))
        if len(out) >= cap:
            break
    return " · ".join(out[:cap])


def sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!؟])\s+", (text or "").strip()) if s.strip()]


def load_env(path):
    out = {}
    for line in open(path):
        m = re.match(r"\s*([A-Z_]+)\s*=\s*(.*)", line)
        if m:
            out[m.group(1)] = m.group(2).strip().strip("\"'")
    return out


def get(base, key, q, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(base.rstrip("/") + "/rest/v1/perfumes?" +
                                         urllib.parse.urlencode(q),
                                         headers={"apikey": key, "Authorization": "Bearer " + key})
            return json.load(urllib.request.urlopen(req, timeout=120))
        except Exception:
            if i == tries - 1:
                raise
            time.sleep(2)


def main():
    gender = sys.argv[1] if len(sys.argv) > 1 else "women"
    out_ts = os.path.join(OUT_DIR, f"products-{gender}.ts")
    env = load_env(os.path.join(ROOT, ".env"))
    base, key = env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]
    os.makedirs(PUBLIC, exist_ok=True)

    rows = get(base, key, {
        "select": "slug,name,name_ar,price,size,concentration,stock_quantity,"
                  "fragrance_notes,description_ar,image,type",
        "is_active": "eq.true", "gender": f"eq.{gender}", "limit": "300"})

    CONC = {"edp": "أو دو بارفان", "edt": "أو دو تواليت", "parfum": "بارفان",
            "extrait": "إكستريه دو بارفان", "edc": "أو دو كولونيا"}

    out, skipped = [], []
    for p in rows:
        # customer gift bundles are not products to review
        if p.get("type") == "gift" or p["name"].strip().lower().endswith("gift set"):
            skipped.append((p["slug"], "gift set"))
            continue
        n = p.get("fragrance_notes") or {}
        if not all(n.get(k) for k in ("top", "middle", "base")):
            skipped.append((p["slug"], "incomplete notes"))
            continue
        if not str(p.get("image") or "").startswith("http"):
            skipped.append((p["slug"], "no image"))
            continue

        sents = sentences(p.get("description_ar"))
        if not sents:
            skipped.append((p["slug"], "no Arabic description"))
            continue
        # first sentence hooks, the rest is the verdict — both already written
        # per product, so nothing here is invented
        hook = sents[0]
        verdict = " ".join(sents[1:]) if len(sents) > 1 else sents[0]
        if len(verdict) > 190:
            verdict = verdict[:190].rsplit(" ", 1)[0] + "…"

        fn = f"{p['slug']}.jpg"
        dest = os.path.join(PUBLIC, fn)
        urllib.request.urlretrieve(p["image"], dest)
        pal = palette_from(dest)

        out.append({
            "id": p["slug"],
            "bottleImage": f"lore/products/{fn}",
            "hook": hook,
            "house": "",
            "product": (p.get("name_ar") or p["name"]).strip(),
            "layers": [
                {"label": "القمّة", "notes": tier(n, "top")},
                {"label": "القلب", "notes": tier(n, "middle")},
                {"label": "القاعدة", "notes": tier(n, "base")},
            ],
            "verdict": verdict,
            "price": f"{int(p['price'])} د.ل",
            "size": " · ".join(x for x in [p.get("size"),
                                           CONC.get((p.get("concentration") or "").lower())] if x),
            "palette": pal,
        })
        print(f"OK  {p['slug']}")

    body = ",\n".join(
        "  {\n" + ",\n".join(f"    {k}: {json.dumps(v, ensure_ascii=False)}"
                             for k, v in e.items()) + "\n  }" for e in out)
    open(out_ts, "w", encoding="utf-8").write(
        "// مولَّد آليًّا بواسطة scripts/ig-post/build-product-reels.py — لا يُحرَّر يدويًّا.\n"
        'import type { ProductReelProps } from "./ProductReel";\n\n'
        'import type { LorePalette } from "./theme";\n\n'
        'export type ProductEntry = Omit<ProductReelProps, "language"> &\n'
        '  { id: string; palette: LorePalette };\n\n'
        f"export const PRODUCTS_{gender.upper()}: ProductEntry[] = [\n{body},\n];\n")

    print(f"\nwrote {len(out)} products -> {os.path.relpath(out_ts, ROOT)}")
    if skipped:
        print(f"skipped {len(skipped)}:")
        for s, why in skipped:
            print(f"   {s:44} {why}")


if __name__ == "__main__":
    main()
