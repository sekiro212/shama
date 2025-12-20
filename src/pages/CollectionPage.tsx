import { useState, useEffect, useCallback } from "react";
import { Filter, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { fetchProducts, Product } from "@/services/productsService";
import React from "react";

export default function CollectionPage() {
  const [genderFilter, setGenderFilter] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(8); // Number of products per page
  const [totalProducts, setTotalProducts] = useState(0);

  // Filter to show only bottles and gift sets (no separate samples)
  const displayProducts = products.filter((p) => p.type !== "sample");

  console.log("Display products (after filtering samples):", displayProducts);

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

  // Filter products based on gender
  const filterByGender = useCallback(
    (products: any[]) => {
      if (genderFilter === "all") return products;
      return products.filter((product) => product.gender === genderFilter);
    },
    [genderFilter]
  );

  // Apply filters
  const filteredProducts = filterByGender(displayProducts);

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
  }, [genderFilter]);

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
          className="glass bg-white/5 border-white/20 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
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
                ? "bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] text-white border-0"
                : "glass bg-white/5 border-white/20 text-white hover:bg-white/10"
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
          className="glass bg-white/5 border-white/20 text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  // Memoize ProductCard for performance
  const MemoizedProductCard = React.memo(ProductCard);

  return (
    <div className="container mx-auto px-4 pt-[80px] md:pt-24 pb-12 bg-[#0e0a1d] min-h-screen w-full">
      {/* Hero Section */}
      <div className="text-center mb-12 sm:mb-14 md:mb-16">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-3 sm:mb-4 px-4">
          Our <span className="text-[#b24ce2]">Collection</span>
        </h1>
        <p className="text-lg sm:text-xl text-white/80 max-w-xs sm:max-w-lg md:max-w-2xl mx-auto px-4 sm:px-0">
          Discover our complete range of luxury fragrances. Choose from full
          bottles for the complete experience or explore sample sizes on each
          product page.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8 justify-center items-center px-4">
        <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 sm:h-5 sm:w-5 text-white/60" />
            <span className="text-white/60 font-medium text-sm sm:text-base">
              Gender:
            </span>
          </div>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-full sm:w-[180px] glass bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Filter by gender" />
            </SelectTrigger>
            <SelectContent className="glass bg-[#0e0a1d] border-white/20">
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="men">Men</SelectItem>
              <SelectItem value="women">Women</SelectItem>
              <SelectItem value="unisex">Unisex</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Products Section */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-4 text-center">
          Luxury Fragrances
        </h2>
        <p className="text-white/60 text-center max-w-2xl mx-auto mb-8">
          Complete luxury experience with our full-sized bottles and gift sets.
          Click on any product to explore sample sizes and find your perfect
          scent.
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
          <p className="text-white/60">
            No products found matching your filters.
          </p>
        </div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <div className="flex flex-col items-center mt-8">
          <div className="text-center mb-4">
            <p className="text-white/60">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalProducts)} of{" "}
              {totalProducts} products
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
