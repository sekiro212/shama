/**
 * ===========================================================================
 * الملف: Video.tsx
 * الدور: المكوّن الرئيسي للتركيب (Composition) الذي يبني الفيديو كاملاً.
 * يربط المشاهد الستة بالترتيب عبر TransitionSeries مع انتقالات (تلاشٍ/انزلاق)،
 * ويضع المسار الصوتي: موسيقى خلفية مستمرة + تعليق صوتي (voiceover) لكل مشهد.
 * مسار الصوت منفصل عن مسار الصورة حتى لا يتداخل تعليقان أثناء الانتقالات.
 * ===========================================================================
 */
import { Audio, Sequence, AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { VideoProps } from "./schema";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { AIFinderScene } from "./scenes/AIFinderScene";
import { ProductScene } from "./scenes/ProductScene";
import { DeliveryScene } from "./scenes/DeliveryScene";
import { CTAScene } from "./scenes/CTAScene";
import { backgroundMusic, sceneAudio, BACKGROUND_VOLUME, VOICEOVER_VOLUME } from "./audio";
import { SCENE_DURATIONS, AUDIO_START, TRANSITION_FRAMES, type SceneKey } from "./timing";

// توقيت خطّي (linear) لكل انتقال بحيث يتداخل كل مشهد مع جاره بمقدار
// TRANSITION_FRAMES بالضبط — وهو الافتراض المبني عليه AUDIO_START في timing.ts.
// Linear timing so each transition overlaps adjacent scenes by EXACTLY
// TRANSITION_FRAMES — the assumption baked into AUDIO_START in timing.ts.
const T = linearTiming({ durationInFrames: TRANSITION_FRAMES });

/**
 * المكوّن الرئيسي للفيديو. يستقبل خصائص العلامة التجارية والمنتجات واللغة
 * عبر props (مُتحقَّق منها بمخطّط zod)، ثم يرسم مساري الصوت والصورة.
 */
export const ShamaVideo: React.FC<VideoProps> = (props) => {
  const {
    brandName,
    primaryColor,
    goldColor,
    blindPrice,
    products,
    language,
    instagramHandle,
    tiktokHandle,
  } = props;

  // دالة مساعدة تبني مقطع التعليق الصوتي لمشهد واحد، وتضعه على الخط الزمني
  // الرئيسي (منفصلاً عن TransitionSeries) كي لا يتداخل تعليقان أثناء التلاشي.
  // from={AUDIO_START[scene]} يحدّد إطار البداية المطلق للتعليق من ملف التوقيت.
  // Per-scene voiceover, placed on the main timeline (decoupled from the visual
  // TransitionSeries) so cross-fade overlaps never double up two voice clips.
  const vo = (scene: SceneKey) => (
    <Sequence key={scene} from={AUDIO_START[scene]}>
      {/* اختيار ملف الصوت حسب المشهد واللغة، بمستوى صوت التعليق */}
      <Audio src={sceneAudio(scene, language)} volume={VOICEOVER_VOLUME} />
    </Sequence>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#080809", overflow: "hidden" }}>
      {/* الموسيقى الخلفية المستمرة بمستوى منخفض تحت التعليق الصوتي */}
      {/* Continuous music bed, low under the voiceover */}
      <Audio src={backgroundMusic()} volume={BACKGROUND_VOLUME} />

      {/* مسار التعليق الصوتي: مقطع لكل مشهد بالترتيب */}
      {/* Voiceover track */}
      {vo("problem")}
      {vo("solution")}
      {vo("ai")}
      {vo("product")}
      {vo("delivery")}
      {vo("cta")}

      {/* مسار الصورة — مشاهد متتالية يفصلها تلاشٍ أو انزلاق */}
      {/* Visual track — cross-faded / slid scenes */}
      <TransitionSeries>
        {/* المشهد الأول: المشكلة (شراء العطر دون تجربة) */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.problem}>
          <ProblemScene
            language={language}
            blindPrice={blindPrice}
            goldColor={goldColor}
            primaryColor={primaryColor}
          />
        </TransitionSeries.Sequence>

        {/* انتقال بالتلاشي (fade) بين المشهدين */}
        <TransitionSeries.Transition presentation={fade()} timing={T} />

        {/* المشهد الثاني: الحل (عيّنات للتجربة) */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.solution}>
          <SolutionScene language={language} goldColor={goldColor} primaryColor={primaryColor} />
        </TransitionSeries.Sequence>

        {/* انتقال بالانزلاق من الأسفل إلى الأعلى */}
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={T} />

        {/* المشهد الثالث: البحث الذكي (AI Finder) */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.ai}>
          <AIFinderScene
            language={language}
            goldColor={goldColor}
            primaryColor={primaryColor}
            products={products}
          />
        </TransitionSeries.Sequence>

        {/* انتقال بالتلاشي */}
        <TransitionSeries.Transition presentation={fade()} timing={T} />

        {/* المشهد الرابع: عرض المنتجات */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.product}>
          <ProductScene
            language={language}
            goldColor={goldColor}
            primaryColor={primaryColor}
            products={products}
          />
        </TransitionSeries.Sequence>

        {/* انتقال بالانزلاق من الأسفل */}
        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={T} />

        {/* المشهد الخامس: التوصيل (فانكس إلى الباب) */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.delivery}>
          <DeliveryScene language={language} goldColor={goldColor} primaryColor={primaryColor} />
        </TransitionSeries.Sequence>

        {/* انتقال بالتلاشي */}
        <TransitionSeries.Transition presentation={fade()} timing={T} />

        {/* المشهد السادس والأخير: دعوة لاتخاذ إجراء (CTA) مع روابط التواصل */}
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.cta}>
          <CTAScene
            language={language}
            brandName={brandName}
            goldColor={goldColor}
            primaryColor={primaryColor}
            instagramHandle={instagramHandle}
            tiktokHandle={tiktokHandle}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
