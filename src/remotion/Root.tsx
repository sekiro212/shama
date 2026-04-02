import { Composition, Folder } from "remotion";
import { ShamaVideo } from "./Video";
import { videoSchema, defaultVideoProps } from "./schema";

// Total: 750 frames = 25 seconds at 30fps
// (sum of scene durations) - (5 transitions × 15 frames) = 825 - 75 = 750
const DURATION_IN_FRAMES = 750;

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Shama-Marketing">
      <Composition
        id="ShamaVideo-EN"
        component={ShamaVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={{
          ...defaultVideoProps,
          language: "en",
        }}
      />
      <Composition
        id="ShamaVideo-AR"
        component={ShamaVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        schema={videoSchema}
        defaultProps={{
          ...defaultVideoProps,
          language: "ar",
        }}
      />
    </Folder>
  );
};
