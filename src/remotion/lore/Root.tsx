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
import { ReviewReel, ReviewReelProps, R_TOTAL } from "./ReviewReel";
import { TemptationReel, TemptationReelProps, T_TOTAL } from "./TemptationReel";
import { FPS, LorePalette, TOTAL_FRAMES } from "./theme";
import { CHARACTERS } from "./characters";
import { PRODUCTS_WOMEN } from "./products-women";
import { PRODUCTS_MEN } from "./products-men";
import { PRODUCTS_UNISEX } from "./products-unisex";

const PRODUCTS = [...PRODUCTS_WOMEN, ...PRODUCTS_MEN, ...PRODUCTS_UNISEX];


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


/* مراجعة بلا وجه — زيرجوف إربا بورا. الرأي رأي المتجر، لا شهادة زبون. */
const ERBA_PALETTE: LorePalette = {
  g0: "#7a4a12",
  g1: "#33200a",
  g2: "#120b04",
  ink: "#fbf2e2",
  soft: "#d0b78e",
  acc: "#e79b2f",
};

const ERBA_AR: ReviewReelProps = {
  language: "ar",
  bottleImage: "lore/erba-pura.jpg",
  hook: "جرّبناه قبل ما نبيعه.\nوهذا رأينا فيه بصراحة.",
  house: "زيرجوف",
  product: "إربا بورا",
  lines: [
    { label: "الفتحة", body: "برتقالٌ صقليّ وليمون وبرغموت. حمضياتٌ لامعة تضربك في أول ثانية — منعشةٌ بلا أن تكون حادّة." },
    { label: "على البشرة", body: "بعد نصف ساعة يهدأ الحمض وتطلع الفاكهة والياسمين. هنا يتحوّل من عطرٍ منعش إلى عطرٍ حلو." },
    { label: "الثبات والفوحان", body: "الفانيليا والعنبر والمسك الأبيض يمسكونه ساعاتٍ طويلة. فوحانه واسع — لا تُفرِط في البخّات." },
    { label: "متى تلبسه", body: "الصيف والنهار أولًا، ومناسبٌ للعمل والخروج. يصلح للرجال والنساء دون تكلّف." },
    { label: "الحكم", body: "من أسهل العطور في الرضا عنه. إن كنت تبدأ في عالم النيتش، فهذا مدخلٌ آمن ولا يخذلك." },
  ],
  price: "١٧٥٠ د.ل",
  size: "١٠٠ مل · أو دو بارفان",
};

const ERBA_EN: ReviewReelProps = {
  language: "en",
  bottleImage: "lore/erba-pura.jpg",
  hook: "We wore it before we sold it.\nHere is the honest read.",
  house: "Xerjoff",
  product: "Erba Pura",
  lines: [
    { label: "The opening", body: "Sicilian orange, lemon and bergamot. Bright citrus in the first second — fresh without ever turning sharp." },
    { label: "On skin", body: "After half an hour the acid settles and the fruit and jasmine come up. This is where it turns from fresh to sweet." },
    { label: "Power", body: "Vanilla, amber and white musk hold it for hours. Projection is wide — go easy on the sprays." },
    { label: "When to wear it", body: "Summer and daytime first, and it works for the office. Unisex without trying to be." },
    { label: "The verdict", body: "One of the easiest bottles to be happy with. If you are starting in niche, this is a safe way in." },
  ],
  price: "1750 LYD",
  size: "100ml · EDP",
};


/* ريلز الطُّرفة — «عطر واحد يكفي بســـ... لا، ما يكفيش!» */
const TEMPTATION: TemptationReelProps = {
  setupA: "عطر واحد يكفي",
  setupB: "بـ",
  payoff: "لا… ما يكفيش! 😅",
  ctaLine: "كلّهم متوفّرين عندنا",
  bottles: [
    "lore/temptation/b1.jpg",
    "lore/temptation/b2.jpg",
    "lore/temptation/b3.jpg",
    "lore/temptation/b4.jpg",
    "lore/temptation/b5.jpg",
  ],
  bg: "linear-gradient(160deg, #f6ead0 0%, #efdfbe 45%, #e8d3a9 100%)",
  ink: "#1a1712",
  acc: "#8a6a2a",
};


/* هيدونيستيك — الاسم مأخوذ من زهرة شكسبير، وهذا هو الخطّاف. */
const HEDO_PALETTE: LorePalette = {
  g0: "#5a1230",
  g1: "#280a17",
  g2: "#0f0409",
  ink: "#f8ecef",
  soft: "#cb9fae",
  acc: "#d2555f",
};

const HEDO_AR: ProductReelProps = {
  language: "ar",
  bottleImage: "lore/hedonistic.jpg",
  hook: "عطرٌ سُمّي على زهرة\nتُوقِع في الحبّ رغمًا عنك.",
  house: "كلايف كريستيان",
  product: "جمب أب آند كيس مي · هيدونيستيك",
  layers: [
    { label: "الحكاية", notes: "زهرة البنفسج البرّي في «حلم ليلة صيف» — عصيرها يجعلك تعشق أوّل ما تراه" },
    { label: "القمّة", notes: "كرزٌ أسود · قصعين · برغموت · شاي المتّة" },
    { label: "القلب", notes: "سوسن · ياسمين · بردي · تبغ" },
  ],
  verdict: "كرزٌ أسود لا يتحوّل إلى حلوى: التبغ والجلد يسحبانه إلى الأسفل، واللبدانوم يُبقيه ساعات.",
  price: "٣٣٠٠ د.ل",
  size: "٥٠ مل · أو جرّبه ٥ مل بـ٤٠٠",
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
    <Composition
      id="Review-ErbaPura-AR"
      component={ReviewReel}
      durationInFrames={R_TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ ...ERBA_AR, palette: ERBA_PALETTE }}
    />
    <Composition
      id="Review-ErbaPura-EN"
      component={ReviewReel}
      durationInFrames={R_TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ ...ERBA_EN, palette: ERBA_PALETTE }}
    />
    {/* كل عطر نسائي كتركيبٍ مستقل، مولَّدة من products.ts */}
    {PRODUCTS.map((pr) => (
      <Composition
        key={pr.id}
        id={`P-${pr.id}`}
        component={ProductReel}
        durationInFrames={P_TOTAL}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ ...pr, language: "ar" as const }}
      />
    ))}
    <Composition
      id="Product-Hedonistic-AR"
      component={ProductReel}
      durationInFrames={P_TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{ ...HEDO_AR, palette: HEDO_PALETTE }}
    />
    <Composition
      id="Temptation-AR"
      component={TemptationReel}
      durationInFrames={T_TOTAL}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={TEMPTATION}
    />
  </>
);
