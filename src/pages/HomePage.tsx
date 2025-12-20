import { Link } from "react-router-dom";
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
import { ChatbotButton } from "@/components/ui/ChatbotButton";
import { BackgroundBeamsWithCollision } from "@/components/ui/background-beams-with-collision";
import PixelTransition from "@/components/ui/PixelTransition";
import { PinContainer } from "@/components/ui/3d-pin";

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

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [scrollY, setScrollY] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleChatOpen = () => {
    setIsChatOpen(true);
  };
  const handleChatClose = () => {
    setIsChatOpen(false);
  };

  // Debug effect
  useEffect(() => {}, [isChatOpen]);

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
    <div className="min-h-screen w-full bg-[#0e0a1d] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-[#b24ce2]/20 to-[#8e2de2]/20 rounded-full blur-xl animate-float" />
        <div
          className="absolute top-40 right-20 w-24 h-24 bg-gradient-to-r from-[#8e2de2]/20 to-[#b24ce2]/20 rounded-full blur-xl animate-float"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute bottom-40 left-1/4 w-40 h-40 bg-gradient-to-r from-[#b24ce2]/10 to-[#8e2de2]/10 rounded-full blur-2xl animate-float"
          style={{ animationDelay: "4s" }}
        />
      </div>
      <ChatbotButton
        isOpen={isChatOpen}
        onOpen={handleChatOpen}
        onClose={handleChatClose}
      />
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
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e0a1d] via-[#0e0a1d]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e0a1d] via-transparent to-transparent" />
        </div>

        <BackgroundBeamsWithCollision beamColor="from-[#b24ce2] via-[#b24ce2] to-transparent">
          {/* Floating Elements */}
          <div className="absolute inset-0 z-5">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-[#b24ce2] rounded-full animate-pulse-glow" />
            <div
              className="absolute top-3/4 right-1/3 w-1 h-1 bg-[#8e2de2] rounded-full animate-pulse-glow"
              style={{ animationDelay: "1s" }}
            />
            <div
              className="absolute bottom-1/4 left-2/3 w-1.5 h-1.5 bg-[#b24ce2] rounded-full animate-pulse-glow"
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
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-[#b24ce2]/20 to-[#8e2de2]/20 backdrop-blur-sm border border-[#b24ce2]/30 rounded-full px-4 py-2 text-sm text-white/80 mb-8">
                <Sparkles className="w-4 h-4" />
                Luxury Fragrance Collection
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold text-white mb-6 sm:mb-8 leading-tight">
              Discover Your
              <span className="gradient-text block animate-pulse-glow">
                Signature Scent
              </span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-8 sm:mb-10 md:mb-12 max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto leading-relaxed px-2 sm:px-0">
              Luxury fragrances crafted for the discerning individual. Each
              bottle tells a story, each scent creates memories that last
              forever.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-lg sm:max-w-none mx-auto">
              <Button
                onClick={handleChatOpen}
                className="glass-card bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] hover:from-[#8e2de2] hover:to-[#b24ce2] text-white text-base sm:text-lg px-6 sm:px-8 md:px-10 py-4 sm:py-6 md:py-7 rounded-xl font-semibold transform transition-all duration-300 hover:scale-105 hover:shadow-2xl w-full sm:w-auto"
              >
                <Sparkles className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Find Your Fragrance
              </Button>
              <Button
                asChild
                variant="outline"
                className="glass-card border-[#b24ce2]/50 text-white hover:bg-[#b24ce2] hover:border-[#b24ce2] text-base sm:text-lg px-6 sm:px-8 md:px-10 py-4 sm:py-6 md:py-7 rounded-xl font-semibold glow-hover w-full sm:w-auto"
              >
                <Link to="/collection">
                  Shop Collection
                  <ChevronRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Link>
              </Button>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
              <div className="w-1 h-3 bg-white/60 rounded-full mt-2 animate-pulse" />
            </div>
          </div>
        </BackgroundBeamsWithCollision>
      </section>

      {/* Stats Section */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
            {[
              { icon: Users, label: "Happy Customers", value: "150+" },
              { icon: Wind, label: "Our Perfumes ", value: "100+" },
              { icon: Heart, label: "Years of Craft", value: "1+" },
              { icon: Star, label: "Average Rating", value: "4.6+" },
            ].map((stat, index) => (
              <Card
                key={index}
                className="glass-card text-center p-3 sm:p-4 md:p-6 glow-hover animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardContent className="p-0">
                  <stat.icon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 text-[#b24ce2] mx-auto mb-2 sm:mb-3 md:mb-4" />
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1 sm:mb-2">
                    {stat.value}
                  </div>
                  <div className="text-white/60 text-xs sm:text-sm">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Featured Products */}
      <section id="products" className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-slide-up">
            <span className="inline-block text-[#b24ce2] text-sm font-semibold tracking-wider uppercase mb-4">
              Featured Collection
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text mb-4 sm:mb-6">
              Signature Fragrances
            </h2>
            <p className="text-white/70 text-lg sm:text-xl max-w-xs sm:max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
              Discover our most beloved scents, each carefully crafted to evoke
              emotion and create lasting memories that define your unique
              essence.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
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
              className="glass-card border border-[#b24ce2] text-[#b24ce2] hover:bg-[#b24ce2] hover:text-white px-8 py-4 rounded-xl font-semibold glow-hover"
            >
              <Link to="/collection">
                View All Products
                <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Enhanced About Section */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-slide-up">
              <div>
                <span className="inline-block text-[#b24ce2] text-sm font-semibold tracking-wider uppercase mb-4">
                  Our Story
                </span>
                <h2 className="text-5xl font-bold gradient-text mb-6">
                  The Art of Shama
                </h2>
                <p className="text-white/80 text-lg leading-relaxed mb-6">
                  Born from a passion for olfactory artistry, Shama represents
                  the perfect harmony between traditional craftsmanship and
                  modern innovation. Each fragrance is a carefully composed
                  symphony of the world's finest ingredients.
                </p>
                <p className="text-white/70 leading-relaxed">
                  Our master perfumers spend years perfecting each blend,
                  ensuring that every bottle carries not just a scent, but an
                  emotion, a memory, a piece of your story.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: "Premium Ingredients", desc: "Sourced globally" },
                  { label: "Master Crafted", desc: "Years of expertise" },
                ].map((feature, index) => (
                  <div key={index} className="glass-card p-6 rounded-xl">
                    <div className="text-white font-semibold mb-2">
                      {feature.label}
                    </div>
                    <div className="text-white/60 text-sm">{feature.desc}</div>
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
                        Welcome to Shama
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
                  <div className="text-white/80">Since 2024</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced Instagram Feed */}
      <section className="py-24 relative z-10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-slide-up">
            <span className="inline-block text-[#b24ce2] text-sm font-semibold tracking-wider uppercase mb-4">
              Social Gallery
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-4 sm:mb-6">
              Follow @ShamaFragrance
            </h2>
            <p className="text-white/70 text-base sm:text-lg max-w-xs sm:max-w-lg md:max-w-2xl mx-auto px-4 sm:px-0">
              Join our community and discover how Shama becomes part of your
              daily ritual
            </p>
          </div>

          <div className="mt-12 flex justify-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-14">
              {[
                {
                  image:
                    "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop",
                  href: "https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr",
                  icon: <Instagram className="h-8 w-8 text-white" />,
                  title: "Instagram",
                },
                {
                  image:
                    "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&h=400&fit=crop",
                  href: "https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr",
                  icon: <Instagram className="h-8 w-8 text-white" />,
                  title: "Instagram",
                },
                {
                  image:
                    "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=400&h=400&fit=crop",
                  href: "https://www.tiktok.com/@shama_625?_r=1&_d=ehaiidj2573dih&sec_uid=MS4wLjABAAAAtWhwVbsiMc_T7iAluhIopScG5tmdWhTlCRauHrAVmp3Eo_PnjOOOITTHFURnrnqF&share_author_id=7492887353330516997&sharer_language=en&source=h5_m&u_code=ejkmi594adgdl5&ug_btm=b8727,b0&social_share_type=4&utm_source=copy&sec_user_id=MS4wLjABAAAAtWhwVbsiMc_T7iAluhIopScG5tmdWhTlCRauHrAVmp3Eo_PnjOOOITTHFURnrnqF&tt_from=copy&utm_medium=ios&utm_campaign=client_share&enable_checksum=1&user_id=7492887353330516997&share_link_id=87C185B6-D290-4FE5-876D-5F6E6C350F98&share_app_id=1233",
                  icon: <TikTokIcon className="h-8 w-8 text-white" />,
                  title: "TikTok",
                },
                {
                  image:
                    "https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=400&h=400&fit=crop",
                  href: "https://www.facebook.com/profile.php?id=61575028689348&mibextid=wwXIfr&rdid=ziyFSHbQTmrIb4HW&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F1EqWpzXQyk%2F%3Fmibextid%3DwwXIfr",
                  icon: <Facebook className="h-8 w-8 text-white" />,
                  title: "Facebook",
                },
              ].map((card, index) => (
                <PinContainer
                  key={index}
                  title={card.title}
                  href={card.href}
                  containerClassName="relative w-[20rem] h-[20rem]"
                >
                  <div className="flex flex-col p-4 tracking-tight text-slate-100/50 w-[20rem] h-[20rem]">
                    <div
                      className="flex flex-1 w-full rounded-lg mt-4 bg-cover bg-center relative"
                      style={{ backgroundImage: `url(${card.image})` }}
                    >
                      <div className="absolute bottom-4 right-4 z-10 bg-black/70 rounded-full p-2">
                        {card.icon}
                      </div>
                    </div>
                  </div>
                </PinContainer>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <Button
              asChild
              className="glass-card border border-[#b24ce2] text-[#b24ce2] hover:bg-[#b24ce2] hover:text-white px-8 py-4 rounded-xl font-semibold glow-hover"
            >
              <a
                href="https://www.instagram.com/shama._200/?igsh=dDcyZmc3ODByNHBl&utm_source=qr"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram className="mr-2 h-5 w-5" />
                Follow Us
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
