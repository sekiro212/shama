import { Audio, Sequence } from "remotion";
import { VideoProps } from "./schema";
import { ProblemScene } from "./scenes/ProblemScene";
import { SolutionScene } from "./scenes/SolutionScene";
import { AIFinderScene } from "./scenes/AIFinderScene";
import { QuizScene } from "./scenes/QuizScene";
import { ProductScene } from "./scenes/ProductScene";
import { DeliveryScene } from "./scenes/DeliveryScene";
import { CTAScene } from "./scenes/CTAScene";
import { backgroundMusic, BACKGROUND_VOLUME } from "./audio";
import { SCENES } from "./timing";

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

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0A0A0A",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Continuous background music bed — low enough to sit under voiceover */}
      <Audio src={backgroundMusic()} volume={BACKGROUND_VOLUME} />

      <Sequence from={SCENES.problem.from} durationInFrames={SCENES.problem.dur}>
        <ProblemScene language={language} blindPrice={blindPrice} goldColor={goldColor} />
      </Sequence>

      <Sequence from={SCENES.solution.from} durationInFrames={SCENES.solution.dur}>
        <SolutionScene language={language} goldColor={goldColor} />
      </Sequence>

      <Sequence from={SCENES.ai.from} durationInFrames={SCENES.ai.dur}>
        <AIFinderScene
          language={language}
          goldColor={goldColor}
          primaryColor={primaryColor}
          products={products}
        />
      </Sequence>

      <Sequence from={SCENES.quiz.from} durationInFrames={SCENES.quiz.dur}>
        <QuizScene language={language} goldColor={goldColor} primaryColor={primaryColor} />
      </Sequence>

      <Sequence from={SCENES.product.from} durationInFrames={SCENES.product.dur}>
        <ProductScene
          language={language}
          goldColor={goldColor}
          primaryColor={primaryColor}
          products={products}
        />
      </Sequence>

      <Sequence from={SCENES.delivery.from} durationInFrames={SCENES.delivery.dur}>
        <DeliveryScene language={language} goldColor={goldColor} />
      </Sequence>

      <Sequence from={SCENES.cta.from} durationInFrames={SCENES.cta.dur}>
        <CTAScene
          language={language}
          brandName={brandName}
          goldColor={goldColor}
          primaryColor={primaryColor}
          instagramHandle={instagramHandle}
          tiktokHandle={tiktokHandle}
        />
      </Sequence>
    </div>
  );
};
