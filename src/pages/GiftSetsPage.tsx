import { useState, useEffect, useMemo } from "react";
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

type Occasion = "all" | "birthday" | "anniversary" | "eid" | "valentine" | "wedding" | "justBecause";

const OCCASIONS: { key: Occasion; labelKey: string; tokens: string[] }[] = [
  { key: "all", labelKey: "giftSets.filterAll", tokens: [] },
  { key: "birthday", labelKey: "giftBuilder.occasionBirthday", tokens: ["birthday", "ميلاد"] },
  { key: "anniversary", labelKey: "giftBuilder.occasionAnniversary", tokens: ["anniversary", "ذكرى"] },
  { key: "eid", labelKey: "giftBuilder.occasionEid", tokens: ["eid", "عيد"] },
  { key: "valentine", labelKey: "giftBuilder.occasionValentine", tokens: ["valentine", "الحب", "رومانسي"] },
  { key: "wedding", labelKey: "giftBuilder.occasionWedding", tokens: ["wedding", "زفاف", "زواج"] },
  { key: "justBecause", labelKey: "giftBuilder.occasionJustBecause", tokens: ["gift", "هدية"] },
];

function matchesOccasion(product: Product, occasion: Occasion): boolean {
  if (occasion === "all") return true;
  const config = OCCASIONS.find((o) => o.key === occasion);
  if (!config || config.tokens.length === 0) return true;
  const haystack = [
    product.name,
    product.name_ar,
    product.description,
    product.description_ar,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return config.tokens.some((tok) => haystack.includes(tok.toLowerCase()));
}

export default function GiftSetsPage() {
  const { t } = useLanguage();
  const [genderFilter, setGenderFilter] = useState("all");
  const [occasionFilter, setOccasionFilter] = useState<Occasion>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  useEffect(() => {
    const loadGiftSets = async () => {
      try {
        setLoading(true);
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

  const filteredGiftSets = useMemo(() => {
    const byGender = products.filter(
      (product) => genderFilter === "all" || product.gender === genderFilter,
    );
    const byOccasion = byGender.filter((p) => matchesOccasion(p, occasionFilter));
    // Safety fallback: if occasion filter returns zero but gender matches exist,
    // show everything rather than an empty grid (user feedback best-practice).
    return byOccasion.length > 0 || occasionFilter === "all" ? byOccasion : byGender;
  }, [products, genderFilter, occasionFilter]);

  return (
    <div className="bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen w-full">
      <div className="container mx-auto px-3 sm:px-4 pt-20 md:pt-24 pb-8 sm:pb-12 max-w-6xl">
        {/* Hero — editorial gifting */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 glass bg-warm/10 border border-warm/40 rounded-full px-4 py-2 mb-4">
            <Gift className="h-4 w-4 text-warm" />
            <span className="font-display text-[11px] tracking-[0.28em] uppercase text-warm">
              {t("giftSets.eyebrow")}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[#1E2A3D] dark:text-[#F5F5F5] leading-[1.05] mb-4">
            {t("giftSets.title")}
          </h1>
          <p className="dark:text-white/65 text-[#6B7B8D] text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            {t("giftSets.description")}
          </p>
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setShowWizard(true)}
              className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white px-6 sm:px-8 py-3 min-h-[48px] rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 glow-warm-hover"
            >
              <Sparkles className="h-5 w-5" />
              {t("giftBuilder.buildMyGift")}
            </button>
          </div>
        </div>

        {/* Pullquote */}
        <figure className="max-w-3xl mx-auto text-center mb-10 sm:mb-12 px-4">
          <blockquote className="font-display italic text-xl sm:text-2xl text-[#1E2A3D] dark:text-[#F5F5F5]/90 leading-snug">
            &ldquo;{t("giftSets.pullquote")}&rdquo;
          </blockquote>
        </figure>

        {/* Occasion chips + gender select */}
        <div className="mb-8 space-y-4">
          <p className="font-display text-[11px] tracking-[0.28em] uppercase text-warm text-center">
            {t("giftSets.filterByOccasion")}
          </p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide justify-start sm:justify-center pb-1 -mx-3 px-3">
            {OCCASIONS.map((occ) => {
              const active = occasionFilter === occ.key;
              return (
                <button
                  key={occ.key}
                  onClick={() => setOccasionFilter(occ.key)}
                  className={`shrink-0 min-h-[40px] px-4 rounded-full text-sm transition-all duration-200 ${
                    active
                      ? "bg-warm/15 border border-warm/50 text-warm font-semibold shadow-sm shadow-warm/15"
                      : "glass dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 dark:text-white/70 text-[#6B7B8D] hover:border-warm/30 hover:text-warm hover:bg-warm/5"
                  }`}
                >
                  {t(occ.labelKey)}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 dark:text-white/60 text-[#6B7B8D]" />
              <span className="dark:text-white/70 text-[#6B7B8D] text-sm">
                {t("giftSets.filterBy")}
              </span>
            </div>
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-full max-w-xs sm:w-48 glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/20 border-[#323D50]/10 dark:border-white/10">
                <SelectItem value="all">{t("giftSets.allGenders")}</SelectItem>
                <SelectItem value="men">{t("giftSets.men")}</SelectItem>
                <SelectItem value="women">{t("giftSets.women")}</SelectItem>
                <SelectItem value="unisex">{t("giftSets.unisex")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Gift Sets Grid */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 border-t border-s border-[#323D50]/10 dark:border-white/10">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border-b border-e border-[#323D50]/10 dark:border-white/10"
              >
                <div className="aspect-[4/5] shama-skeleton" />
                <div className="flex flex-col items-center gap-2 px-4 pb-6 pt-5">
                  <div className="h-4 w-2/3 rounded shama-skeleton" />
                  <div className="h-4 w-16 rounded shama-skeleton" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredGiftSets.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 border-t border-s border-[#323D50]/10 dark:border-white/10">
            {filteredGiftSets.map((product) => (
              <div
                key={product.id}
                className="border-b border-e border-[#323D50]/10 dark:border-white/10"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="glass-card p-10 rounded-2xl max-w-md mx-auto">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warm/15 border border-warm/30 mb-4">
                <Gift className="h-7 w-7 text-warm" />
              </div>
              <h3 className="font-display text-2xl font-semibold dark:text-[#F5F5F5] text-[#1E2A3D] mb-3">
                {t("giftSets.noGiftSets")}
              </h3>
              <p className="dark:text-white/60 text-[#6B7B8D] mb-6 leading-relaxed">
                {genderFilter === "all"
                  ? t("giftSets.noGiftSetsAll")
                  : t("giftSets.noGiftSetsGender").replace("{gender}", genderFilter)}
              </p>
              <button
                onClick={() => {
                  setGenderFilter("all");
                  setOccasionFilter("all");
                }}
                className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 glow-warm-hover"
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
