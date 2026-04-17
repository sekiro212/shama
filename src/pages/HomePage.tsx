import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Star,
  ArrowRight,
  Sparkles,
  Users,
  Heart,
  Wind,
} from "lucide-react";

const Instagram = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
);

const Facebook = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.47h3.047v-2.642c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385c5.738-.9 10.126-5.864 10.126-11.854z" />
  </svg>
);
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import {
  fetchProducts,
  getFullBottles,
  Product,
} from "@/services/productsService";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, useReducedMotion } from "framer-motion";
import RecentlyViewed from "@/components/RecentlyViewed";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import MarketingVideoSection from "@/components/MarketingVideoSection";
import ScentMemoryWall from "@/components/ScentMemoryWall";

const TikTokIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
);

/* Editorial section header — badge on top row, optional action on the right (desktop) */
function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "start",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  align?: "start" | "center";
}) {
  const isCenter = align === "center";
  return (
    <div
      className={`mb-8 sm:mb-12 md:mb-16 ${
        isCenter ? "text-center" : "md:flex md:items-end md:justify-between md:gap-8"
      }`}
    >
      <div className={isCenter ? "mx-auto max-w-2xl" : "max-w-2xl"}>
        <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-[#3E6BB5] dark:text-[#8BB4F0]">
          <span className="h-px w-6 bg-warm/60" aria-hidden />
          {eyebrow}
        </span>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] mt-3 sm:mt-4 mb-3 sm:mb-4 leading-[1.05]">
          {title}
        </h2>
        {description && (
          <p className="text-[#6B7B8D] dark:text-white/70 text-base sm:text-lg leading-relaxed max-w-prose">
            {description}
          </p>
        )}
      </div>
      {!isCenter && action && (
        <div className="mt-4 md:mt-0 flex-shrink-0">{action}</div>
      )}
    </div>
  );
}

