import { AbsoluteFill, Sequence } from "remotion";
import { VideoProps } from "./schema";
import { HookScene } from "./scenes/HookScene";
import { BrandRevealScene } from "./scenes/BrandRevealScene";
import { SocialProofScene } from "./scenes/SocialProofScene";
import { ProductShowcaseScene } from "./scenes/ProductShowcaseScene";
import { DesireBuilderScene } from "./scenes/DesireBuilderScene";
import { CTAScene } from "./scenes/CTAScene";

// 30fps, total = 750 frames = 25 seconds
// Each scene's component handles its own fade-in via useCurrentFrame()
const SCENES = {
  hook:     { from: 0,   dur: 90  }, // 3s
  brand:    { from: 90,  dur: 120 }, // 4s
  social:   { from: 210, dur: 120 }, // 4s
  products: { from: 330, dur: 180 }, // 6s
  desire:   { from: 510, dur: 120 }, // 4s
  cta:      { from: 630, dur: 120 }, // 4s — ends at frame 750
};

export const ShamaVideo: React.FC<VideoProps> = (props) => {
  const {
    brandName,
    tagline,
    primaryColor,
    goldColor,
    stats,
    products,
    language,
    instagramHandle,
    tiktokHandle,
  } = props;

  return (
    // Explicit fill div — ensures black bg visible in @remotion/player context
    <div
      style={{
        width: "100%",
        height: "100%",
        backgroundColor: "#0A0A0A",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Sequence from={SCENES.hook.from} durationInFrames={SCENES.hook.dur}>
        <HookScene language={language} />
      </Sequence>

      <Sequence from={SCENES.brand.from} durationInFrames={SCENES.brand.dur}>
        <BrandRevealScene
          brandName={brandName}
          primaryColor={primaryColor}
          goldColor={goldColor}
          language={language}
        />
      </Sequence>

      <Sequence from={SCENES.social.from} durationInFrames={SCENES.social.dur}>
        <SocialProofScene
          stats={stats}
          primaryColor={primaryColor}
          goldColor={goldColor}
          language={language}
        />
      </Sequence>

      <Sequence from={SCENES.products.from} durationInFrames={SCENES.products.dur}>
        <ProductShowcaseScene
          products={products}
          primaryColor={primaryColor}
          goldColor={goldColor}
          language={language}
        />
      </Sequence>

      <Sequence from={SCENES.desire.from} durationInFrames={SCENES.desire.dur}>
        <DesireBuilderScene goldColor={goldColor} language={language} />
      </Sequence>

      <Sequence from={SCENES.cta.from} durationInFrames={SCENES.cta.dur}>
        <CTAScene
          brandName={brandName}
          tagline={tagline}
          goldColor={goldColor}
          primaryColor={primaryColor}
          instagramHandle={instagramHandle}
          tiktokHandle={tiktokHandle}
          language={language}
        />
      </Sequence>
    </div>
  );
};
