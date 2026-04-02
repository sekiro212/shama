import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ShoppingBag, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { fetchProducts, Product } from "@/services/productsService";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuizResultsProps {
  recommendations: { name: string; matchScore: number; reason: string }[];
  isLoading: boolean;
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
    transition: { type: "spring", stiffness: 200, damping: 20 },
  },
};

export default function QuizResults({
  recommendations,
  isLoading,
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
      image:
        product.images?.[0]?.image_url ||
        "https://source.unsplash.com/100x100/?perfume,bottle",
      size: product.size,
      stock_quantity: product.stock_quantity,
    });

    toast.success(`${product.name} ${t("product.addedToCart")}`, {
      className: "glass-card border-[#5B8DD9]",
    });
  };

  // Loading state
  if (isLoading || loadingProducts) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        {/* Animated sparkles */}
        <motion.div
          animate={{
            rotate: [0, 360],
            scale: [1, 1.2, 1],
          }}
          transition={{
            rotate: { duration: 3, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
          }}
          className="relative"
        >
          <Sparkles className="w-16 h-16 text-[#5B8DD9]" />
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 bg-[#5B8DD9]/20 rounded-full blur-2xl"
          />
        </motion.div>

        {/* Loading text */}
        <div className="text-center space-y-2">
          <motion.h3
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xl font-bold gradient-text"
          >
            {t("quiz.results.analyzing")}
          </motion.h3>
          <p className="text-[#6B7B8D] dark:text-white/50 text-sm">
            {t("quiz.results.findingPerfect")}
          </p>
        </div>

        {/* Animated progress dots */}
        <div className="flex space-x-2 rtl:space-x-reverse">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ y: [0, -10, 0], opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
              className="w-3 h-3 rounded-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5]"
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <Sparkles className="w-6 h-6 text-[#5B8DD9]" />
          <h2 className="text-2xl md:text-3xl font-bold gradient-text">
            {t("quiz.results.title")}
          </h2>
          <Sparkles className="w-6 h-6 text-[#5B8DD9]" />
        </div>
        <p className="text-[#6B7B8D] dark:text-white/50 text-sm">
          {t("quiz.results.description")}
        </p>
      </motion.div>

      {/* Results Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {recommendations.map((rec, index) => {
          const product = findProduct(rec.name);
          const imageUrl =
            product?.images?.[0]?.image_url ||
            "https://source.unsplash.com/400x400/?perfume,luxury";
          const isSoldOut =
            product && (!product.is_active || product.stock_quantity === 0);

          return (
            <motion.div
              key={rec.name}
              variants={cardVariants}
              className="glass-card relative overflow-hidden rounded-2xl border border-[#323D50]/10 dark:border-white/10 hover:border-[#5B8DD9]/30 transition-all duration-500 group"
            >
              {/* Rank badge */}
              <div className="absolute top-4 left-4 z-10">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center shadow-lg shadow-[#5B8DD9]/30">
                  <span className="text-white font-bold text-sm">
                    #{index + 1}
                  </span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row">
                {/* Product Image */}
                <div className="relative w-full md:w-56 h-56 md:h-auto flex-shrink-0 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={rec.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1a2235]/80 hidden md:block" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1a2235]/80 to-transparent md:hidden" />
                </div>

                {/* Content */}
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Name & Match Score */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div>
                        <h3 className="text-xl md:text-2xl font-bold text-[#323D50] dark:text-white group-hover:gradient-text transition-all duration-300">
                          {rec.name}
                        </h3>
                        {product && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg font-bold gradient-text">
                              {product.price} LYD
                            </span>
                            <span className="text-[#6B7B8D] dark:text-white/40 text-sm">
                              {product.size}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Match Score Badge */}
                      <div className="flex-shrink-0">
                        <div className="relative w-16 h-16">
                          {/* Circular progress background */}
                          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
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
                              stroke="url(#scoreGradient)"
                              strokeWidth="4"
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray={`${(rec.matchScore / 100) * 175.9} 175.9`}
                            />
                            <defs>
                              <linearGradient
                                id="scoreGradient"
                                x1="0%"
                                y1="0%"
                                x2="100%"
                                y2="0%"
                              >
                                <stop offset="0%" stopColor="#5B8DD9" />
                                <stop offset="100%" stopColor="#3E6BB5" />
                              </linearGradient>
                            </defs>
                          </svg>
                          {/* Score text */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-[#323D50] dark:text-white">
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
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    {product && (
                      <>
                        <Button
                          asChild
                          className="glass bg-[#323D50]/10 dark:bg-white/10 border border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white hover:bg-[#323D50]/20 dark:hover:bg-white/20 rounded-xl px-6 py-3 font-semibold transition-all duration-300"
                        >
                          <Link to={`/product/${product.id}`}>
                            <Eye className="w-4 h-4 me-2" />
                            {t("quiz.results.viewProduct")}
                          </Link>
                        </Button>

                        <Button
                          onClick={() => handleAddToCart(product)}
                          disabled={!!isSoldOut}
                          className={`rounded-xl px-6 py-3 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#5B8DD9]/25 ${
                            isSoldOut
                              ? "bg-gray-500/50 text-[#6B7B8D] dark:text-white/60 cursor-not-allowed"
                              : "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white"
                          }`}
                        >
                          <ShoppingBag className="w-4 h-4 me-2" />
                          {isSoldOut ? t("quiz.results.soldOut") : t("quiz.results.addToCart")}
                        </Button>
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
    </div>
  );
}
