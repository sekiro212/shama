import { useState, useEffect } from "react";
import { Gift, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProductCard from "@/components/ProductCard";
import { filterProducts, Product } from "@/services/productsService";

export default function GiftSetsPage() {
  const [genderFilter, setGenderFilter] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div className="container mx-auto px-4 pt-[80px] md:pt-24 pb-12 bg-[#0e0a1d] min-h-screen w-full">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Gift className="h-12 w-12 text-[#b24ce2] mr-3" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              Gift Sets
            </h1>
          </div>
          <p className="text-white/70 text-lg max-w-2xl mx-auto">
            Discover our carefully curated gift sets, perfect for special
            occasions and thoughtful presents. Each set contains a selection of
            our finest fragrances.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-white/60" />
            <span className="text-white/80 font-medium">Filter by:</span>
          </div>
          <Select value={genderFilter} onValueChange={setGenderFilter}>
            <SelectTrigger className="w-48 glass bg-white/5 border-white/20 text-white">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent className="glass bg-[#0e0a1d] border-white/20">
              <SelectItem value="all">All Genders</SelectItem>
              <SelectItem value="men">Men</SelectItem>
              <SelectItem value="women">Women</SelectItem>
              <SelectItem value="unisex">Unisex</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Gift Sets Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="glass-card p-8 rounded-2xl text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b24ce2] mx-auto mb-4"></div>
              <p className="text-white/60">Loading gift sets...</p>
            </div>
          </div>
        ) : filteredGiftSets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGiftSets.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="glass-card p-12 rounded-2xl max-w-md mx-auto">
              <Gift className="h-16 w-16 text-white/40 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-white mb-4">
                No gift sets found
              </h3>
              <p className="text-white/60 mb-6">
                {genderFilter === "all"
                  ? "No gift sets are currently available."
                  : `No gift sets found for ${genderFilter}.`}
              </p>
              <button
                onClick={() => setGenderFilter("all")}
                className="glass bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] hover:from-[#8e2de2] hover:to-[#b24ce2] text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
              >
                View All Gift Sets
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