const AIFinderBanner = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const reduceMotion = useReducedMotion();

  const chips = [
    { label: t("home.chipNightOut"), query: "night out" },
    { label: t("home.chipEveryday"), query: "everyday fresh" },
    { label: t("home.chipGiftForHer"), query: "gift for her" },
    { label: t("home.chipWoody"), query: "woody warm" },
    { label: t("home.chipSummer"), query: "summer light" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="glass-card rounded-3xl overflow-hidden my-8"
    >
      <div className="relative p-6 md:p-10">
        {/* Warm corner wash */}
        <div className="absolute top-0 end-0 w-56 h-56 bg-gradient-to-bl from-warm/15 via-[#5B8DD9]/10 to-transparent pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10">
          <div className="flex-1 text-center md:text-start">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase text-warm bg-warm/10 px-3 py-1 rounded-full mb-4">
              <Sparkles className="w-3 h-3" />
              {t("home.aiPowered")}
            </span>

            <h2 className="font-display text-2xl md:text-3xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] mb-2 leading-tight">
              {t("home.aiFinderBannerTitle")}
            </h2>
            <p className="text-sm md:text-base text-[#6B7B8D] dark:text-white/70 mb-5 max-w-lg">
              {t("home.aiFinderBannerSub")}
            </p>

            <div className="flex flex-wrap gap-2 mb-5 justify-center md:justify-start">
              {chips.map((chip) => (
                <button
                  key={chip.query}
                  onClick={() =>
                    navigate(`/ai-finder?q=${encodeURIComponent(chip.query)}`)
                  }
                  className="px-3 py-1.5 rounded-full text-sm border border-[#5B8DD9]/40 text-[#3E6BB5] dark:text-[#8BB4F0] hover:border-warm hover:ring-2 hover:ring-warm/30 hover:bg-warm/5 transition-all cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate("/ai-finder")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white px-5 py-3 rounded-xl font-medium glow-warm-hover"
            >
              <Sparkles className="w-4 h-4" />
              {t("home.aiFinderBannerCta")}
              <ChevronRight
                className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Single rotating ring — candlelight halo */}
          <div className="hidden md:flex items-center justify-center w-36 h-36 relative flex-shrink-0">
            <motion.div
              className="absolute rounded-full border border-warm/30"
              style={{ width: 128, height: 128 }}
              animate={reduceMotion ? undefined : { rotate: 360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            >
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-warm"
                aria-hidden
              />
            </motion.div>
            <div className="w-20 h-20 rounded-full bg-warm/10 flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-warm" />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function HomePage() {
  const { t, isRTL } = useLanguage();
  const reduceMotion = useReducedMotion();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [collectionImages, setCollectionImages] = useState<string[]>([]);
  const [aboutHoverImg, setAboutHoverImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const handleAboutHover = () => {
    if (collectionImages.length === 0) return;
    const pool = aboutHoverImg
      ? collectionImages.filter((url) => url !== aboutHoverImg)
      : collectionImages;
    const next = pool[Math.floor(Math.random() * pool.length)];
    setAboutHoverImg(next ?? collectionImages[0]);
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const { products } = await fetchProducts();
        const bottles = getFullBottles(products);
        setFeaturedProducts(bottles.slice(0, 3));
        const urls = products
          .flatMap((p) => p.images?.map((img) => img.image_url) ?? [])
          .filter((u): u is string => typeof u === "string" && u.length > 0);
        setCollectionImages(urls);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const heroRise = (delay: number) =>
    reduceMotion
      ? ({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.4, delay } } as const)
      : ({
          initial: { opacity: 0, y: 24, filter: "blur(8px)" },
          animate: { opacity: 1, y: 0, filter: "blur(0px)" },
          transition: { duration: 0.8, delay, ease: "easeOut" },
        } as const);

  const stats = [
    { icon: Users, label: t("home.stats.happyCustomers"), value: t("home.stats.happyCustomersValue") },
    { icon: Wind, label: t("home.stats.ourPerfumes"), value: t("home.stats.ourPerfumesValue") },
    { icon: Heart, label: t("home.stats.yearsOfCraft"), value: t("home.stats.yearsOfCraftValue") },
    { icon: Star, label: t("home.stats.averageRating"), value: t("home.stats.averageRatingValue") },
  ];

  return (
    <div className="grain-bg min-h-screen w-full bg-[#F8F9FB] dark:bg-[#1a2235] relative overflow-hidden">
      {/* Hero — one orchestrated reveal */}
      <section className="relative min-h-[88vh] flex items-center justify-center w-full overflow-hidden">
        {/* Static background wash — no parallax */}
        <div className="absolute inset-0 z-0" aria-hidden>
          <img
            src="https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=1920&h=1080&fit=crop"
            alt=""
            className="w-full h-full object-cover opacity-25"
            loading="eager"
            fetchPriority="high"
          />
          {/* Warm candlelight glow from the center */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(232,185,138,0.18)_0%,transparent_55%)]" />
          {/* Paper + midnight gradient readability wash */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#F8F9FB]/30 via-transparent to-[#F8F9FB] dark:from-[#1a2235]/40 dark:via-transparent dark:to-[#1a2235]" />
        </div>

        <BackgroundBeamsWithCollision>
          <div className="relative z-10 text-center max-w-5xl px-4 mx-auto">
            <motion.span
              {...heroRise(0)}
              className="inline-flex items-center gap-2 bg-warm/10 border border-warm/30 rounded-full px-4 py-1.5 text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-warm mb-6 sm:mb-8"
            >
              <Sparkles className="w-3.5 h-3.5" aria-hidden />
              {t("home.hero.badge")}
            </motion.span>

            <motion.h1
              {...heroRise(0.15)}
              className="font-display text-[clamp(2.5rem,8vw,6rem)] font-semibold text-[#1E2A3D] dark:text-white mb-6 sm:mb-8 leading-[0.95] tracking-tight"
            >
              <span className="block">{t("home.hero.titleLine1")}</span>
              <span className="block italic text-glow-warm">
                {t("home.hero.titleLine2")}
              </span>
            </motion.h1>

            <motion.p
              {...heroRise(0.3)}
              className="text-lg sm:text-xl md:text-2xl text-[#323D50]/80 dark:text-white/85 mb-10 sm:mb-12 max-w-2xl mx-auto leading-relaxed"
            >
              {t("home.hero.description")}
            </motion.p>

            <motion.div
              {...heroRise(0.45)}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                asChild
                className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white text-base sm:text-lg px-7 sm:px-9 py-5 sm:py-6 rounded-xl font-semibold glow-warm-hover w-full sm:w-auto"
              >
                <Link to="/quiz">
                  <Sparkles className="me-2 h-4 w-4 sm:h-5 sm:w-5" />
                  {t("home.hero.ctaQuiz")}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="glass-card border-[#5B8DD9]/40 text-[#323D50] dark:text-white hover:bg-[#5B8DD9] hover:border-[#5B8DD9] hover:text-white text-base sm:text-lg px-7 sm:px-9 py-5 sm:py-6 rounded-xl font-semibold w-full sm:w-auto"
              >
                <Link to="/collection">
                  {t("home.hero.ctaCollection")}
                  <ChevronRight className={`ms-2 h-4 w-4 sm:h-5 sm:w-5 ${isRTL ? "rotate-180" : ""}`} />
                </Link>
              </Button>
            </motion.div>
          </div>
        </BackgroundBeamsWithCollision>
      </section>

      {/* Stats — editorial row on desktop, cards on mobile */}
      <section className="py-14 sm:py-20 relative z-10">
        <div className="container mx-auto px-3 sm:px-4">
          {/* Desktop: single connected row with dividers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="hidden md:grid grid-cols-4 glass-card rounded-2xl divide-x divide-[#5B8DD9]/10 dark:divide-white/10 rtl:divide-x-reverse"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center px-6 py-8">
                <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-warm/10 flex items-center justify-center ring-1 ring-warm/30">
                  <stat.icon className="w-5 h-5 text-warm" aria-hidden />
                </div>
                <div className="font-display text-4xl lg:text-5xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] mb-1 tabular-nums">
                  {stat.value}
                </div>
                <div className="text-[#6B7B8D] dark:text-white/60 text-sm tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>

          {/* Mobile: compact cards */}
          <div className="grid grid-cols-2 gap-3 md:hidden">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className="glass-card text-center p-4 rounded-2xl"
              >
                <div className="mx-auto mb-2 w-10 h-10 rounded-full bg-warm/10 flex items-center justify-center ring-1 ring-warm/30">
                  <stat.icon className="w-4 h-4 text-warm" aria-hidden />
                </div>
                <div className="font-display text-2xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] mb-1 tabular-nums">
                  {stat.value}
                </div>
                <div className="text-[#6B7B8D] dark:text-white/60 text-xs">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Marketing Video */}
      <MarketingVideoSection />

      {/* AI Finder Banner */}
      <section className="py-8 sm:py-12 relative z-10">
        <div className="container mx-auto px-3 sm:px-4">
          <AIFinderBanner />
        </div>
      </section>

      {/* Featured Products — editorial split header */}
      <section id="products" className="py-14 sm:py-20 md:py-24 relative z-10">
        <div className="container mx-auto px-3 sm:px-4">
          <SectionHeader
            eyebrow={t("home.featured.badge")}
            title={t("home.featured.title")}
            description={t("home.featured.description")}
            action={
              <Button
                asChild
                variant="outline"
                className="glass-card border-[#5B8DD9]/40 text-[#3E6BB5] dark:text-[#8BB4F0] hover:bg-[#5B8DD9] hover:text-white px-6 py-3 rounded-xl font-semibold"
              >
                <Link to="/collection">
                  {t("home.featured.viewAll")}
                  <ChevronRight className={`ms-2 h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                </Link>
              </Button>
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="glass-card rounded-2xl p-6 animate-pulse"
                  >
                    <div className="aspect-square bg-white/10 rounded-lg mb-4" />
                    <div className="h-6 bg-white/10 rounded mb-2" />
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-8 bg-white/10 rounded w-1/2" />
                  </div>
                ))
              : featuredProducts.map((product, index) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: 0.1 + index * 0.08,
                      ease: "easeOut",
                    }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
          </div>

          {/* Mobile fallback for action — show "View All" under the grid too */}
          <div className="text-center mt-10 md:hidden">
            <Button
              asChild
              variant="outline"
              className="glass-card border-[#5B8DD9]/40 text-[#3E6BB5] hover:bg-[#5B8DD9] hover:text-white px-6 py-3 rounded-xl font-semibold"
            >
              <Link to="/collection">
                {t("home.featured.viewAll")}
                <ChevronRight className={`ms-2 h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* About — image left / text right on desktop */}
      <section className="py-14 sm:py-20 md:py-24 relative z-10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid lg:grid-cols-2 gap-10 md:gap-14 lg:gap-20 items-center">
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="relative order-last lg:order-first"
            >
              <div className="glass-card p-6 sm:p-8 rounded-3xl">
                <div
                  onMouseEnter={handleAboutHover}
                  onMouseLeave={() => setAboutHoverImg(null)}
                  onFocus={handleAboutHover}
                  onBlur={() => setAboutHoverImg(null)}
                  tabIndex={0}
                  role="img"
                  aria-label="Shama Perfumes — hover to preview the collection"
                  className="relative w-full h-80 rounded-2xl overflow-hidden cursor-pointer group focus-visible:ring-2 focus-visible:ring-warm outline-none"
                  style={{
                    background:
                      "radial-gradient(ellipse at center, #2a3652 0%, #1a2235 70%, #0E1420 100%)",
                  }}
                >
                  {/* Logo layer — visible when not hovering */}
                  <div
                    className={`absolute inset-0 grid place-items-center transition-opacity duration-500 ${
                      aboutHoverImg ? "opacity-0" : "opacity-100"
                    }`}
                  >
                    <img
                      src="/shama-logo.jpg"
                      alt="Shama Perfumes logo"
                      className="transition-transform duration-700 group-hover:scale-105"
                      style={{
                        width: "60%",
                        maxWidth: 220,
                        aspectRatio: "1 / 1",
                        objectFit: "contain",
                        borderRadius: 20,
                        boxShadow:
                          "0 20px 60px -20px rgba(232, 185, 138, 0.35), 0 0 0 1px rgba(232, 185, 138, 0.15)",
                      }}
                    />
                  </div>
                  {/* Collection preview layer — swaps on hover */}
                  {aboutHoverImg && (
                    <motion.img
                      key={aboutHoverImg}
                      src={aboutHoverImg}
                      alt=""
                      initial={{ opacity: 0, scale: 1.04 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {/* Gradient + caption */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute bottom-4 start-5 text-white/85 text-sm font-medium tracking-wide pointer-events-none">
                    {t("home.about.since2024")}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="space-y-6 sm:space-y-8"
            >
              <div>
                <span className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-semibold tracking-[0.24em] uppercase text-warm">
                  <span className="h-px w-6 bg-warm/60" aria-hidden />
                  {t("home.about.badge")}
                </span>
                <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold italic text-[#1E2A3D] dark:text-[#F5F5F5] mt-3 mb-5 leading-[1.05]">
                  {t("home.about.title")}
                </h2>
                <p className="text-[#6B7B8D] dark:text-white/80 text-base sm:text-lg leading-relaxed mb-4 max-w-prose">
                  {t("home.about.description1")}
                </p>
                <p className="text-[#6B7B8D] dark:text-white/70 text-sm sm:text-base leading-relaxed max-w-prose">
                  {t("home.about.description2")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {[
                  { label: t("home.about.premiumIngredients"), desc: t("home.about.sourcedGlobally") },
                  { label: t("home.about.masterCrafted"), desc: t("home.about.yearsOfExpertise") },
                ].map((feature, index) => (
                  <div key={index} className="glass-card p-4 sm:p-6 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-warm" aria-hidden />
                      <div className="text-[#323D50] dark:text-[#F5F5F5] font-semibold text-sm sm:text-base">
                        {feature.label}
                      </div>
                    </div>
                    <div className="text-[#6B7B8D] dark:text-white/60 text-xs sm:text-sm">
                      {feature.desc}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Recently Viewed + Scent Memory Wall */}
      <section className="relative z-10">
        <div className="container mx-auto px-4">
          <RecentlyViewed />
          <ScentMemoryWall />
        </div>
      </section>

      {/* Social Gallery */}
      <section className="py-14 sm:py-20 md:py-24 relative z-10">
        <div className="container mx-auto px-3 sm:px-4">
          <SectionHeader
            eyebrow={t("home.social.badge")}
            title={t("home.social.title")}
            description={t("home.social.description")}
            align="center"
          />

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {[
              {
                // TODO(shama): replace with brand imagery from @shama._200
                image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop",
                href: "https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr",
                icon: <Instagram className="h-6 w-6 text-white" />,
                title: "Instagram",
              },
              {
                // TODO(shama): replace with brand imagery from @shama._200
                image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=400&fit=crop",
                href: "https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr",
                icon: <Instagram className="h-6 w-6 text-white" />,
                title: "Instagram",
              },
              {
                // TODO(shama): replace with brand imagery from @shama_625 TikTok
                image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=400&fit=crop",
                href: "https://www.tiktok.com/@shama_625?_r=1&_d=ehaiidj2573dih&sec_uid=MS4wLjABAAAAtWhwVbsiMc_T7iAluhIopScG5tmdWhTlCRauHrAVmp3Eo_PnjOOOITTHFURnrnqF&share_author_id=7492887353330516997&sharer_language=en&source=h5_m&u_code=ejkmi594adgdl5&ug_btm=b8727,b0&social_share_type=4&utm_source=copy&sec_user_id=MS4wLjABAAAAtWhwVbsiMc_T7iAluhIopScG5tmdWhTlCRauHrAVmp3Eo_PnjOOOITTHFURnrnqF&tt_from=copy&utm_medium=ios&utm_campaign=client_share&enable_checksum=1&user_id=7492887353330516997&share_link_id=87C185B6-D290-4FE5-876D-5F6E6C350F98&share_app_id=1233",
                icon: <TikTokIcon className="h-6 w-6 text-white" />,
                title: "TikTok",
              },
              {
                // TODO(shama): replace with brand imagery from Facebook
                image: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=400&fit=crop",
                href: "https://www.facebook.com/profile.php?id=61575028689348&mibextid=wwXIfr&rdid=ziyFSHbQTmrIb4HW&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1EqWpzXQyk%2F%3Fmibextid%3DwwXIfr",
                icon: <Facebook className="h-6 w-6 text-white" />,
                title: "Facebook",
              },
            ].map((card, index) => (
              <motion.a
                key={index}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.07 }}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                className="group relative glass-card rounded-2xl overflow-hidden focus-visible:ring-2 focus-visible:ring-warm"
                aria-label={`Open Shama on ${card.title}`}
              >
                <div
                  className="aspect-square bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${card.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent group-hover:from-black/85 transition-colors duration-300" />
                  {/* Warm corner glow on hover */}
                  <div className="absolute -top-10 -end-10 w-28 h-28 rounded-full bg-warm/0 group-hover:bg-warm/25 blur-2xl transition-colors duration-500" />
                  <div className="absolute bottom-4 start-4 end-4 flex items-center justify-between">
                    <span className="text-white font-semibold text-sm sm:text-base tracking-wide">
                      {card.title}
                    </span>
                    <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 group-hover:bg-warm/90 group-hover:border-warm transition-colors duration-300">
                      {card.icon}
                    </div>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>

          <div className="text-center mt-10 sm:mt-14">
            <Button
              asChild
              variant="outline"
              className="glass-card border-[#5B8DD9]/40 text-[#3E6BB5] dark:text-[#8BB4F0] hover:bg-[#5B8DD9] hover:text-white px-8 py-4 rounded-xl font-semibold glow-warm-hover"
            >
              <a
                href="https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="me-2 h-5 w-5" />
                {t("home.social.followUs")}
                <ArrowRight className={`ms-2 h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
