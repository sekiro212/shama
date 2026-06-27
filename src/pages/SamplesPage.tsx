/**
 * ===================================================================
 * صفحة العيّنات (Samples) — المسار: /samples
 * -------------------------------------------------------------------
 * تعرض العطور التي تتوفّر لها عيّنات (has_samples) مع إمكانية اختيار حجم
 * العيّنة وإضافتها إلى السلة. تجلب العطور من جدول perfumes ثم تجمع لكل
 * عطر صوره وعيّناته بالتوازي. تدعم العربية والإنجليزية مع وعي باتجاه RTL.
 * ===================================================================
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TestTube, ShoppingBag, Star, Sparkles, ChevronRight, Droplet, Clock, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { getPerfumeImages } from "@/services/imageService";
import { fetchPerfumeSamples, Product, PerfumeSample } from "@/services/productsService";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// عطر مع قائمة عيّناته المتاحة (يُستخدم داخليًا في هذه الصفحة)
interface ProductWithSamples extends Product {
  samples: PerfumeSample[];
}

/**
 * المكوّن الرئيسي لصفحة العيّنات.
 * يجلب العطور التي تملك عيّنات، ويدير اختيار حجم العيّنة لكل عطر
 * وإضافتها إلى السلة.
 */
export default function SamplesPage() {
  const { t, isRTL } = useLanguage();
  const [products, setProducts] = useState<ProductWithSamples[]>([]);
  const [loading, setLoading] = useState(true);
  // يربط معرّف العطر بمعرّف العيّنة المختارة له (productId -> sampleId)
  const [selectedSamples, setSelectedSamples] = useState<Record<string, string>>({}); // productId -> sampleId
  const { addToCart, isItemInCart } = useCart();

  // أثر جانبي يعمل مرة واحدة عند التحميل: جلب العطور النشطة التي تملك عيّنات
  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("perfumes")
          .select("*")
          .eq("is_active", true)
          .eq("has_samples", true)
          .order("created_at", { ascending: false });

        if (error || !data) return;

        // لكل عطر نجلب صوره وعيّناته بالتوازي ثم نحوّله لشكل التطبيق (camelCase)
        const withDetails = await Promise.all(
          data.map(async (p) => {
            const [images, samples] = await Promise.all([
              getPerfumeImages(p.id),
              fetchPerfumeSamples(p.id),
            ]);
            return {
              id: p.id,
              name: p.name,
              name_ar: p.name_ar || p.name,
              price: p.price,
              description: p.description,
              description_ar: p.description_ar || p.description,
              fragranceNotes: p.fragrance_notes,
              fragranceNotes_ar: p.fragrance_notes_ar || p.fragrance_notes,
              size: p.size,
              type: p.type,
              rating: p.rating,
              reviews: p.reviews || [],
              gender: p.gender,
              stock_quantity: p.stock_quantity,
              is_active: p.is_active,
              has_samples: p.has_samples,
              has_bottle_sizes: p.has_bottle_sizes,
              images,
              samples,
              bottle_sizes: [],
            } as ProductWithSamples;
          })
        );

        // نُبقي فقط العطور التي لها عيّنة واحدة على الأقل فعليًا
        setProducts(withDetails.filter((p) => p.samples.length > 0));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // إرجاع العيّنة المختارة لعطر ما، أو أول عيّنة افتراضيًا إن لم يُختر شيء
  const getSelectedSample = (product: ProductWithSamples): PerfumeSample | undefined => {
    const sampleId = selectedSamples[product.id];
    return sampleId
      ? product.samples.find((s) => s.id === sampleId)
      : product.samples[0];
  };

  // تسجيل العيّنة المختارة للعطر المحدّد في حالة الاختيار
  const handleSelectSample = (productId: string, sampleId: string) => {
    setSelectedSamples((prev) => ({ ...prev, [productId]: sampleId }));
  };

  /**
   * إضافة العيّنة المختارة إلى السلة بعد التحقق من توفّرها في المخزون.
   * يُمرَّر معرّف العيّنة كهوية، مع وسم الحجم لتمييزها داخل السلة.
   */
  const handleAddToCart = (product: ProductWithSamples) => {
    const sample = getSelectedSample(product);
    if (!sample) return;

    // منع الإضافة إذا كانت العيّنة غير متوفّرة في المخزون
    if (sample.stock_quantity === 0) {
      toast.error(t("samples.outOfStock"));
      return;
    }

    addToCart({
      id: sample.id,
      name: product.name,
      price: sample.price,
      image: product.images?.[0]?.image_url || "",
      size: `${sample.size} Sample`,
      stock_quantity: sample.stock_quantity,
    });

    toast.success(`${product.name} (${sample.size} ${t("common.sample")}) ${t("samples.addedToCart")}`);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] dark:text-[#F5F5F5] text-[#323D50] pt-20 md:pt-24 pb-12 sm:pb-20">
      {/* Hero — editorial candlelight */}
      <div className="relative overflow-hidden mb-8 sm:mb-14">
        <div className="absolute inset-0 bg-gradient-to-b from-warm/8 via-transparent to-transparent pointer-events-none" />
        <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-14 text-center relative">
          <div className="inline-flex items-center space-x-2 rtl:space-x-reverse glass bg-warm/10 border border-warm/40 rounded-full px-3 sm:px-4 py-2 mb-4 sm:mb-6">
            <TestTube className="w-4 h-4 text-warm" />
            <span className="font-display text-[11px] sm:text-xs tracking-[0.28em] uppercase text-warm">
              {t("samples.badge")}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-3 sm:mb-4 leading-[1.05] text-[#1E2A3D] dark:text-[#F5F5F5]">
            {t("samples.title")}
          </h1>
          <p className="dark:text-white/65 text-[#6B7B8D] text-sm sm:text-lg max-w-xl mx-auto px-2 leading-relaxed">
            {t("samples.description")}
          </p>
        </div>
      </div>

      {/* How samples work — 3-step editorial block */}
      <div className="container mx-auto px-3 sm:px-4 mb-10 sm:mb-16">
        <div className="max-w-5xl mx-auto">
          <p className="font-display text-[11px] tracking-[0.28em] uppercase text-warm text-center mb-6">
            {t("samples.howItWorks.heading")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {[
              { icon: Droplet, key: "step1" },
              { icon: Clock, key: "step2" },
              { icon: Package, key: "step3" },
            ].map(({ icon: Icon, key }, idx) => (
              <div
                key={key}
                className="glass-card rounded-2xl p-5 md:p-6 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-warm/15 text-warm">
                    <Icon className="w-5 h-5" aria-hidden />
                  </div>
                  <span className="font-display text-xs tracking-[0.3em] text-warm/80">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] mb-1.5">
                  {t(`samples.howItWorks.${key}.title`)}
                </h3>
                <p className="text-sm leading-relaxed text-[#6B7B8D] dark:text-white/65">
                  {t(`samples.howItWorks.${key}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="container mx-auto px-3 sm:px-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass-card rounded-2xl overflow-hidden animate-pulse">
                <div className="h-64 bg-white/5" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-white dark:bg-white/5 rounded-lg w-3/4" />
                  <div className="h-4 bg-white dark:bg-white/5 rounded-lg w-full" />
                  <div className="h-4 bg-white dark:bg-white/5 rounded-lg w-2/3" />
                  <div className="flex gap-2 pt-1">
                    <div className="h-8 bg-white dark:bg-white/5 rounded-full w-16" />
                    <div className="h-8 bg-white dark:bg-white/5 rounded-full w-16" />
                  </div>
                  <div className="h-10 bg-white dark:bg-white/5 rounded-xl w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <TestTube className="w-16 h-16 text-[#323D50]/20 dark:text-white/20 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-[#6B7B8D] dark:text-white/40 mb-2">{t("samples.noSamples")}</h2>
            <p className="text-[#6B7B8D]/60 dark:text-white/30 mb-6">{t("samples.checkBackSoon")}</p>
            <Link to="/collection">
              <Button className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white border-0 rounded-xl px-6 py-3">
                {t("samples.browseCollection")}
                <ChevronRight className="w-4 h-4 ms-2" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product) => {
              const selectedSample = getSelectedSample(product);
              // التحقق إن كانت العيّنة المختارة لهذا العطر موجودة بالسلة لتغيير حالة الزر
              const inCart = selectedSample
                ? isItemInCart(product.id, `${selectedSample.size} Sample`)
                : false;

              return (
                <div
                  key={product.id}
                  className="glass-card group rounded-2xl overflow-hidden border dark:border-white/10 border-[#323D50]/10 hover:border-[#5B8DD9]/40 transition-all duration-300 hover:shadow-xl hover:shadow-[#5B8DD9]/10 flex flex-col"
                >
                  {/* Image */}
                  <Link to={`/product/${product.id}`} className="relative block overflow-hidden">
                    <img
                      src={product.images?.[0]?.image_url || ""}
                      alt={product.name}
                      className="w-full h-60 object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Sample badge */}
                    <div className="absolute top-3 left-3 flex items-center space-x-1 rtl:space-x-reverse glass bg-[#5B8DD9]/80 backdrop-blur-md rounded-full px-3 py-1.5 border border-[#5B8DD9]/50">
                      <TestTube className="h-3 w-3 text-white" />
                      <span className="text-white text-xs font-medium">{t("samples.sampleLabel")}</span>
                    </div>

                    {/* Premium badge */}
                    {product.rating >= 4.5 && (
                      <div className="absolute bottom-3 right-3 glass bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 border border-[#323D50]/15 dark:border-white/20">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Sparkles className="w-3 h-3 text-[#5B8DD9]" />
                          <span className="text-white text-xs font-medium">{t("samples.premiumLabel")}</span>
                        </div>
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <div className="p-5 flex flex-col flex-1 space-y-3">
                    {/* Name + rating */}
                    <div>
                      <Link to={`/product/${product.id}`}>
                        <h3 className="text-lg font-bold dark:text-[#F5F5F5] text-[#323D50] group-hover:gradient-text transition-all duration-300 leading-tight mb-1">
                          {product.name}
                        </h3>
                      </Link>
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${
                              i < Math.floor(product.rating)
                                ? "fill-[#5B8DD9] text-[#5B8DD9]"
                                : "text-[#323D50]/20 dark:text-white/20"
                            }`}
                          />
                        ))}
                        <span className="dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6] text-xs ms-1">({product.rating})</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="dark:text-white/55 text-[#6B7B8D] dark:text-[#D6D6D6] text-sm leading-relaxed line-clamp-2">
                      {product.description}
                    </p>

                    {/* Fragrance top notes */}
                    {product.fragranceNotes?.top?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {product.fragranceNotes.top.slice(0, 3).map((note, i) => (
                          <span
                            key={i}
                            className="glass bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 rounded-full px-2 py-0.5 text-xs text-[#6B7B8D] dark:text-white/60"
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sample size selector */}
                    <div className="space-y-1.5">
                      <span className="text-xs text-[#6B7B8D] dark:text-white/40 uppercase tracking-wider font-medium">
                        {t("samples.chooseSize")}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {product.samples.map((sample) => {
                          const isSelected =
                            (selectedSamples[product.id]
                              ? selectedSamples[product.id] === sample.id
                              : product.samples[0].id === sample.id);
                          const outOfStock = sample.stock_quantity === 0;

                          return (
                            <button
                              key={sample.id}
                              onClick={() => !outOfStock && handleSelectSample(product.id, sample.id)}
                              disabled={outOfStock}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                                outOfStock
                                  ? "border-[#323D50]/10 dark:border-white/10 text-[#6B7B8D]/60 dark:text-white/30 cursor-not-allowed"
                                  : isSelected
                                  ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] border-transparent text-white shadow-lg shadow-[#5B8DD9]/20"
                                  : "glass border-[#323D50]/15 dark:border-white/20 text-white/70 hover:border-[#5B8DD9]/50 hover:text-white"
                              }`}
                            >
                              {sample.size}
                              {outOfStock && <span className="ms-1 text-[#6B7B8D]/60 dark:text-white/30">{t("samples.oos")}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Price + Add to Cart */}
                    <div className="flex items-center justify-between pt-2 mt-auto">
                      <div>
                        <div className="text-xl font-bold gradient-text">
                          {selectedSample?.price ?? product.samples[0]?.price} LYD
                        </div>
                        <div className="text-[#6B7B8D] dark:text-white/40 text-xs">
                          {selectedSample?.size ?? product.samples[0]?.size} {t("common.sample")}
                        </div>
                      </div>

                      <Button
                        onClick={() => handleAddToCart(product)}
                        disabled={!selectedSample || selectedSample.stock_quantity === 0}
                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold border-0 transition-all duration-300 hover:scale-105 ${
                          inCart
                            ? "bg-green-600/80 hover:bg-green-600 text-white"
                            : "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white hover:shadow-lg hover:shadow-[#5B8DD9]/25"
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4 me-1.5" />
                        {inCart ? t("samples.inCart") : t("samples.addToCart")}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
