import { Player } from "@remotion/player";
import { useLanguage } from "@/contexts/LanguageContext";
import { ShamaVideo } from "@/remotion/Video";
import { defaultVideoProps } from "@/remotion/schema";

// 750 frames at 30fps = 25 seconds
const DURATION_IN_FRAMES = 750;
const FPS = 30;

export default function MarketingVideoSection() {
  const { t, isRTL } = useLanguage();

  const videoProps = {
    ...defaultVideoProps,
    language: (isRTL ? "ar" : "en") as "en" | "ar",
  };

  return (
    <section className="py-24 relative z-10" dir={isRTL ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12 animate-slide-up">
          <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-warm mb-4">
            <span className="h-px w-6 bg-warm/60" aria-hidden />
            {t("home.marketingVideo.badge")}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] mb-4 sm:mb-6 leading-[1.05]">
            {t("home.marketingVideo.title")}
          </h2>
          <p className="dark:text-white/70 text-[#6B7B8D] text-base sm:text-lg max-w-xs sm:max-w-lg md:max-w-2xl mx-auto px-4 sm:px-0 leading-relaxed">
            {t("home.marketingVideo.description")}
          </p>
        </div>

        {/* Player container */}
        <div className="flex justify-center">
          <div
            className="relative rounded-3xl overflow-hidden shadow-2xl"
            style={{
              width: "min(360px, 90vw)",
              aspectRatio: "9 / 16",
              backgroundColor: "#0A0A0A",
              boxShadow:
                "0 0 0 1px rgba(91,141,217,0.3), 0 25px 50px rgba(0,0,0,0.5), 0 0 80px rgba(212,175,55,0.1)",
            }}
          >
            <Player
              key={isRTL ? "ar" : "en"}
              component={ShamaVideo}
              durationInFrames={DURATION_IN_FRAMES}
              compositionWidth={1080}
              compositionHeight={1920}
              fps={FPS}
              inputProps={videoProps}
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#0A0A0A",
              }}
              controls
              loop
              autoPlay
              clickToPlay
            />
          </div>
        </div>
      </div>
    </section>
  );
}
