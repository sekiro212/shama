import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ShoppingBag, Eye, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { fetchProducts, Product, PerfumeSample } from "@/services/productsService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import { ScentDNACard } from "@/services/aiService";
import { PLACEHOLDER_IMAGE_URL } from "@/lib/productImage";

interface QuizResultsProps {
  recommendations: { name: string; matchScore: number; reason: string }[];
  isLoading: boolean;
  dnaCard?: ScentDNACard | null;
  quizAnswers?: Record<string, string>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },
};

export default function QuizResults({
  recommendations,
  isLoading,
  dnaCard,
  quizAnswers,
}: QuizResultsProps) {
  const { t, isRTL } = useLanguage();
  const { addToCart } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Fetch real product data to match with AI recommendations
  useEffect(() => {
    if (recommendations.length === 0) return;

    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const { products: allProducts } = await fetchProducts(1, 100);
        setProducts(allProducts);
      } catch (error) {
        console.error("Error loading products for quiz results:", error);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [recommendations]);

  // Match recommendation name to actual product
  const findProduct = (name: string): Product | undefined => {
    return products.find(
      (p) =>
        p.name.toLowerCase() === name.toLowerCase() ||
        p.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(p.name.toLowerCase())
    );
  };

  const handleAddToCart = (product: Product) => {
    if (!product.is_active || product.stock_quantity === 0) {
      toast.error(t("product.currentlySoldOut"));
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.image_url || PLACEHOLDER_IMAGE_URL,
      size: product.size,
      stock_quantity: product.stock_quantity,
    });

    toast.success(`${product.name} ${t("product.addedToCart")}`, {
      className: "glass-card border-[#5B8DD9]",
    });
  };

  const handleAddSampleToCart = (product: Product, sample: PerfumeSample) => {
    if (!sample.is_active || sample.stock_quantity === 0) {
      toast.error(t("product.currentlySoldOut"));
      return;
    }
    addToCart({
      id: sample.id,
      name: `${product.name} Sample (${sample.size})`,
      price: sample.price,
      image: product.images?.[0]?.image_url || PLACEHOLDER_IMAGE_URL,
      size: sample.size,
      stock_quantity: sample.stock_quantity,
    });
    toast.success(`${product.name} ${sample.size} ${t("product.addedToCart")}`, {
      className: "glass-card border-[#5B8DD9]",
    });
  };

  const handleDownloadCard = async () => {
    const el = document.getElementById("scent-dna-card");
    if (!el) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = "shama-scent-dna.png";
      link.href = dataUrl;
      link.click();
    } catch {
      toast.error(t("quiz.dna.downloadError"));
    }
  };

  const handleShareCard = async () => {
    const el = document.getElementById("scent-dna-card");
    if (!el || !dnaCard) return;
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(el, { quality: 0.95, pixelRatio: 2 });
      const caption = isRTL
        ? `هويتي العطرية على شمة: "${dnaCard.archetypeAr}" 🌸✨ @shama_luxury`
        : `My Shama Fragrance Identity: "${dnaCard.archetype}" 🌸✨ @shama_luxury`;
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "shama-scent-dna.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "My Shama Fragrance Identity", text: caption, files: [file] });
      } else {
        await navigator.clipboard.writeText(caption);
        toast.success(t("quiz.dna.copiedCaption"));
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(t("quiz.dna.shareError"));
    }
  };

  // Loading state
  if (isLoading || loadingProducts) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <motion.div
          animate={{ rotate: [0, 360], scale: [1, 1.15, 1] }}
          transition={{
            rotate: { duration: 3.2, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
          }}
          className="relative"
        >
          <Sparkles className="w-14 h-14 text-warm" />
          <div className="absolute inset-0 bg-warm/25 rounded-full blur-2xl" />
        </motion.div>

        <div className="text-center space-y-2">
          <p className="font-display text-[11px] tracking-[0.3em] uppercase text-warm">
            {t("quiz.results.analyzing")}
          </p>
          <h3 className="font-display text-2xl text-[#1E2A3D] dark:text-[#F5F5F5]">
            {t("quiz.results.findingPerfect")}
          </h3>
        </div>

        <div className="flex space-x-2 rtl:space-x-reverse">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -8, 0], opacity: [0.35, 1, 0.35] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
              className="w-2.5 h-2.5 rounded-full bg-warm"
            />
          ))}
        </div>
      </div>
    );
  }

  // No results
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <Sparkles className="w-12 h-12 text-[#323D50]/30 dark:text-white/30 mx-auto" />
        <h3 className="text-xl font-bold text-[#323D50] dark:text-white/70">{t("quiz.results.noResults")}</h3>
        <p className="text-[#6B7B8D] dark:text-white/50 text-sm">
          {t("quiz.results.noResultsDesc")}
        </p>
      </div>
    );
  }

  const showSamples = !quizAnswers?.format || quizAnswers.format === "sample" || quizAnswers.format === "both";
  const showBottle  = !quizAnswers?.format || quizAnswers.format === "full_bottle" || quizAnswers.format === "both";

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8 sm:mb-12 px-2">
        <p className="font-display text-[11px] tracking-[0.3em] uppercase text-warm mb-3">
          {t("quiz.results.title")}
        </p>
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] leading-[1.05] tracking-tight mb-3">
          {t("quiz.results.description")}
        </h2>
      </div>

      {/* Results Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-4 sm:space-y-6"
      >
        {recommendations.map((rec, index) => {
          const product = findProduct(rec.name);
          const imageUrl =
            product?.images?.[0]?.image_url || PLACEHOLDER_IMAGE_URL;
          const isSoldOut =
            product && (!product.is_active || product.stock_quantity === 0);

          return (
            <motion.div
              key={rec.name}
              variants={cardVariants}
              className="glass-card relative overflow-hidden rounded-2xl border border-[#323D50]/10 dark:border-white/10 hover:border-[#5B8DD9]/30 transition-all duration-500 group"
            >
              {/* Rank badge */}
              <div className="absolute top-3 start-3 sm:top-4 sm:start-4 z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-warm to-warm-glow flex items-center justify-center shadow-[0_4px_14px_rgba(212,165,116,0.45)] ring-2 ring-white/20">
                  <span className="font-display text-white font-semibold text-sm tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row">
                {/* Product Image */}
                <div className="relative w-full md:w-56 h-44 sm:h-56 md:h-auto flex-shrink-0 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={rec.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1a2235]/80 hidden md:block" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a2235]/80 to-transparent md:hidden" />
                </div>

                {/* Content */}
                <div className="flex-1 p-4 sm:p-6 md:p-8 flex flex-col justify-between">
                  <div className="space-y-3 sm:space-y-4">
                    {/* Name & Match Score */}
                    <div className="flex flex-row items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-xl sm:text-2xl md:text-[28px] font-semibold text-[#1E2A3D] dark:text-white group-hover:text-warm transition-colors duration-300 leading-[1.15] tracking-tight">
                          {rec.name}
                        </h3>
                        {product && showBottle && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="font-display text-[10px] text-warm/80 uppercase tracking-[0.22em] me-1">
                              {t("quiz.results.fullBottlePrice")}
                            </span>
                            <span className="font-display text-xl font-semibold tabular-nums text-[#1E2A3D] dark:text-[#F5F5F5]">
                              {product.price} <span className="text-[10px] font-sans tracking-[0.2em] text-[#6B7B8D] dark:text-white/50 align-middle">LYD</span>
                            </span>
                            <span className="text-[#6B7B8D] dark:text-white/40 text-sm">
                              · {product.size}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Match Score Badge */}
                      <div className="flex-shrink-0">
                        <div className="relative w-12 h-12 sm:w-16 sm:h-16">
                          {/* Circular progress background */}
                          <svg className="w-12 h-12 sm:w-16 sm:h-16 -rotate-90" viewBox="0 0 64 64">
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke="rgba(255,255,255,0.1)"
                              strokeWidth="4"
                              fill="none"
                            />
                            <circle
                              cx="32"
                              cy="32"
                              r="28"
                              stroke={`url(#scoreGradient-${index})`}
                              strokeWidth="4"
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray={`${(rec.matchScore / 100) * 175.9} 175.9`}
                            />
                            <defs>
                              <linearGradient
                                id={`scoreGradient-${index}`}
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="0%"
                              >
                                <stop offset="0%" stopColor="#D4A574" />
                                <stop offset="100%" stopColor="#E8B98A" />
                              </linearGradient>
                            </defs>
                          </svg>
                          {/* Score text */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="font-display text-[11px] sm:text-sm font-semibold text-warm tabular-nums">
                              {rec.matchScore}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* AI Reason */}
                    <p className="text-[#6B7B8D] dark:text-white/60 text-sm leading-relaxed">
                      {rec.reason}
                    </p>

                    {/* Sample chips */}
                    {(() => {
                      const activeSamples = product?.samples?.filter(s => s.is_active) ?? [];
                      return showSamples && activeSamples.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-xs text-[#6B7B8D] dark:text-white/40 uppercase tracking-wide">
                            {t("quiz.results.sampleOptions")}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {activeSamples.map(sample => {
                              const outOfStock = sample.stock_quantity === 0;
                              return (
                                <button
                                  key={sample.id}
                                  onClick={() => !outOfStock && product && handleAddSampleToCart(product, sample)}
                                  disabled={outOfStock}
                                  title={outOfStock ? t("quiz.results.soldOut") : t("quiz.results.addSampleToCart")}
                                  className={`text-xs px-3 py-1.5 rounded-full border transition-all duration-200 ${
                                    outOfStock
                                      ? "opacity-40 cursor-not-allowed border-[#323D50]/10 dark:border-white/10 text-[#6B7B8D]"
                                      : "border-warm/40 text-warm hover:bg-warm/10 hover:border-warm cursor-pointer"
                                  }`}
                                >
                                  {sample.size} · {sample.price} LYD
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6">
                    {product && (
                      <>
                        <Button
                          asChild
                          className="glass bg-[#323D50]/5 dark:bg-white/5 border border-warm/30 text-[#323D50] dark:text-white hover:bg-warm/10 hover:border-warm/60 hover:text-warm rounded-xl px-5 sm:px-6 py-3 min-h-[48px] w-full sm:w-auto font-semibold transition-all duration-300"
                        >
                          <Link to={`/product/${product.id}`}>
                            <Eye className="w-4 h-4 me-2" />
                            {t("quiz.results.viewProduct")}
                          </Link>
                        </Button>

                        {showBottle && (
                          <Button
                            onClick={() => handleAddToCart(product)}
                            disabled={!!isSoldOut}
                            className={`rounded-xl px-5 sm:px-6 py-3 min-h-[48px] w-full sm:w-auto font-semibold transition-all duration-300 ${
                              isSoldOut
                                ? "bg-gray-500/50 text-[#6B7B8D] dark:text-white/60 cursor-not-allowed"
                                : "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white glow-warm-hover"
                            }`}
                          >
                            <ShoppingBag className="w-4 h-4 me-2" />
                            {isSoldOut ? t("quiz.results.soldOut") : t("quiz.results.addToCart")}
                          </Button>
                        )}
                      </>
                    )}

                    {!product && (
                      <p className="text-[#6B7B8D] dark:text-white/40 text-sm italic">
                        {t("quiz.results.productNotFound")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#5B8DD9]/5 to-[#3E6BB5]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Scent DNA Identity Card */}
      {dnaCard && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-12"
        >
          <div
            id="scent-dna-card"
            className="max-w-sm mx-auto p-6 sm:p-8 rounded-3xl border border-warm/40 bg-gradient-to-br from-[#1E2A3D] via-[#1a2235] to-[#0d1525] shadow-[0_30px_60px_-20px_rgba(212,165,116,0.25)]"
          >
            {/* Header */}
            <div className="text-center mb-7">
              <div className="font-display text-[10px] tracking-[0.32em] text-warm uppercase font-semibold mb-4">
                ✦ {t("quiz.dna.title")} ✦
              </div>
              <p className="text-white/55 text-xs uppercase tracking-[0.2em] mb-3">
                {t("quiz.dna.youAre")}
              </p>
              <h3 className="font-display italic text-2xl sm:text-[26px] font-semibold text-[#F5F5F5] leading-tight">
                &ldquo;{isRTL ? dnaCard.archetypeAr : dnaCard.archetype}&rdquo;
              </h3>
            </div>

            {/* Scent family bars */}
            <div className="space-y-3 mb-7">
              {dnaCard.families.map((fam) => (
                <div key={fam.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-display text-[#F5F5F5]/85 tracking-wide">
                      {isRTL ? fam.nameAr : fam.name}
                    </span>
                    <span className="font-display text-warm tabular-nums">{fam.percent}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-warm to-warm-glow rounded-full shadow-[0_0_10px_rgba(212,165,116,0.5)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${fam.percent}%` }}
                      transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Signature notes */}
            <div className="flex flex-wrap gap-2 justify-center mb-5">
              {dnaCard.signatureNotes.map((note, i) => (
                <span
                  key={`${note}-${i}`}
                  className="text-xs bg-warm/20 text-warm px-3 py-1 rounded-full border border-warm/40"
                >
                  {note}
                </span>
              ))}
            </div>

            {/* Best worn */}
            <p className="text-center font-display text-[11px] tracking-[0.2em] uppercase text-white/50 mb-2">
              {t("quiz.dna.bestWorn")}
            </p>
            <p className="text-center text-sm text-[#F5F5F5]/75 italic">
              {isRTL ? dnaCard.bestTimeAr : dnaCard.bestTime} · {isRTL ? dnaCard.bestSeasonAr : dnaCard.bestSeason}
            </p>
          </div>

          {/* Buttons outside the card (not included in PNG) */}
          <div className="flex gap-3 justify-center mt-5">
            <Button
              onClick={handleDownloadCard}
              variant="outline"
              size="sm"
              className="glass border-warm/40 text-warm hover:bg-warm/10 hover:border-warm rounded-xl"
            >
              <Download className={`w-3 h-3 ${isRTL ? "ms-1" : "me-1"}`} />
              {t("quiz.dna.download")}
            </Button>
            <Button
              onClick={handleShareCard}
              variant="outline"
              size="sm"
              className="glass border-warm/40 text-warm hover:bg-warm/10 hover:border-warm rounded-xl"
            >
              <Share2 className={`w-3 h-3 ${isRTL ? "ms-1" : "me-1"}`} />
              {t("quiz.dna.share")}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
