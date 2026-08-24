/**
 * ===========================================================================
 * الملف: Root.tsx
 * الدور: جذر مستقل لريلز "البروفايل العطري"، منفصل عن فيديو التسويق العام
 *        وعن "فيبراتو" حتى لا تتداخل التوقيتات.
 *
 * كل شخصية تُسجَّل كتركيبين: عربي وإنجليزي. الخصائص تعيش هنا بدل ملفّ
 * إعداد خارجي، لأنّ Remotion يتحقّق منها وقت البناء ويعرضها في الاستوديو.
 * ===========================================================================
 */
import React from "react";
import { Composition } from "remotion";
import { LoreReel, LoreReelProps } from "./LoreReel";
import { ProductReel, ProductReelProps, P_TOTAL } from "./ProductReel";
import { FPS, LorePalette, TOTAL_FRAMES } from "./theme";
import { CHARACTERS } from "./characters";


/* ريلز المنتج — كلايف كريستيان بلوند آمبر. لوحة عنبرية دافئة مأخوذة من
   لون العطر نفسه. */
const AMBER_PALETTE: LorePalette = {
  g0: "#6b4715",
  g1: "#2e1d09",
  g2: "#120b03",
  ink: "#faf1de",
  soft: "#cdb287",
  acc: "#e0a63c",
};

const AMBER_AR: ProductReelProps = {
  language: "ar",
  bottleImage: "lore/blonde-amber.jpg",
  hook: "ثلاثة وعشرون مكوّنًا.\nولا واحدٌ منها زائد.",
  house: "كلايف كريستيان",
  product: "بلوند آمبر",
  layers: [
    { label: "القمّة", notes: "برتقال مُرّ · زنجبيل · هيل · رَم" },
    { label: "القلب", notes: "تبغ أبيض · فواكه مجفّفة · زعفران" },
    { label: "القاعدة", notes: "تونكا · لبدانوم · مُرّ · فانيليا" },
  ],
  verdict: "عنبرٌ لا يتحوّل إلى حلوى. التوابل تُبقيه واقفًا، والتبغ يمنعه من أن يلين.",
  price: "٣٣٥٠ د.ل",
  size: "٥٠ مل · بارفان",
};

const AMBER_EN: ProductReelProps = {
  language: "en",
  bottleImage: "lore/blonde-amber.jpg",
  hook: "Twenty-three notes.\nNot one of them spare.",
  house: "Clive Christian",
  product: "Blonde Amber",
  layers: [
    { label: "Top", notes: "Bitter Orange · Ginger · Cardamom · Rum" },
    { label: "Heart", notes: "White Tobacco · Dried Fruits · Saffron" },
    { label: "Base", notes: "Tonka · Labdanum · Myrrh · Vanilla" },
  ],
  verdict: "An amber that never turns into dessert. The spice holds it upright; the tobacco keeps it from going soft.",
  price: "3350 LYD",
  size: "50ml · Parfum",
};

export const LoreRoot: React.FC = () => (
  <>
    {/* شخصيات السلسلة، مولَّدة من ملفّات lore/*.json */}
    {CHARACTERS.map((c) => (
      <Composition
        key={c.id}
        id={`Lore-${c.id}-AR`}
        component={LoreReel}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ ...c, language: "ar" as const }}
      />
    ))}
    <Composition
      id="Product-BlondeAmber-AR"
      component={ProductReel}
      durationInFrames={P_TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ ...AMBER_AR, palette: AMBER_PALETTE }}
    />
    <Composition
      id="Product-BlondeAmber-EN"
      component={ProductReel}
      durationInFrames={P_TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ ...AMBER_EN, palette: AMBER_PALETTE }}
    />
  </>
);
