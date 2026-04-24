import { Composition, Folder } from "remotion";
import { ShamaVideo } from "./Video";
import { videoSchema, defaultVideoProps } from "./schema";
import { TOTAL_FRAMES, FPS } from "./timing";

const DURATION_IN_FRAMES = TOTAL_FRAMES;

export const RemotionRoot: React.FC = () => {
  return (
    <Folder name="Shama-Marketing">
      <Composition
        id="ShamaVideo-EN"
        component={ShamaVideo}
        durationInFrames={DURATION_IN_FRAMES}
        fps={FPS}
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
        fps={FPS}
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
