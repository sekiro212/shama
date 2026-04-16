import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Filter, ChevronLeft, ChevronRight, Search, SortAsc, X, SlidersHorizontal } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import { fetchProducts, Product } from "@/services/productsService";

export default function CollectionPage() {
  const { t, isRTL, language } = useLanguage();
  const [genderFilter, setGenderFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [totalProducts, setTotalProducts] = useState(0);

  // Collect all unique fragrance notes from products — language-aware
  const allNotes = useMemo(() => {
    const notes = new Set<string>();
    products.forEach((p) => {
      const source =
        language === "ar" && p.fragranceNotes_ar?.top?.length
          ? p.fragranceNotes_ar
          : p.fragranceNotes;
      [
        ...(source?.top || []),
        ...(source?.middle || []),
        ...(source?.base || []),
      ].forEach((n) => notes.add(n));
    });
    return Array.from(notes).sort();
  }, [products, language]);

  // Filter to show only bottles and gift sets (no separate samples)
  const displayProducts = products.filter((p) => p.type !== "sample");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const { products: fetchedProducts, total } = await fetchProducts(
          currentPage,
          itemsPerPage
        );
        console.log("All fetched products:", fetchedProducts);
        setProducts(fetchedProducts);
        setTotalProducts(total);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [currentPage, itemsPerPage]);

  // Apply all filters and sort
  const filteredProducts = useMemo(() => {
    let result = [...displayProducts];

    // Gender filter
    if (genderFilter !== "all") {
      result = result.filter((p) => p.gender === genderFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.name_ar?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.description_ar?.toLowerCase().includes(q)
      );
    }

    // Fragrance notes filter — language-aware so chip values match
    if (selectedNotes.length > 0) {
      result = result.filter((p) => {
        const source =
          language === "ar" && p.fragranceNotes_ar?.top?.length
            ? p.fragranceNotes_ar
            : p.fragranceNotes;
        const pNotes = [
          ...(source?.top || []),
          ...(source?.middle || []),
          ...(source?.base || []),
        ].map((n) => n.toLowerCase());
        return selectedNotes.some((note) => pNotes.includes(note.toLowerCase()));
      });
    }

    // Sort
    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
      default:
        break; // Already sorted by created_at desc from API
    }

    return result;
  }, [displayProducts, genderFilter, searchQuery, selectedNotes, sortBy, language]);

  const getTotalPages = (total: number) => {
    return Math.ceil(total / itemsPerPage);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [genderFilter, sortBy, searchQuery, selectedNotes]);

  // Clear selected notes when language switches — prevents stale-language values
  useEffect(() => {
    setSelectedNotes([]);
  }, [language]);

  // Get total pages
  const totalPages = getTotalPages(totalProducts);

  // Pagination component
  const Pagination = ({
    currentPage,
    totalPages,
    onPageChange,
  }: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  }) => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const pages = [];
      const showPages = 5; // Show 5 pages at most

      if (totalPages <= showPages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        const start = Math.max(1, currentPage - Math.floor(showPages / 2));
        const end = Math.min(totalPages, start + showPages - 1);

        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
      }

      return pages;
    };

    return (
      <div className="flex items-center justify-center gap-2 mt-12">
        {/* Previous Button */}
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="icon"
          className="glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50] dark:hover:bg-white/10 hover:bg-[#EDF1F7] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page Numbers */}
        {getPageNumbers().map((page) => (
          <Button
            key={page}
            onClick={() => onPageChange(page)}
            variant={currentPage === page ? "default" : "outline"}
            className={`w-10 h-10 rounded-xl ${
              currentPage === page
                ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white border-0"
                : "glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50] dark:hover:bg-white/10 hover:bg-[#EDF1F7]"
            }`}
          >
            {page}
          </Button>
        ))}

        {/* Next Button */}
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="icon"
          className="glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50] dark:hover:bg-white/10 hover:bg-[#EDF1F7] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // ProductCard is already memoized at module scope (export default React.memo(...)).
  // Do NOT re-wrap it inside this component — that creates a new component identity
  // on every render and forces every card to remount, restarting image fade-in
  // (visible as a "flicker on scroll" when re-renders happen).

  // Active filter count (excluding default sort)
  const activeFilterCount =
    (genderFilter !== "all" ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0) +
    selectedNotes.length;
  const hasActiveFilters = activeFilterCount > 0;

  const handleClearAll = () => {
    setGenderFilter("all");
    setSearchQuery("");
    setSelectedNotes([]);
    setSortBy("newest");
  };

  return (
    <div className="bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen w-full">
      <div className="container mx-auto px-3 sm:px-4 pt-20 md:pt-24 pb-8 sm:pb-12 max-w-7xl">
        {/* Hero Section — tightened spacing (U7) */}
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-3 px-2 sm:px-4 leading-tight">
            {t("collection.titleOur")} <span className="text-[#5B8DD9]">{t("collection.titleHighlight")}</span>
          </h1>
          <p className="text-sm sm:text-lg dark:text-white/75 text-[#6B7B8D] max-w-xs sm:max-w-lg md:max-w-2xl mx-auto px-2 sm:px-0">
            {t("collection.description")}
          </p>
        </div>
      </div>

      {/* Sticky Filter Bar (U2) — sits flush under the fixed Header */}
      <div className="sticky top-16 sm:top-20 md:top-24 z-30 backdrop-blur-xl bg-[#F8F9FB]/85 dark:bg-[#1a2235]/85 border-b border-[#323D50]/10 dark:border-white/10 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 max-w-7xl py-3 sm:py-4 space-y-3">
          {/* Row 1: Search + Selects + Clear All + Result Count */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-0 lg:max-w-md">
              <Search className={`absolute ${isRTL ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 w-4 h-4 dark:text-white/40 text-[#6B7B8D]`} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("collection.searchPlaceholder")}
                className={`w-full glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50] dark:placeholder:text-white/40 placeholder:text-[#6B7B8D] ${isRTL ? "pr-11 pl-10" : "pl-11 pr-10"} h-11 rounded-xl focus:border-[#5B8DD9]/50`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={`absolute ${isRTL ? "left-3" : "right-3"} top-1/2 -translate-y-1/2 text-[#6B7B8D] hover:text-[#5B8DD9] transition-colors`}
                  aria-label={t("collection.clearAll")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Gender + Sort selects */}
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1 min-w-0 sm:flex-initial">
                <Filter className="h-4 w-4 dark:text-white/60 text-[#6B7B8D] flex-shrink-0" />
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="flex-1 sm:w-[140px] h-11 glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50]">
                    <SelectValue placeholder={t("collection.gender")} />
                  </SelectTrigger>
                  <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/20 border-[#323D50]/10">
                    <SelectItem value="all">{t("collection.allGenders")}</SelectItem>
                    <SelectItem value="men">{t("collection.men")}</SelectItem>
                    <SelectItem value="women">{t("collection.women")}</SelectItem>
                    <SelectItem value="unisex">{t("collection.unisex")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1 min-w-0 sm:flex-initial">
                <SortAsc className="h-4 w-4 dark:text-white/60 text-[#6B7B8D] flex-shrink-0" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1 sm:w-[170px] h-11 glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:text-[#F5F5F5] text-[#323D50]">
                    <SelectValue placeholder={t("collection.sortBy")} />
                  </SelectTrigger>
                  <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/20 border-[#323D50]/10">
                    <SelectItem value="newest">{t("collection.newest")}</SelectItem>
                    <SelectItem value="price_asc">{t("collection.priceLowHigh")}</SelectItem>
                    <SelectItem value="price_desc">{t("collection.priceHighLow")}</SelectItem>
                    <SelectItem value="rating">{t("collection.ratingHighest")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Spacer + Active count + Clear all (U3) */}
            <div className="flex items-center gap-2 lg:ms-auto flex-wrap">
              {hasActiveFilters && (
                <>
                  <div className="inline-flex items-center gap-1.5 rtl:space-x-reverse px-3 h-8 rounded-full bg-[#5B8DD9]/15 border border-[#5B8DD9]/40 text-[#3E6BB5] dark:text-[#5B8DD9] text-xs font-semibold">
                    <SlidersHorizontal className="w-3 h-3" />
                    {t("collection.filtersActive").replace("{count}", String(activeFilterCount))}
                  </div>
                  <Button
                    onClick={handleClearAll}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs text-[#6B7B8D] dark:text-white/60 hover:text-[#5B8DD9] dark:hover:text-[#5B8DD9]"
                  >
                    <X className="w-3 h-3 me-1" />
                    {t("collection.clearAll")}
                  </Button>
                </>
              )}
              {!loading && (
                <span className="text-xs dark:text-white/55 text-[#6B7B8D] tabular-nums whitespace-nowrap">
                  {t("collection.resultsCount").replace("{count}", String(filteredProducts.length))}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Fragrance note chips — horizontal scroll on mobile */}
          {allNotes.length > 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-1 lg:flex-wrap lg:overflow-visible">
              {allNotes.slice(0, 15).map((note) => {
                const active = selectedNotes.includes(note);
                return (
                  <button
                    key={note}
                    onClick={() =>
                      setSelectedNotes((prev) =>
                        prev.includes(note)
                          ? prev.filter((n) => n !== note)
                          : [...prev, note]
                      )
                    }
                    className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                      active
                        ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white border border-transparent shadow-sm shadow-[#5B8DD9]/30"
                        : "dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 dark:text-white/70 text-[#6B7B8D] dark:hover:bg-white/10 hover:bg-[#EDF1F7]"
                    }`}
                  >
                    {note}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 pt-8 pb-12 max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 xl:gap-8 auto-rows-fr items-stretch">
          {loading
            ? Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="glass-card rounded-2xl overflow-hidden animate-pulse"
                >
                  <div className="h-72 bg-white/10 dark:bg-white/5" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-white/10 dark:bg-white/5 rounded w-3/4" />
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-white/10 dark:bg-white/5 rounded w-20" />
                      <div className="h-5 bg-white/10 dark:bg-white/5 rounded-full w-16" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-white/10 dark:bg-white/5 rounded w-full" />
                      <div className="h-3 bg-white/10 dark:bg-white/5 rounded w-5/6" />
                    </div>
                    <div className="flex gap-1.5">
                      <div className="h-5 bg-white/10 dark:bg-white/5 rounded-full w-14" />
                      <div className="h-5 bg-white/10 dark:bg-white/5 rounded-full w-14" />
                    </div>
                    <div className="flex items-end justify-between pt-2">
                      <div className="h-7 bg-white/10 dark:bg-white/5 rounded w-24" />
                      <div className="h-11 bg-white/10 dark:bg-white/5 rounded-xl w-28" />
                    </div>
                  </div>
                </div>
              ))
            : filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
        </div>

        {!loading && filteredProducts.length === 0 && (
          <div className="text-center py-16 max-w-md mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#5B8DD9]/10 mb-4">
              <Search className="w-7 h-7 text-[#5B8DD9]/60" />
            </div>
            <p className="dark:text-white/80 text-[#323D50] font-semibold mb-2">
              {t("collection.noProducts")}
            </p>
            <p className="dark:text-white/55 text-[#6B7B8D] text-sm mb-4">
              {t("collection.noResultsHint")}
            </p>
            {hasActiveFilters && (
              <Button
                onClick={handleClearAll}
                variant="outline"
                className="glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:text-white text-[#323D50] hover:bg-[#5B8DD9]/10"
              >
                <X className="w-4 h-4 me-2" />
                {t("collection.clearAll")}
              </Button>
            )}
          </div>
        )}

        {!loading && filteredProducts.length > 0 && (
          <div className="flex flex-col items-center mt-12">
            <div className="text-center mb-4">
              <p className="dark:text-white/60 text-[#6B7B8D] text-sm">
                {t("collection.showing")} {(currentPage - 1) * itemsPerPage + 1} {t("collection.to")}{" "}
                {Math.min(currentPage * itemsPerPage, totalProducts)} {t("collection.of")}{" "}
                {totalProducts} {t("collection.products")}
              </p>
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
