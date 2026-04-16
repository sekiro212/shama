import { useState, useEffect } from "react";
import { Gift, Filter, Sparkles } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductCard from "@/components/ProductCard";
import { filterProducts, Product } from "@/services/productsService";
import { useLanguage } from "@/contexts/LanguageContext";
import GiftWizard from "@/components/gift-builder/GiftWizard";

export default function GiftSetsPage() {
  const { t } = useLanguage();
  const [genderFilter, setGenderFilter] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const loadGiftSets = async () => {
      try {
        setLoading(true);
        // Filter products by type='gift'
        const giftSetProducts = await filterProducts({
          type: "gift",
          gender:
            genderFilter === "all"
              ? undefined
              : (genderFilter as "men" | "women" | "unisex"),
        });
        setProducts(giftSetProducts);
      } catch (error) {
        console.error("Error loading gift sets:", error);
      } finally {
        setLoading(false);
      }
    };

    loadGiftSets();
  }, [genderFilter]);

  // Filter products based on gender (they're already filtered by type='gift' from the database)
  const filteredGiftSets = products.filter(
    (product) => genderFilter === "all" || product.gender === genderFilter
  );

  return (
    <div className="container mx-auto px-3 sm:px-4 pt-20 md:pt-24 pb-8 sm:pb-12 bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen w-full">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8 sm:mb-12">
          <div className="flex items-center justify-center mb-4 flex-wrap">
            <Gift className="h-9 w-9 sm:h-12 sm:w-12 text-[#5B8DD9] me-2 sm:me-3" />
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold gradient-text leading-tight">
              {t("giftSets.title")}
            </h1>
          </div>
          <p className="dark:text-white/70 text-[#6B7B8D] text-sm sm:text-lg max-w-2xl mx-auto px-2">
            {t("giftSets.description")}
          </p>
          <div className="flex justify-center mt-5 sm:mt-6">
            <button
              onClick={() => setShowWizard(true)}
              className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white px-6 sm:px-8 py-3 min-h-[48px] rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center gap-2 shadow-lg shadow-[#5B8DD9]/30"
            >
              <Sparkles className="h-5 w-5" />
              {t("giftBuilder.buildMyGift")}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8 justify-center items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 dark:text-white/60 text-[#6B7B8D]" />
            <span className="dark:text-white/80 text-[#6B7B8D] font-medium text-sm sm:text-base">{t("giftSets.filterBy")}</span>
          </div>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-full max-w-xs sm:w-48 glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50]">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/20 border-[#323D50]/10 dark:border-white/10">
              <SelectItem value="all">{t("giftSets.allGenders")}</SelectItem>
              <SelectItem value="men">{t("giftSets.men")}</SelectItem>
              <SelectItem value="women">{t("giftSets.women")}</SelectItem>
              <SelectItem value="unisex">{t("giftSets.unisex")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gift Sets Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="glass-card p-8 rounded-2xl text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#5B8DD9] mx-auto mb-4"></div>
              <p className="dark:text-white/60 text-[#6B7B8D]">{t("giftSets.loadingGiftSets")}</p>
            </div>
          </div>
        ) : filteredGiftSets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredGiftSets.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="glass-card p-12 rounded-2xl max-w-md mx-auto">
              <Gift className="h-16 w-16 dark:text-white/40 text-[#5B8DD9] mx-auto mb-6" />
              <h3 className="text-xl font-semibold dark:text-[#F5F5F5] text-[#323D50] mb-4">
                {t("giftSets.noGiftSets")}
              </h3>
              <p className="dark:text-white/60 text-[#6B7B8D] mb-6">
                {genderFilter === "all"
                  ? t("giftSets.noGiftSetsAll")
                  : t("giftSets.noGiftSetsGender").replace("{gender}", genderFilter)}
              </p>
              <button
                onClick={() => setGenderFilter("all")}
                className="glass bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              >
                {t("giftSets.viewAll")}
              </button>
            </div>
          </div>
        )}
      </div>
      {showWizard && <GiftWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}
