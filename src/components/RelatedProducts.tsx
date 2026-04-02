import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchProducts, Product } from "@/services/productsService";

interface RelatedProductsProps {
  currentProduct: Product;
}

export default function RelatedProducts({ currentProduct }: RelatedProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [scrollIndex, setScrollIndex] = useState(0);
  const { t, isRTL } = useLanguage();

  useEffect(() => {
    const loadRelated = async () => {
      const { products: allProducts } = await fetchProducts(1, 50);
      // Find products with shared fragrance notes or same gender, exclude current
      const related = allProducts
        .filter((p) => p.id !== currentProduct.id)
        .map((p) => {
          let score = 0;
          const currentNotes = [
            ...(currentProduct.fragranceNotes?.top || []),
            ...(currentProduct.fragranceNotes?.middle || []),
            ...(currentProduct.fragranceNotes?.base || []),
          ].map((n) => n.toLowerCase());
          const pNotes = [
            ...(p.fragranceNotes?.top || []),
            ...(p.fragranceNotes?.middle || []),
            ...(p.fragranceNotes?.base || []),
          ].map((n) => n.toLowerCase());
          for (const note of pNotes) {
            if (currentNotes.includes(note)) score++;
          }
          if (p.gender === currentProduct.gender) score += 2;
          return { product: p, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((r) => r.product);
      setProducts(related);
    };
    loadRelated();
  }, [currentProduct]);

  if (products.length === 0) return null;

  const maxIndex = Math.max(0, products.length - 4);

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#5B8DD9]" />
          <h3 className="text-2xl font-bold text-[#323D50] dark:text-white">{t("relatedProducts.title")}</h3>
        </div>
        {products.length > 4 && (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScrollIndex(Math.max(0, scrollIndex - 1))}
              disabled={scrollIndex === 0}
              className="glass bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white rounded-xl w-10 h-10 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setScrollIndex(Math.min(maxIndex, scrollIndex + 1))}
              disabled={scrollIndex >= maxIndex}
              className="glass bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white rounded-xl w-10 h-10 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
      <div className="overflow-hidden">
        <div
          className="flex gap-4 transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${scrollIndex * 260}px)` }}
        >
          {products.map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="flex-shrink-0 w-[240px] glass-card bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 rounded-2xl overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-[1.02] group"
            >
              <img
                src={product.images?.[0]?.image_url || ""}
                alt={product.name}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="p-4">
                <h4 className="text-[#323D50] dark:text-white font-semibold text-sm truncate mb-1">{product.name}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-[#5B8DD9] font-bold">{product.price} LYD</span>
                  <span className="text-[#6B7B8D] dark:text-white/40 text-xs">{product.gender}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
