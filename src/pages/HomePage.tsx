import { Link, useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Star,
  Instagram,
  ArrowRight,
  Sparkles,
  Users,
  Heart,
  Wind,
  Facebook,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ProductCard from "@/components/ProductCard";
import {
  fetchProducts,
  getFullBottles,
  Product,
} from "@/services/productsService";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
// ChatbotButton is now global in App.tsx
import RecentlyViewed from "@/components/RecentlyViewed";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import PixelTransition from "@/components/ui/PixelTransition";
import MarketingVideoSection from "@/components/MarketingVideoSection";
import ScentMemoryWall from "@/components/ScentMemoryWall";

// TikTokIcon SVG from Footer
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

const AIFinderBanner = () => {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();

  const chips = [
    { label: t("home.chipNightOut"), query: "night out" },
    { label: t("home.chipEveryday"), query: "everyday fresh" },
    { label: t("home.chipGiftForHer"), query: "gift for her" },
    { label: t("home.chipWoody"), query: "woody warm" },
    { label: t("home.chipSummer"), query: "summer light" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="glass-card rounded-2xl overflow-hidden my-8"
    >
      {/* Animated gradient border effect via a wrapper with gradient bg */}
      <div className="relative p-6 md:p-8">
        {/* Subtle gradient overlay in top-right corner */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#5B8DD9]/10 to-transparent rounded-2xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Left: text content */}
          <div className="flex-1 text-center md:text-start">
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B8DD9] bg-[#5B8DD9]/10 px-3 py-1 rounded-full mb-3">
              <Sparkles className="w-3 h-3" />
              {t("home.aiPowered")}
            </span>

            <h2 className="text-xl md:text-2xl font-bold text-[#323D50] dark:text-[#F5F5F5] mb-2">
              {t("home.aiFinderBannerTitle")}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {t("home.aiFinderBannerSub")}
            </p>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 mb-4 justify-center md:justify-start">
              {chips.map((chip) => (
                <button
                  key={chip.query}
                  onClick={() =>
                    navigate(`/ai-finder?q=${encodeURIComponent(chip.query)}`)
                  }
                  className="px-3 py-1 rounded-full text-sm border border-[#5B8DD9]/40 hover:border-[#5B8DD9] hover:bg-[#5B8DD9]/10 text-[#5B8DD9] transition-all cursor-pointer"
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* CTA button */}
            <button
              onClick={() => navigate("/ai-finder")}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white px-5 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" />
              {t("home.aiFinderBannerCta")}
              <ChevronRight
                className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* Right: animated sparkle visual */}
          <div className="hidden md:flex items-center justify-center w-32 h-32 relative flex-shrink-0">
            {/* Animated concentric circles */}
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-[#5B8DD9]/20"
                style={{ width: 40 + i * 28, height: 40 + i * 28 }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                transition={{
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
              />
            ))}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-10 h-10 text-[#5B8DD9]" />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function HomePage() {
  const { t, isRTL } = useLanguage();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);

    // Trigger animations after component mounts
    setTimeout(() => setIsVisible(true), 100);

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const { products } = await fetchProducts();
        const bottles = getFullBottles(products);
        setFeaturedProducts(bottles.slice(0, 3));
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#F8F9FB] dark:bg-[#1a2235] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-[#5B8DD9]/20 to-[#3E6BB5]/20 rounded-full blur-xl animate-float" />
        <div
          className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-[#3E6BB5]/20 to-[#5B8DD9]/20 rounded-full blur-xl animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-40 left-1/4 w-40 h-40 bg-gradient-to-r from-[#5B8DD9]/10 to-[#3E6BB5]/10 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "4s" }}
        />
      </div>
      {/* ChatbotButton is now rendered globally in App.tsx */}
      {/* Enhanced Hero Section */}
      <section className="relative h-screen flex items-center justify-center w-full overflow-hidden">
        {/* Parallax Background */}
        <div
          className="absolute inset-0 z-0"
          style={{ transform: `translateY(${scrollY * 0.5}px)` }}
        >
          <img
            src="https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=1920&h=1080&fit=crop"
            alt="Luxury Perfume"
            className="w-full h-[120%] object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#F8F9FB] dark:from-[#1a2235] dark:via-[#1a2235]/80 via-[#F8F9FB] dark:via-[#1a2235]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#F8F9FB] dark:from-[#1a2235] via-transparent to-transparent" />
        </div>

        <BackgroundBeamsWithCollision>
          {/* Floating Elements */}
          <div className="absolute inset-0 z-5">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#5B8DD9] rounded-full animate-pulse-glow" />
            <div
              className="absolute top-3/4 right-1/3 w-1 h-1 bg-[#3E6BB5] rounded-full animate-pulse-glow"
              style={{ animationDelay: "1s" }}
            />
            <div
              className="absolute bottom-1/4 left-2/3 w-1.5 h-1.5 bg-[#5B8DD9] rounded-full animate-pulse-glow"
              style={{ animationDelay: "0.5s" }}
            />
          </div>

          <div
            className={`relative z-10 text-center max-w-5xl px-4 transition-all duration-1000 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            <div className="mb-6">
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-[#5B8DD9]/20 to-[#3E6BB5]/20 backdrop-blur-sm border border-[#5B8DD9]/30 rounded-full px-4 py-2 text-sm text-[#323D50] dark:text-white/80 mb-8">
                <Sparkles className="w-4 h-4" />
                {t("home.hero.badge")}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-[#323D50] dark:text-white mb-6 sm:mb-8 leading-tight">
              {t("home.hero.titleLine1")}
              <span className="gradient-text block animate-pulse-glow">
                {t("home.hero.titleLine2")}
              </span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-[#323D50]/80 dark:text-white/90 mb-8 sm:mb-10 md:mb-12 max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto leading-relaxed px-2 sm:px-0">
              {t("home.hero.description")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-lg sm:max-w-none mx-auto">
              <Button
                asChild
                className="glass-card bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white text-base sm:text-lg px-6 sm:px-8 md:px-10 py-4 sm:py-6 md:py-7 rounded-xl font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full sm:w-auto"
              >
                <Link to="/quiz">
                  <Sparkles className="me-2 h-4 w-4 sm:h-5 sm:w-5" />
                  {t("home.hero.ctaQuiz")}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="glass-card border-[#5B8DD9]/50 text-[#323D50] dark:text-white hover:bg-[#5B8DD9] hover:border-[#5B8DD9] hover:text-white text-base sm:text-lg px-6 sm:px-8 md:px-10 py-4 sm:py-6 md:py-7 rounded-xl font-semibold glow-hover w-full sm:w-auto"
              >
                <Link to="/collection">
                  {t("home.hero.ctaCollection")}
                  <ChevronRight className={`ms-2 h-4 w-4 sm:h-5 sm:w-5 ${isRTL ? "rotate-180" : ""}`} />
                </Link>
              </Button>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-[#323D50]/30 dark:border-white/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-[#323D50]/60 dark:bg-white/60 rounded-full mt-2 animate-pulse" />
            </div>
          </div>
        </BackgroundBeamsWithCollision>
      </section>

      {/* Stats Section */}
      <section className="py-12 sm:py-16 md:py-20 relative z-10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 md:gap-8">
            {[
              { icon: Users, label: t("home.stats.happyCustomers"), value: "150+" },
              { icon: Wind, label: t("home.stats.ourPerfumes"), value: "100+" },
              { icon: Heart, label: t("home.stats.yearsOfCraft"), value: "1+" },
              { icon: Star, label: t("home.stats.averageRating"), value: "4.6+" },
            ].map((stat, index) => (
              <Card
                key={index}
                className="glass-card text-center p-3 sm:p-4 md:p-6 glow-hover animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-0">
                  <stat.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#5B8DD9] mx-auto mb-2 sm:mb-3 md:mb-4" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-1 sm:mb-2">
                    {stat.value}
                  </div>
                  <div className="dark:text-white/60 text-[#6B7B8D] text-xs sm:text-sm">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Marketing Video Section */}
      <MarketingVideoSection />

      {/* AI Finder Banner */}
      <section className="py-8 sm:py-12 relative z-10">
        <div className="container mx-auto px-3 sm:px-4">
          <AIFinderBanner />
        </div>
      </section>

      {/* Enhanced Featured Products */}
      <section id="products" className="py-12 sm:py-16 md:py-24 relative z-10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="text-center mb-8 sm:mb-12 md:mb-16 animate-slide-up">
            <span className="inline-block text-[#5B8DD9] text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3 sm:mb-4">
              {t("home.featured.badge")}
            </span>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold gradient-text mb-3 sm:mb-6 leading-tight">
              {t("home.featured.title")}
            </h2>
            <p className="dark:text-white/70 text-[#6B7B8D] text-sm sm:text-lg md:text-xl max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto leading-relaxed px-2 sm:px-0">
              {t("home.featured.description")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-8 sm:mb-16">
            {loading
              ? // Loading skeleton
                Array.from({ length: 3 }).map((_, index) => (
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
                  <div
                    key={product.id}
                    className="animate-scale-in glow-hover"
                    style={{ animationDelay: `${index * 0.2}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
          </div>

          <div className="text-center">
            <Button
              asChild
              className="glass-card border border-[#5B8DD9] text-[#5B8DD9] hover:bg-[#5B8DD9] hover:text-white px-8 py-4 rounded-xl font-semibold glow-hover"
            >
              <Link to="/collection">
                {t("home.featured.viewAll")}
                <ChevronRight className={`ms-2 h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Enhanced About Section */}
      <section className="py-12 sm:py-16 md:py-24 relative z-10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
            <div className="space-y-6 sm:space-y-8 animate-slide-up">
              <div>
                <span className="inline-block text-[#5B8DD9] text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3 sm:mb-4">
                  {t("home.about.badge")}
                </span>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-4 sm:mb-6 leading-tight">
                  {t("home.about.title")}
                </h2>
                <p className="dark:text-white/80 text-[#6B7B8D] text-base sm:text-lg leading-relaxed mb-4 sm:mb-6">
                  {t("home.about.description1")}
                </p>
                <p className="dark:text-white/70 text-[#6B7B8D] text-sm sm:text-base leading-relaxed">
                  {t("home.about.description2")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                {[
                  { label: t("home.about.premiumIngredients"), desc: t("home.about.sourcedGlobally") },
                  { label: t("home.about.masterCrafted"), desc: t("home.about.yearsOfExpertise") },
                ].map((feature, index) => (
                  <div key={index} className="glass-card p-4 sm:p-6 rounded-xl">
                    <div className="dark:text-[#F5F5F5] text-[#323D50] font-semibold mb-2">
                      {feature.label}
                    </div>
                    <div className="dark:text-white/60 text-[#6B7B8D] text-sm">{feature.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-float">
              <div className="glass-card p-8 rounded-2xl">
                <PixelTransition
                  firstContent={
                    <img
                      src="https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/e159f380a3a42644f03ca7442d2864b0~tplv-tiktokx-cropcenter:1080:1080.jpeg?dr=14579&refresh_token=8be9595c&x-expires=1753538400&x-signature=%2BNcK7CjJZDsNOmd9K1lUKJvPE8M%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=maliva"
                      alt="Perfume crafting process"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  }
                  secondContent={
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: "#111",
                      }}
                    >
                      <p
                        style={{
                          fontWeight: 900,
                          fontSize: "3rem",
                          color: "#ffffff",
                        }}
                      >
                        {t("home.about.welcomeToShama")}
                      </p>
                    </div>
                  }
                  gridSize={44}
                  pixelColor="#ffffff"
                  animationStepDuration={0.4}
                  className="custom-pixel-card w-full h-80 rounded-xl"
                />
                <div className="absolute inset-8 bg-gradient-to-t from-black/50 to-transparent rounded-xl pointer-events-none" />
                <div className="absolute bottom-12 left-12 text-white pointer-events-none">
                  {/* <div className="text-2xl font-bold mb-2">Artisan Crafted</div> */}
                  <div className="text-white/80">{t("home.about.since2024")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      <section className="relative z-10">
        <div className="container mx-auto px-4">
          <RecentlyViewed />

          {/* Scent Memory Wall */}
          <ScentMemoryWall />
        </div>
      </section>

      {/* Enhanced Instagram Feed */}
      <section className="py-12 sm:py-16 md:py-24 relative z-10">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="text-center mb-8 sm:mb-12 md:mb-16 animate-slide-up">
            <span className="inline-block text-[#5B8DD9] text-xs sm:text-sm font-semibold tracking-wider uppercase mb-3 sm:mb-4">
              {t("home.social.badge")}
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-3 sm:mb-6 leading-tight">
              {t("home.social.title")}
            </h2>
            <p className="dark:text-white/70 text-[#6B7B8D] text-sm sm:text-base md:text-lg max-w-xs sm:max-w-lg md:max-w-2xl mx-auto px-2 sm:px-0">
              {t("home.social.description")}
            </p>
          </div>

          <div className="mt-8 sm:mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {[
              {
                image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop",
                href: "https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr",
                icon: <Instagram className="h-6 w-6 text-white" />,
                title: "Instagram",
              },
              {
                image: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=400&fit=crop",
                href: "https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr",
                icon: <Instagram className="h-6 w-6 text-white" />,
                title: "Instagram",
              },
              {
                image: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=400&fit=crop",
                href: "https://www.tiktok.com/@shama_625?_r=1&_d=ehaiidj2573dih&sec_uid=MS4wLjABAAAAtWhwVbsiMc_T7iAluhIopScG5tmdWhTlCRauHrAVmp3Eo_PnjOOOITTHFURnrnqF&share_author_id=7492887353330516997&sharer_language=en&source=h5_m&u_code=ejkmi594adgdl5&ug_btm=b8727,b0&social_share_type=4&utm_source=copy&sec_user_id=MS4wLjABAAAAtWhwVbsiMc_T7iAluhIopScG5tmdWhTlCRauHrAVmp3Eo_PnjOOOITTHFURnrnqF&tt_from=copy&utm_medium=ios&utm_campaign=client_share&enable_checksum=1&user_id=7492887353330516997&share_link_id=87C185B6-D290-4FE5-876D-5F6E6C350F98&share_app_id=1233",
                icon: <TikTokIcon className="h-6 w-6 text-white" />,
                title: "TikTok",
              },
              {
                image: "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=400&fit=crop",
                href: "https://www.facebook.com/profile.php?id=61575028689348&mibextid=wwXIfr&rdid=ziyFSHbQTmrIb4HW&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1EqWpzXQyk%2F%3Fmibextid%3DwwXIfr",
                icon: <Facebook className="h-6 w-6 text-white" />,
                title: "Facebook",
              },
            ].map((card, index) => (
              <a
                key={index}
                href={card.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group glass-card rounded-2xl overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#5B8DD9]/20"
              >
                <div
                  className="aspect-square bg-cover bg-center relative"
                  style={{ backgroundImage: `url(${card.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-colors duration-300" />
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <span className="text-white font-semibold text-sm sm:text-base">{card.title}</span>
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 group-hover:bg-white/30 transition-colors duration-300">
                      {card.icon}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button
              asChild
              className="glass-card border border-[#5B8DD9] text-[#5B8DD9] hover:bg-[#5B8DD9] hover:text-white px-8 py-4 rounded-xl font-semibold glow-hover"
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
