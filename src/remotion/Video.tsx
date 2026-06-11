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

// Linear timing so each transition overlaps adjacent scenes by EXACTLY
// TRANSITION_FRAMES — the assumption baked into AUDIO_START in timing.ts.
const T = linearTiming({ durationInFrames: TRANSITION_FRAMES });

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

  // Per-scene voiceover, placed on the main timeline (decoupled from the visual
  // TransitionSeries) so cross-fade overlaps never double up two voice clips.
  const vo = (scene: SceneKey) => (
    <Sequence key={scene} from={AUDIO_START[scene]}>
      <Audio src={sceneAudio(scene, language)} volume={VOICEOVER_VOLUME} />
    </Sequence>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#080809", overflow: "hidden" }}>
      {/* Continuous music bed, low under the voiceover */}
      <Audio src={backgroundMusic()} volume={BACKGROUND_VOLUME} />

      {/* Voiceover track */}
      {vo("problem")}
      {vo("solution")}
      {vo("ai")}
      {vo("product")}
      {vo("delivery")}
      {vo("cta")}

      {/* Visual track — cross-faded / slid scenes */}
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.problem}>
          <ProblemScene
            language={language}
            blindPrice={blindPrice}
            goldColor={goldColor}
            primaryColor={primaryColor}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={T} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.solution}>
          <SolutionScene language={language} goldColor={goldColor} primaryColor={primaryColor} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={T} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.ai}>
          <AIFinderScene
            language={language}
            goldColor={goldColor}
            primaryColor={primaryColor}
            products={products}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={T} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.product}>
          <ProductScene
            language={language}
            goldColor={goldColor}
            primaryColor={primaryColor}
            products={products}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={slide({ direction: "from-bottom" })} timing={T} />

        <TransitionSeries.Sequence durationInFrames={SCENE_DURATIONS.delivery}>
          <DeliveryScene language={language} goldColor={goldColor} primaryColor={primaryColor} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition presentation={fade()} timing={T} />

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
