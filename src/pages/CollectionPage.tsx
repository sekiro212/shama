import { useState, useEffect, useCallback, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Filter, ChevronLeft, ChevronRight, Search, SortAsc, X } from "lucide-react";
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
import React from "react";

export default function CollectionPage() {
  const { t, isRTL } = useLanguage();
  const [genderFilter, setGenderFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8);
  const [totalProducts, setTotalProducts] = useState(0);

  // Collect all unique fragrance notes from products
  const allNotes = useMemo(() => {
    const notes = new Set<string>();
    products.forEach((p) => {
      [...(p.fragranceNotes?.top || []), ...(p.fragranceNotes?.middle || []), ...(p.fragranceNotes?.base || [])].forEach((n) => notes.add(n));
    });
    return Array.from(notes).sort();
  }, [products]);

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

    // Fragrance notes filter
    if (selectedNotes.length > 0) {
      result = result.filter((p) => {
        const pNotes = [
          ...(p.fragranceNotes?.top || []),
          ...(p.fragranceNotes?.middle || []),
          ...(p.fragranceNotes?.base || []),
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
  }, [displayProducts, genderFilter, searchQuery, selectedNotes, sortBy]);

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

  // Memoize ProductCard for performance
  const MemoizedProductCard = React.memo(ProductCard);

  return (
    <div className="container mx-auto px-4 pt-[80px] md:pt-24 pb-12 bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen w-full">
      {/* Hero Section */}
      <div className="text-center mb-12 sm:mb-14 md:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-3 sm:mb-4 px-4">
          {t("collection.titleOur")} <span className="text-[#5B8DD9]">{t("collection.titleHighlight")}</span>
        </h1>
        <p className="text-lg sm:text-xl dark:text-white/80 text-[#6B7B8D] max-w-xs sm:max-w-lg md:max-w-2xl mx-auto px-4 sm:px-0">
          {t("collection.description")}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4 mb-8 px-4">
        {/* Search Bar */}
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 dark:text-white/40 text-[#6B7B8D] dark:text-[#D6D6D6]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("collection.searchPlaceholder")}
            className="w-full glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50] dark:placeholder:text-white/40 placeholder:text-[#6B7B8D] dark:text-[#D6D6D6] pl-11 pr-10 py-3 rounded-xl focus:border-[#5B8DD9]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 "
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
          {/* Gender Filter */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <Filter className="h-4 w-4 dark:text-white/60 text-[#6B7B8D]" />
            <Select value={genderFilter} onValueChange={setGenderFilter}>
              <SelectTrigger className="w-[160px] glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50]">
                <SelectValue placeholder={t("collection.gender")} />
              </SelectTrigger>
              <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/20 border-[#323D50]/10 dark:border-white/10">
                <SelectItem value="all">{t("collection.allGenders")}</SelectItem>
                <SelectItem value="men">{t("collection.men")}</SelectItem>
                <SelectItem value="women">{t("collection.women")}</SelectItem>
                <SelectItem value="unisex">{t("collection.unisex")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <SortAsc className="h-4 w-4 dark:text-white/60 text-[#6B7B8D]" />
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px] glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50]">
                <SelectValue placeholder={t("collection.sortBy")} />
              </SelectTrigger>
              <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] dark:border-white/20 border-[#323D50]/10 dark:border-white/10">
                <SelectItem value="newest">{t("collection.newest")}</SelectItem>
                <SelectItem value="price_asc">{t("collection.priceLowHigh")}</SelectItem>
                <SelectItem value="price_desc">{t("collection.priceHighLow")}</SelectItem>
                <SelectItem value="rating">{t("collection.ratingHighest")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Fragrance Note Tags */}
        {allNotes.length > 0 && (
          <div className="flex flex-wrap gap-2 justify-center max-w-3xl mx-auto">
            {allNotes.slice(0, 15).map((note) => (
              <button
                key={note}
                onClick={() =>
                  setSelectedNotes((prev) =>
                    prev.includes(note)
                      ? prev.filter((n) => n !== note)
                      : [...prev, note]
                  )
                }
                className={`text-xs px-3 py-1.5 rounded-full transition-all duration-200 ${
                  selectedNotes.includes(note)
                    ? "bg-[#5B8DD9]/20 border border-[#5B8DD9]/50 dark:text-[#F5F5F5] text-[#323D50]"
                    : "dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10  dark:hover:bg-white/10 hover:bg-[#EDF1F7]"
                }`}
              >
                {note}
              </button>
            ))}
            {selectedNotes.length > 0 && (
              <button
                onClick={() => setSelectedNotes([])}
                className="text-xs px-3 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30"
              >
                {t("collection.clearNotes")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Products Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-4 text-center">
          {t("collection.luxuryFragrances")}
        </h2>
        <p className="dark:text-white/60 text-[#6B7B8D] text-center max-w-2xl mx-auto mb-8">
          {t("collection.luxuryDescription")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {loading
          ? Array.from({ length: 8 }).map((_, index) => (
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
          : filteredProducts.map((product) => (
              <MemoizedProductCard key={product.id} product={product} />
            ))}
      </div>

      {!loading && filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="dark:text-white/60 text-[#6B7B8D]">
            {t("collection.noProducts")}
          </p>
        </div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <div className="flex flex-col items-center mt-8">
          <div className="text-center mb-4">
            <p className="dark:text-white/60 text-[#6B7B8D]">
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
  );
}
