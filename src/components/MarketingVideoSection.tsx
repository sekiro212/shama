import { useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function MarketingVideoSection() {
  const { t, isRTL } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  const src = isRTL ? "/shama-ar.mp4" : "/shama-en.mp4";

  const handleUnmute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.muted = false;
    v.play().catch(() => {});
    setMuted(false);
  };

  return (
    <section className="py-24 relative z-10" dir={isRTL ? "rtl" : "ltr"}>
      <div className="container mx-auto px-4">
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
            <video
              ref={videoRef}
              key={src}
              src={src}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              controls={!muted}
            />

            {muted && (
              <button
                type="button"
                onClick={handleUnmute}
                className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-[2px] transition hover:bg-black/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-warm/70"
                aria-label={isRTL ? "اضغط للتشغيل بالصوت" : "Tap for sound"}
              >
                <span className="flex flex-col items-center gap-3 text-white">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-warm/95 shadow-lg ring-4 ring-warm/20">
                    <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
                      <path
                        d="M3 10v4a1 1 0 0 0 1 1h3l5 4V5L7 9H4a1 1 0 0 0-1 1Z"
                        fill="currentColor"
                      />
                      <path
                        d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <span className="text-sm font-semibold tracking-wide">
                    {isRTL ? "اضغط للتشغيل بالصوت" : "Tap for sound"}
                  </span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
