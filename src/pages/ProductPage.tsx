/**
 * ProductPage.tsx
 * -----------------------------------------------------------------------------
 * صفحة تفاصيل منتج واحد — مركّبة على "/product/:id".
 * تقرأ معرّف المنتج (id) من الرابط، وتجلب المنتج الكامل (مع معرض صوره
 * وأحجام العيّنات وأحجام الزجاجات) من Supabase، وتتيح للمستخدم:
 *   - تصفّح معرض الصور (أسهم + تنقّل عبر لوحة المفاتيح)،
 *   - اختيار نسخة (عيّنة مقابل زجاجة كاملة وحجم محدّد)،
 *   - اختيار كمية وإضافتها إلى السلة،
 *   - إضافة المنتج إلى قائمة أمنياته،
 *   - قراءة مكوّنات العطر / التفاصيل / الخط الزمني لـ "رحلة" العطر،
 *   - قراءة مراجعة — وكتابتها إن كان مسجّل الدخول — تُشرف عليها الـ AI.
 *
 * ثنائي اللغة: لاسم/وصف/مكوّنات المنتج نسخ عربية
 * (`name_ar`، `description_ar`، `fragranceNotes_ar`) تُختار عندما تكون اللغة
 * النشطة `language` هي العربية؛ ويقلب `isRTL` اتجاه التخطيط عند الحاجة.
 */
import { useParams, Link, useLocation } from "react-router-dom";
import {
  ShoppingBag,
  ChevronLeft,
  TestTube,
  PillBottle as Bottle,
  Sparkles,
  Award,
  Info,
  Plus,
  Minus,
  Package,
  ChevronRight,
  Heart,
  Star,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { fetchProductById, Product } from "@/services/productsService";
import { toast } from "sonner";
import React, { useState, useEffect } from "react";
import { PLACEHOLDER_IMAGE_URL } from "@/lib/productImage";
import RelatedProducts from "@/components/RelatedProducts";
import RecentlyViewed from "@/components/RecentlyViewed";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchApprovedReviews,
  fetchUserReview,
  submitReview,
  Review,
} from "@/services/reviewsService";
import { evaluateReview } from "@/services/aiService";
import FragranceTimeline from "@/components/FragranceTimeline";
import StickyBuyBar from "@/components/StickyBuyBar";
import { anonymizeEmail, formatReviewDate } from "@/lib/reviewUtils";
import { trackEvent } from "@/services/trackingService";

/**
 * ProductPage — المكوّن الأعلى مستوى للمسار "/product/:id".
 * يملك كل حالة التفاعل للصفحة: أي صورة من المعرض تُعرض، والكمية المختارة،
 * والتبويب النشط، والنسخة المحدّدة حاليًا. تُنمذَج عملية اختيار النسخة
 * كمعرّفين متعارضين متبادلين (`selectedSample` / `selectedBottleSize`)
 * إضافةً إلى مبدّل `activeMode` ("sample" | "bottle").
 */
export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { addItem: addRecentlyViewed } = useRecentlyViewed();
  const location = useLocation();
  const { t, isRTL, language } = useLanguage();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("journey");
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [selectedBottleSize, setSelectedBottleSize] = useState<string | null>(
    null
  );
  const [activeMode, setActiveMode] = useState<"sample" | "bottle">("bottle");

  // الحصول على صور المنتج من قاعدة البيانات
  const productImages = product?.images?.length
    ? product.images.map((img) => img.image_url)
    : [PLACEHOLDER_IMAGE_URL];

  // محتوى مدرك للّغة
  const productName = product ? (language === "ar" && product.name_ar ? product.name_ar : product.name) : "";
  const productDescription = product ? (language === "ar" && product.description_ar ? product.description_ar : product.description) : "";
  const productNotes = product ? (language === "ar" && product.fragranceNotes_ar?.top?.length ? product.fragranceNotes_ar : product.fragranceNotes) : { top: [], middle: [], base: [] };

  // إعادة ضبط علم "loaded" كلما تغيّرت الصورة المرئية بحيث يظهر العنصر
  // النائب الوامض مجددًا حتى يُطلق onLoad للصورة الجديدة.
  useEffect(() => {
    setIsImageLoaded(false);
  }, [selectedImage]);

  // عند التركيب، التحقّق من ?size= في الرابط واختيار النسخة تلقائيًا
  useEffect(() => {
    if (!product) return;
    const params = new URLSearchParams(location.search);
    const sizeParam = params.get("size");
    if (sizeParam) {
      // محاولة مطابقة عيّنة أولًا
      const sample = product.samples?.find((s) => s.size === sizeParam);
      if (sample) {
        setActiveMode("sample");
        setSelectedSample(sample.id);
        setSelectedBottleSize(null);
        return;
      }
      // محاولة مطابقة حجم زجاجة
      const bottle = product.bottle_sizes?.find((b) => b.size === sizeParam);
      if (bottle) {
        setActiveMode("bottle");
        setSelectedBottleSize(bottle.id);
        setSelectedSample(null);
        return;
      }
      // إن لم يُعثر عليه، إعادة الضبط إلى الافتراضي
      setSelectedSample(null);
      setSelectedBottleSize(null);
    }
  }, [product, location.search]);

  // جلب البيانات: تحميل المنتج كلما تغيّر معرّف الرابط. عند النجاح نسجّله
  // أيضًا في "المُشاهَدة مؤخرًا" (localStorage) ونُطلق حدث تحليلات
  // "product_view".
  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const productData = await fetchProductById(id);
        setProduct(productData);
        // تتبّع المُشاهَدة مؤخرًا
        if (productData) {
          addRecentlyViewed({
            id: productData.id,
            name: productData.name,
            price: productData.price,
            image: productData.images?.[0]?.image_url || "",
          });
          trackEvent("product_view", {
            product_id: productData.id,
            product_name: productData.name,
            gender: productData.gender,
            price: productData.price,
          });
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, addRecentlyViewed]);

  // أثر جانبي: ربط مستمع keydown عام بحيث ينقل سهما اليسار/اليمين بين صفحات
  // المعرض. تزيله دالة التنظيف عند إلغاء التركيب / إعادة الربط لتجنّب
  // المستمعين المكرّرين والإغلاقات (closures) القديمة.
  // التنقّل عبر لوحة المفاتيح للصور
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // التنقّل بين الصور
      if (productImages.length <= 1) return;

      if (e.key === "ArrowLeft") {
        setSelectedImage(Math.max(0, selectedImage - 1));
      } else if (e.key === "ArrowRight") {
        setSelectedImage(Math.min(productImages.length - 1, selectedImage + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImage, productImages.length]);

  const nextImage = () => {
    setSelectedImage(Math.min(productImages.length - 1, selectedImage + 1));
  };

  const prevImage = () => {
    setSelectedImage(Math.max(0, selectedImage - 1));
  };

  // إرجاع مبكر: حالة التحميل أثناء جلب المنتج.
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen flex items-center justify-center animate-fade-in">
        <div className="glass-card p-12 rounded-2xl text-center max-w-md">
          <Package className="w-16 h-16 text-[#5B8DD9] mx-auto mb-6 animate-pulse" />
          <h1 className="text-3xl font-bold gradient-text mb-4">{t("product.loading")}</h1>
          <p className="dark:text-white/60 text-[#6B7B8D] mb-8">{t("product.fetchingDetails")}</p>
        </div>
      </div>
    );
  }

  // إرجاع مبكر: كان معرّف المنتج غير صالح أو غير موجود في قاعدة البيانات.
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen flex items-center justify-center animate-fade-in">
        <div className="glass-card p-12 rounded-2xl text-center max-w-md">
          <Package className="w-16 h-16 text-[#5B8DD9] mx-auto mb-6" />
          <h1 className="text-3xl font-bold gradient-text mb-4">
            {t("product.notFound")}
          </h1>
          <p className="dark:text-white/60 text-[#6B7B8D] mb-8">
            {t("product.notFoundDesc")}
          </p>
          <Button
            asChild
            className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white"
          >
            <Link to="/">
              <ChevronLeft className="w-4 h-4 me-2" />
              {t("product.returnHome")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  /**
   * إضافة النسخة المختارة إلى السلة.
   * تحلّ العيّنة/الزجاجة المحدّدة من معرّفها المخزّن، وتتحقّق من اختيار
   * الحجم المطلوب فعلًا، ثم تدفع سطر سلة واحدًا لكل وحدة من `quantity`
   * وتعرض إشعار نجاح (toast).
   */
  const handleAddToCart = () => {
    // حلّ النسخة المحدّدة مباشرة من المعرّف المخزّن بغضّ النظر عن activeMode —
    // فواجهة المستخدم تجعل الاختيارين متعارضين متبادلين أصلًا (اختيار عيّنة
    // يمسح اختيار الزجاجة والعكس)، لذا نثق بالمعرّف المضبوط حاليًا. كان
    // إخضاع هذا لـ activeMode يجعل المنتجات ذات العيّنات فقط (التي افتراضها
    // activeMode="bottle") تلجأ بصمت إلى سعر الزجاجة الكاملة.
    const selectedSampleData = selectedSample
      ? product.samples?.find((s) => s.id === selectedSample)
      : null;
    const selectedBottleSizeData = selectedBottleSize
      ? product.bottle_sizes?.find((b) => b.id === selectedBottleSize)
      : null;

    // منع الإضافة إلى السلة فقط إذا كان الاختيار مطلوبًا ولم يُتّخذ، لكن ليس عند اختيار الافتراضي
    if (
      (activeMode === "sample" &&
        product.samples &&
        product.samples.length > 0 &&
        !selectedSample &&
        selectedBottleSize !== null) ||
      (activeMode === "bottle" &&
        product.bottle_sizes &&
        product.bottle_sizes.length > 0 &&
        !selectedBottleSize &&
        selectedSample !== null)
    ) {
      toast.error(t("product.selectSize"), {
        className: "glass-card border-[#5B8DD9]",
      });
      return;
    }

    // إضافة مُدخل سلة واحد لكل وحدة؛ تعكس id/price/size كلها النسخة
    // المختارة، مع اللجوء إلى المنتج الأساسي عند اختيار "الافتراضي".
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: selectedSampleData
          ? selectedSampleData.id
          : selectedBottleSizeData
          ? selectedBottleSizeData.id
          : product.id,
        name: productName,
        price: selectedSampleData
          ? selectedSampleData.price
          : selectedBottleSizeData
          ? selectedBottleSizeData.price
          : product.price,
        image: product.images?.[0]?.image_url || PLACEHOLDER_IMAGE_URL,
        size: selectedSampleData
          ? selectedSampleData.size
          : selectedBottleSizeData
          ? selectedBottleSizeData.size
          : product.size,
      });
    }

    const itemName = selectedSampleData
      ? `${productName} (${selectedSampleData.size} Sample)`
      : selectedBottleSizeData
      ? `${productName} (${selectedBottleSizeData.size} Bottle)`
      : productName;

    toast.success(`${quantity} × ${itemName} ${t("product.addedToCart")}`, {
      className: "glass-card border-[#5B8DD9]",
    });
  };

  const tabs = [
    { id: "journey", label: t("product.journey"), icon: Wind },
    { id: "notes", label: t("product.fragranceNotes"), icon: Sparkles },
    { id: "details", label: t("product.details"), icon: Info },
  ];

  return (
    <div className="bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen w-full relative overflow-hidden">
      {/* عناصر خلفية متحرّكة */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-r from-[#5B8DD9]/10 to-[#3E6BB5]/10 rounded-full blur-xl animate-float" />
        <div
          className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-r from-[#3E6BB5]/10 to-[#5B8DD9]/10 rounded-full blur-xl animate-float"
          style={{ animationDelay: "3s" }}
        />
      </div>

      <div className="container mx-auto px-3 sm:px-4 pt-20 md:pt-24 pb-8 relative z-10">
        {/* مسار التنقّل (Breadcrumb) */}
        <div className="flex items-center space-x-2 sm:space-x-4 rtl:space-x-reverse mb-4 sm:mb-8 mt-2 sm:mt-6 animate-slide-up relative z-50 text-sm flex-wrap">
          <Link
            to="/collection"
            className="bg-[#3E6BB5] hover:bg-[#2d5699] text-white px-4 py-2 rounded-lg inline-flex items-center font-medium transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#5B8DD9]/50"
          >
            <ChevronLeft className="h-4 w-4 me-2" />
            {t("product.backToCollection")}
          </Link>
          <span className="dark:text-white/40 text-[#6B7B8D] dark:text-[#D6D6D6]">/</span>
          <span className="text-[#5B8DD9] font-medium truncate">
            {productName}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 lg:gap-16">
          {/* صور المنتج */}
          <div className="space-y-4 sm:space-y-6 animate-scale-in">
            {/* الصورة الرئيسية */}
            <div className="relative group">
              <div className="glass-card rounded-2xl overflow-hidden p-3 sm:p-4">
                <div className="relative aspect-square rounded-xl overflow-hidden">
                  <img
                    src={productImages[selectedImage]}
                    alt={productName}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-all duration-700 hover:scale-105 ${
                      isImageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setIsImageLoaded(true)}
                  />
                  {/* عنصر نائب للتحميل — وميض بهوية العلامة */}
                  {!isImageLoaded && (
                    <div className="absolute inset-0 shama-skeleton flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-warm/70" />
                    </div>
                  )}
                  {/* إجراءات التراكب (Overlay) */}
                  {/* <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-4 right-4 flex space-x-2">
                      <Button
                        size="icon"
                        className="glass bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 rounded-full"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        className="glass bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 rounded-full"
                      >
                        <Share className="w-4 h-4" />
                      </Button>
                    </div>
                  </div> */}
                  {/* أسهم التنقّل بين الصور */}
                  {productImages.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={prevImage}
                        disabled={selectedImage === 0}
                        className="absolute left-4 top-1/2 -translate-y-1/2 glass bg-black/50 backdrop-blur-sm border border-[#323D50]/15 dark:border-white/20 rounded-full p-3 text-white hover:bg-black/70 transition-all duration-300 opacity-0 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={nextImage}
                        disabled={selectedImage === productImages.length - 1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 glass bg-black/50 backdrop-blur-sm border border-[#323D50]/15 dark:border-white/20 rounded-full p-3 text-white hover:bg-black/70 transition-all duration-300 opacity-0 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* شارة نوع المنتج */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 shadow-md hover:bg-black/80 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#5B8DD9]/50">
                    {product.type === "sample" ? (
                      <TestTube className="h-4 w-4 text-[#5B8DD9]" />
                    ) : (
                      <Bottle className="h-4 w-4 text-[#5B8DD9]" />
                    )}
                    <span className="text-white font-medium text-sm">
                      {product.size}{" "}
                      {product.type === "sample" ? t("product.sample") : t("product.fullBottle")}
                    </span>
                  </div>
                </div>

                {/* شارة بريميوم */}
                {product.rating >= 4.5 && (
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                    <div className="flex items-center space-x-2 rtl:space-x-reverse bg-[#5B8DD9] backdrop-blur-md rounded-full px-3 py-1.5 shadow-md hover:bg-[#3E6BB5] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#5B8DD9]/50">
                      <Award className="w-4 h-4 text-white" />
                      <span className="text-white font-medium text-sm">
                        {t("product.premium")}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* الصور المصغّرة */}
            <div className="flex space-x-4 rtl:space-x-reverse overflow-x-auto scrollbar-hide">
              {productImages.map((image, index) => (
                <Button
                  variant="ghost"
                  size="icon"
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                    selectedImage === index
                      ? "border-[#5B8DD9] scale-105 shadow-lg shadow-[#5B8DD9]/25"
                      : "dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:hover:border-white/40 hover:border-[#323D50]/12 dark:border-white/15"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${productName} view ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {/* مؤشّر النشاط */}
                  {/* {selectedImage === index && (
                    <div className="absolute inset-0 bg-[#5B8DD9]/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-[#5B8DD9] rounded-full flex items-center justify-center">
                        <Eye className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )} */}
                </Button>
              ))}
            </div>

            {/* معلومات التنقّل بين الصور */}
            {productImages.length > 1 && (
              <div className="flex items-center justify-between text-sm dark:text-white/60 text-[#6B7B8D]">
                <span>
                  {selectedImage + 1} / {productImages.length}
                </span>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevImage}
                    disabled={selectedImage === 0}
                    className="glass bg-white dark:bg-white/5 hover:bg-white/10 border border-[#323D50]/10 dark:border-white/10 rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("product.previous")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextImage}
                    disabled={selectedImage === productImages.length - 1}
                    className="glass bg-white dark:bg-white/5 hover:bg-white/10 border border-[#323D50]/10 dark:border-white/10 rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("product.next")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* تفاصيل المنتج */}
          <div
            className="space-y-8 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            {/* ترويسة المنتج */}
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <p className="font-display text-[11px] tracking-[0.3em] uppercase text-warm">
                  {product.type === "gift"
                    ? t("product.eyebrowGift")
                    : product.type === "sample"
                      ? t("product.eyebrowSample")
                      : t("product.eyebrowBottle")}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] leading-[1.05] tracking-tight">
                  {productName}
                </h1>
                <div className="dark:text-white/70 text-[#6B7B8D] text-base sm:text-lg leading-relaxed pt-2">
                  {productDescription}
                </div>
              </div>
            </div>

            {/* السعر والكمية */}
            <div className="glass-card p-4 sm:p-5 md:p-6 rounded-2xl space-y-4 sm:space-y-6">
              {/* مبدّل الوضع - يُعرض فقط إذا كان للمنتج عيّنات وأحجام زجاجات معًا */}
              {(() => {
                const hasSamples =
                  product.has_samples &&
                  product.samples &&
                  product.samples.length > 0;
                const hasBottleSizes =
                  product.has_bottle_sizes &&
                  product.bottle_sizes &&
                  product.bottle_sizes.length > 0;
                return hasSamples && hasBottleSizes;
              })() && (
                <div className="space-y-3">
                  <Label className="dark:text-white/80 text-[#6B7B8D] text-sm font-medium">
                    {t("product.chooseOption")}
                  </Label>
                  <div className="flex glass bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 rounded-xl p-1">
                    <Button
                      variant={activeMode === "bottle" ? "default" : "ghost"}
                      onClick={() => {
                        setActiveMode("bottle");
                        setSelectedSample(null);
                        setSelectedBottleSize(null);
                      }}
                      className={`flex-1 ${
                        activeMode === "bottle"
                          ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white border-0"
                          : " dark:hover:bg-white dark:bg-white/5 hover:bg-white/5"
                      }`}
                    >
                      <Bottle className="w-4 h-4 me-2" />
                      {t("product.bottleSizes")}
                    </Button>
                    <Button
                      variant={activeMode === "sample" ? "default" : "ghost"}
                      onClick={() => {
                        setActiveMode("sample");
                        setSelectedSample(null);
                        setSelectedBottleSize(null);
                      }}
                      className={`flex-1 ${
                        activeMode === "sample"
                          ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white border-0"
                          : " dark:hover:bg-white dark:bg-white/5 hover:bg-white/5"
                      }`}
                    >
                      <TestTube className="w-4 h-4 me-2" />
                      {t("product.samples")}
                    </Button>
                  </div>
                </div>
              )}

              {/* اختيار العيّنة - يُعرض إذا كان activeMode هو 'sample' أو إذا لم تتوفّر أحجام زجاجات */}
              {(() => {
                const hasSamples =
                  product.has_samples &&
                  product.samples &&
                  product.samples.length > 0;
                const hasBottleSizes =
                  product.has_bottle_sizes &&
                  product.bottle_sizes &&
                  product.bottle_sizes.length > 0;
                const shouldShowSamples =
                  activeMode === "sample" || (hasSamples && !hasBottleSizes);
                return shouldShowSamples && hasSamples;
              })() && (
                <div className="space-y-3">
                  <Label className="dark:text-white/80 text-[#6B7B8D] text-sm font-medium">
                    {t("product.chooseSampleSize")}
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* الزر الافتراضي */}
                    <Button
                      variant={selectedSample === null ? "default" : "outline"}
                      onClick={() => {
                        setSelectedSample(null);
                        setSelectedBottleSize(null);
                      }}
                      className={`h-auto p-3 flex flex-col items-center gap-1 ${
                        selectedSample === null
                          ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white border-0"
                          : "glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50] dark:hover:bg-white/10 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {t("product.defaultSize")}
                      </span>
                      <span className="text-xs opacity-80">
                        {product.price} LYD
                      </span>
                      <span className="text-xs opacity-60">
                        {t("product.stock")}: {product.stock_quantity ?? "-"}
                      </span>
                    </Button>
                    {/* أزرار العيّنات */}
                    {product.samples?.map((sample) => (
                      <Button
                        key={sample.id}
                        variant={
                          selectedSample === sample.id ? "default" : "outline"
                        }
                        onClick={() => {
                          setSelectedSample(
                            selectedSample === sample.id ? null : sample.id
                          );
                          setSelectedBottleSize(null);
                        }}
                        className={`h-auto p-3 flex flex-col items-center gap-1 ${
                          selectedSample === sample.id
                            ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white border-0"
                            : "glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50] dark:hover:bg-white/10 hover:bg-white/5"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {sample.size}
                        </span>
                        <span className="text-xs opacity-80">
                          {sample.price} LYD
                        </span>
                        <span className="text-xs opacity-60">
                          {t("product.stock")}: {sample.stock_quantity}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* اختيار حجم الزجاجة - يُعرض إذا كان activeMode هو 'bottle' أو إذا لم تتوفّر عيّنات */}
              {(() => {
                const hasSamples =
                  product.has_samples &&
                  product.samples &&
                  product.samples.length > 0;
                const hasBottleSizes =
                  product.has_bottle_sizes &&
                  product.bottle_sizes &&
                  product.bottle_sizes.length > 0;
                const shouldShowBottleSizes =
                  activeMode === "bottle" || (hasBottleSizes && !hasSamples);
                return shouldShowBottleSizes && hasBottleSizes;
              })() && (
                <div className="space-y-3">
                  <Label className="dark:text-white/80 text-[#6B7B8D] text-sm font-medium">
                    {t("product.chooseBottleSize")}
                  </Label>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* الزر الافتراضي */}
                    <Button
                      variant={
                        selectedBottleSize === null ? "default" : "outline"
                      }
                      onClick={() => {
                        setSelectedBottleSize(null);
                        setSelectedSample(null);
                      }}
                      className={`h-auto p-3 flex flex-col items-center gap-1 ${
                        selectedBottleSize === null
                          ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white border-0"
                          : "glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50] dark:hover:bg-white/10 hover:bg-white/5"
                      }`}
                    >
                      <span className="text-sm font-medium">
                        {t("product.defaultSize")}
                      </span>
                      <span className="text-xs opacity-80">
                        {product.price} LYD
                      </span>
                      <span className="text-xs opacity-60">
                        {t("product.stock")}: {product.stock_quantity ?? "-"}
                      </span>
                    </Button>
                    {/* أزرار أحجام الزجاجات */}
                    {product.bottle_sizes?.map((bottleSize) => (
                      <Button
                        key={bottleSize.id}
                        variant={
                          selectedBottleSize === bottleSize.id
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          setSelectedBottleSize(
                            selectedBottleSize === bottleSize.id
                              ? null
                              : bottleSize.id
                          );
                          setSelectedSample(null);
                        }}
                        className={`h-auto p-3 flex flex-col items-center gap-1 ${
                          selectedBottleSize === bottleSize.id
                            ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white border-0"
                            : "glass dark:bg-white/5 bg-white dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:text-[#F5F5F5] text-[#323D50] dark:hover:bg-white/10 hover:bg-white/5"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {bottleSize.size}
                        </span>
                        <span className="text-xs opacity-80">
                          {bottleSize.price} LYD
                        </span>
                        <span className="text-xs opacity-60">
                          {t("product.stock")}: {bottleSize.stock_quantity}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  {/* السعر الحيّ: مشتقّ من النسخة النشطة. يعالج الأشكال الثلاثة
                      للكتالوج — عيّنات فقط، أو زجاجات فقط، أو كليهما
                      (حيث يقرّر activeMode أيّ اختيار يُحتسب). */}
                  <div className="font-display text-3xl sm:text-4xl md:text-5xl font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] tabular-nums tracking-tight leading-none">
                    {(() => {
                      const hasSamples =
                        product.has_samples &&
                        product.samples &&
                        product.samples.length > 0;
                      const hasBottleSizes =
                        product.has_bottle_sizes &&
                        product.bottle_sizes &&
                        product.bottle_sizes.length > 0;
                      // عيّنات فقط
                      if (hasSamples && !hasBottleSizes) {
                        if (selectedSample) {
                          return (
                            product.samples?.find(
                              (s) => s.id === selectedSample
                            )?.price || product.price
                          );
                        } else {
                          return product.price;
                        }
                      }
                      // أحجام زجاجات فقط
                      if (!hasSamples && hasBottleSizes) {
                        if (selectedBottleSize) {
                          return (
                            product.bottle_sizes?.find(
                              (b) => b.id === selectedBottleSize
                            )?.price || product.price
                          );
                        } else {
                          return product.price;
                        }
                      }
                      // كليهما
                      if (activeMode === "sample" && selectedSample) {
                        return (
                          product.samples?.find((s) => s.id === selectedSample)
                            ?.price || product.price
                        );
                      } else if (
                        activeMode === "bottle" &&
                        selectedBottleSize
                      ) {
                        return (
                          product.bottle_sizes?.find(
                            (b) => b.id === selectedBottleSize
                          )?.price || product.price
                        );
                      } else {
                        return product.price;
                      }
                    })()}{" "}
                    <span className="text-sm font-sans tracking-[0.2em] text-[#6B7B8D] dark:text-white/50 align-middle">LYD</span>
                  </div>
                  <div className="dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6] text-sm">
                    {(() => {
                      const hasSamples =
                        product.has_samples &&
                        product.samples &&
                        product.samples.length > 0;
                      const hasBottleSizes =
                        product.has_bottle_sizes &&
                        product.bottle_sizes &&
                        product.bottle_sizes.length > 0;
                      // عيّنات فقط
                      if (hasSamples && !hasBottleSizes) {
                        if (selectedSample) {
                          const sample = product.samples?.find(
                            (s) => s.id === selectedSample
                          );
                          return (
                            <>
                              <span className="text-[#5B8DD9] font-medium">
                                {sample?.size} {t("product.sample")}
                              </span>{" "}
                              • {sample?.size}
                            </>
                          );
                        } else {
                          return (
                            <>
                              <span className="text-[#5B8DD9] font-medium">
                                {t("product.sample")}
                              </span>{" "}
                              • {product.size}
                            </>
                          );
                        }
                      }
                      // أحجام زجاجات فقط
                      if (!hasSamples && hasBottleSizes) {
                        if (selectedBottleSize) {
                          const bottleSize = product.bottle_sizes?.find(
                            (b) => b.id === selectedBottleSize
                          );
                          return (
                            <>
                              <span className="text-[#5B8DD9] font-medium">
                                {bottleSize?.size} {t("product.fullBottle")}
                              </span>{" "}
                              • {bottleSize?.size}
                            </>
                          );
                        } else {
                          return (
                            <>
                              <span className="text-[#5B8DD9] font-medium">
                                {t("product.fullBottle")}
                              </span>{" "}
                              • {product.size}
                            </>
                          );
                        }
                      }
                      // كليهما
                      if (activeMode === "sample" && selectedSample) {
                        const sample = product.samples?.find(
                          (s) => s.id === selectedSample
                        );
                        return (
                          <>
                            <span className="text-[#5B8DD9] font-medium">
                              {sample?.size} {t("product.sample")}
                            </span>{" "}
                            • {sample?.size}
                          </>
                        );
                      } else if (
                        activeMode === "bottle" &&
                        selectedBottleSize
                      ) {
                        const bottleSize = product.bottle_sizes?.find(
                          (b) => b.id === selectedBottleSize
                        );
                        return (
                          <>
                            <span className="text-[#5B8DD9] font-medium">
                              {bottleSize?.size} {t("product.fullBottle")}
                            </span>{" "}
                            • {bottleSize?.size}
                          </>
                        );
                      } else {
                        return (
                          <>
                            <span className="text-[#5B8DD9] font-medium">
                              {activeMode === "sample"
                                ? t("product.sample")
                                : t("product.fullBottle")}
                            </span>{" "}
                            • {product.size}
                          </>
                        );
                      }
                    })()}
                  </div>
                  {(() => {
                    const hasSamples =
                      product.has_samples &&
                      product.samples &&
                      product.samples.length > 0;
                    const hasBottleSizes =
                      product.has_bottle_sizes &&
                      product.bottle_sizes &&
                      product.bottle_sizes.length > 0;
                    // عيّنات فقط
                    if (hasSamples && !hasBottleSizes) return null;
                    // أحجام زجاجات فقط
                    if (!hasSamples && hasBottleSizes) return null;
                    // كليهما
                    if (activeMode === "sample" && hasBottleSizes) {
                      return (
                        <div className="dark:text-white/40 text-[#6B7B8D] dark:text-[#D6D6D6] text-xs">
                          {t("product.fullBottle")}: {product.size} - {product.price} LYD
                        </div>
                      );
                    } else if (activeMode === "bottle" && hasSamples) {
                      return (
                        <div className="dark:text-white/40 text-[#6B7B8D] dark:text-[#D6D6D6] text-xs">
                          {t("product.sample")}: {product.samples?.[0]?.size} -{" "}
                          {product.samples?.[0]?.price} LYD
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="flex items-center gap-3">
                  <span className="dark:text-[#F5F5F5] text-[#323D50] text-sm sm:text-base font-medium">
                    {t("product.quantity")}
                  </span>
                  <div className="flex items-center gap-3 bg-white dark:bg-white/5 rounded-xl p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-[#5B8DD9]/50"
                    >
                      <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>

                    <span className="text-lg sm:text-xl font-bold text-[#323D50] dark:text-white w-8 sm:w-10 text-center bg-[#323D50]/10 dark:bg-white/10 rounded-lg py-2">
                      {quantity}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                      className="bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-[#5B8DD9]/50"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
              {/* مبدّل قائمة الأمنيات — يضيف هذا المنتج أو يزيله من
                  WishlistContext (المحفوظ) حسب الحالة الحالية. */}
              <Button
                onClick={() => {
                  if (!product) return;
                  const inWishlist = isInWishlist(product.id);
                  if (inWishlist) {
                    removeFromWishlist(product.id);
                    toast.success(`${productName} ${t("product.removedFromWishlist")}`);
                  } else {
                    addToWishlist({
                      id: product.id,
                      name: productName,
                      price: product.price,
                      image: product.images?.[0]?.image_url || "",
                      size: product.size,
                      gender: product.gender,
                    });
                    toast.success(`${productName} ${t("product.addedToWishlist")}`);
                  }
                }}
                className={`glass border rounded-xl w-14 h-14 flex items-center justify-center transition-all duration-300 hover:scale-105 ${
                  isInWishlist(product.id)
                    ? "border-warm/50 bg-warm/10"
                    : "dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:bg-white/5 bg-white dark:hover:bg-white/10 hover:bg-white/5 hover:border-warm/40"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${
                    isInWishlist(product.id) ? "fill-warm text-warm" : "dark:text-white/70 text-[#6B7B8D]"
                  }`}
                />
              </Button>
              <Button
                onClick={handleAddToCart}
                className="flex-1 glass bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 glow-warm-hover"
                disabled={
                  // التعطيل فقط إذا كان الاختيار مطلوبًا ولم يُتّخذ، لكن ليس عند اختيار الافتراضي
                  (activeMode === "sample" &&
                    product.samples &&
                    product.samples.length > 0 &&
                    !selectedSample &&
                    selectedBottleSize !== null) ||
                  (activeMode === "bottle" &&
                    product.bottle_sizes &&
                    product.bottle_sizes.length > 0 &&
                    !selectedBottleSize &&
                    selectedSample !== null)
                }
              >
                <ShoppingBag className="w-5 h-5 me-3" />
                {t("product.addToCart")}
              </Button>
              </div>
            </div>

            {/* تبويبات المنتج */}
            <div className="space-y-6">
              {/* تنقّل التبويبات — تسطير كهرماني بأسلوب تحريري */}
              <div className="flex gap-1 rtl:space-x-reverse border-b border-[#323D50]/10 dark:border-white/10">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 rtl:space-x-reverse px-3 sm:px-5 py-3 sm:py-3.5 font-medium transition-colors duration-200 flex-1 justify-center bg-transparent !bg-transparent !border-0 !rounded-none ${
                      activeTab === tab.id
                        ? "text-warm"
                        : "text-[#6B7B8D] dark:text-white/60 hover:text-[#1E2A3D] dark:hover:text-white"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline font-display tracking-wide text-sm">{tab.label}</span>
                    {activeTab === tab.id && (
                      <span className="absolute -bottom-px left-4 right-4 h-[2px] bg-warm rounded-full" aria-hidden />
                    )}
                  </button>
                ))}
              </div>

              {/* محتوى التبويب — يصيّر لوحًا واحدًا memoized بناءً على activeTab */}
              <div className="glass-card p-6 rounded-2xl">
                {activeTab === "details" && <DetailsTab product={product} t={t} language={language} />}
                {activeTab === "notes" && <NotesTab product={product} t={t} language={language} />}
                {activeTab === "journey" && product && (
                  <FragranceTimeline
                    productName={language === "ar" && product.name_ar ? product.name_ar : product.name}
                    notes={product.fragranceNotes ?? { top: [], middle: [], base: [] }}
                    notesAr={product.fragranceNotes_ar}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* المنتجات ذات الصلة */}
        <div className="col-span-1 lg:col-span-2">
          <RelatedProducts currentProduct={product} />
        </div>

        {/* المُشاهَدة مؤخرًا */}
        <div className="col-span-1 lg:col-span-2">
          <RecentlyViewed />
        </div>

        {/* المراجعات */}
        <div className="col-span-1 lg:col-span-2">
          <ReviewSection
            productId={product.id}
            productName={product.name}
            user={user}
            t={t}
            isRTL={isRTL}
          />
        </div>
      </div>

      {/* شريط الشراء الملتصق للجوال — يعيد احتساب السعر/الحجم/حالة النفاد
          الفعلية من الاختيار الحالي ويعيد استخدام handleAddToCart. */}
      {(() => {
        const selectedSampleObj = product.samples?.find((s) => s.id === selectedSample);
        const selectedBottleObj = product.bottle_sizes?.find((b) => b.id === selectedBottleSize);
        const effectivePrice = selectedSampleObj?.price ?? selectedBottleObj?.price ?? product.price;
        const effectiveSize = selectedSampleObj?.size ?? selectedBottleObj?.size ?? product.size;
        const isSoldOut = !product.is_active || product.stock_quantity === 0;
        return (
          <StickyBuyBar
            price={effectivePrice}
            priceLabel={`${productName} · ${effectiveSize}`}
            onAddToCart={handleAddToCart}
            isSoldOut={isSoldOut}
          />
        );
      })()}
    </div>
  );
}

/** إخفاء معظم بريد المراجِع الإلكتروني للخصوصية عند عرضه علنًا. */
function maskEmail(email: string): string {
  return anonymizeEmail(email);
}

interface ReviewSectionProps {
  productId: string;
  productName: string;
  user: { id: string; email?: string } | null;
  t: (key: string) => string;
  isRTL: boolean;
}

/**
 * ReviewSection — كتلة المراجعات لمنتج (مغلّفة بـ React.memo بحيث لا
 * يُعاد تصييرها عند تغيّر حالة ProductPage غير المرتبطة).
 * تحمّل المراجعات المعتمدة إضافةً إلى مراجعة المستخدم المسجّل، وتصيّر
 * نموذج كتابة المراجعة. تمرّ المُرسَلات عبر إشراف الـ AI قبل تخزينها،
 * لذا قد تظهر مراجعة جديدة فورًا ("approved") أو تُحتجَز ("pending").
 * يُسمح بمراجعة واحدة فقط لكل مستخدم/منتج.
 */
const ReviewSection = React.memo(
  ({ productId, productName, user, t, isRTL }: ReviewSectionProps) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [userReview, setUserReview] = useState<Review | null | undefined>(
      undefined
    );
    const [rating, setRating] = useState(0);
    const [hoveredRating, setHoveredRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    // تحميل المراجعات عند تغيّر المنتج أو المستخدم المسجّل. يُشغَّل الاستعلامان
    // بالتوازي عبر Promise.allSettled بحيث لا يُعطّل فشلُ أحدهما الآخر.
    // يحمي علم `cancelled` من ضبط الحالة بعد إلغاء التركيب (unmount).
    useEffect(() => {
      let cancelled = false;
      async function load() {
        setLoading(true);
        const [approvedResult, existingResult] = await Promise.allSettled([
          fetchApprovedReviews(productId),
          user ? fetchUserReview(productId, user.id) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (approvedResult.status === "fulfilled") setReviews(approvedResult.value);
        setUserReview(existingResult.status === "fulfilled" ? existingResult.value : null);
        setLoading(false);
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [productId, user]);

    /**
     * التحقّق من المراجعة، إخضاعها لإشراف الـ AI، وإرسالها.
     * تُعيد `evaluateReview` (OpenRouter) "approved" أو "pending"؛ تُعرض
     * المراجعة المعتمدة فورًا، وتُحتجَز المعلّقة للإشراف اليدوي.
     */
    const handleSubmit = async () => {
      if (rating === 0) {
        toast.error(t("reviews.selectRating"));
        return;
      }
      if (comment.trim().length < 10) {
        toast.error(t("reviews.commentMinLength"));
        return;
      }
      if (!user) return;

      setSubmitting(true);
      try {
        // بوابة إشراف الـ AI — تقرّر approved مقابل pending قبل تخزينها.
        const evaluation = await evaluateReview(rating, comment.trim(), productName);
        const submitted = await submitReview({
          perfume_id: productId,
          user_id: user.id,
          user_email: user.email || "",
          rating,
          comment: comment.trim(),
          status: evaluation.decision,
          ai_reason: evaluation.reason,
        });
        setUserReview(submitted);
        // الحقن في القائمة المرئية فقط إذا اعتمدتها الـ AI مباشرةً.
        if (evaluation.decision === "approved") {
          setReviews((prev) => [submitted, ...prev]);
          toast.success(t("reviews.toast.approved"));
        } else {
          toast.success(t("reviews.toast.pending"));
        }
        setRating(0);
        setComment("");
      } catch (err: any) {
        // يظهر قيد (perfume_id, user_id) الفريد على شكل ALREADY_REVIEWED.
        if (err?.message === "ALREADY_REVIEWED") {
          toast.error(t("reviews.toast.alreadyReviewed"));
        } else {
          toast.error(t("reviews.toast.submitFailed"));
        }
      } finally {
        setSubmitting(false);
      }
    };

    // تتبع النجوم القيمة الممرَّر عليها أثناء وجود المؤشّر فوقها، وإلا
    // فالتقييم المثبَّت — يمنح التغذية الراجعة المعتادة لمنتقي النجوم التفاعلي.
    const starDisplay = hoveredRating || rating;

    return (
      <section className="mt-8 space-y-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <Star className="w-6 h-6 text-[#5B8DD9] fill-[#5B8DD9]" />
          <h2 className="text-2xl font-bold gradient-text">
            {t("reviews.title")}
            {reviews.length > 0 && (
              <span className="text-base font-normal dark:text-white/50 text-[#6B7B8D] ms-2">
                ({reviews.length} {t("reviews.reviewCount")})
              </span>
            )}
          </h2>
        </div>

        {/* نموذج المراجعة */}
        <div className="glass-card p-6 rounded-2xl space-y-5">
          {!user ? (
            <div className="text-center py-4">
              <Star className="w-10 h-10 text-[#5B8DD9]/40 mx-auto mb-3" />
              <p className="dark:text-white/60 text-[#6B7B8D]">
                {t("reviews.signInToReview")}
              </p>
              <Link
                to="/login"
                className="inline-block mt-3 text-[#5B8DD9] hover:text-[#3E6BB5] font-medium transition-colors"
              >
                {t("auth.signInButton")} →
              </Link>
            </div>
          ) : loading ? (
            <div className="text-center py-4 dark:text-white/50 text-[#6B7B8D]">
              {t("common.loading")}
            </div>
          ) : userReview ? (
            <div className="text-center py-4">
              <div className="flex justify-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-6 h-6 ${
                      s <= userReview.rating
                        ? "text-warm fill-warm"
                        : "text-white/20"
                    }`}
                  />
                ))}
              </div>
              <p className="dark:text-white/70 text-[#6B7B8D] text-sm">
                {userReview.status === "pending"
                  ? t("reviews.pendingApproval")
                  : t("reviews.alreadyReviewed")}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <h3 className="font-semibold dark:text-white text-[#323D50]">
                {t("reviews.writeReview")}
              </h3>

              {/* تقييم النجوم */}
              <div className="space-y-2">
                <Label className="dark:text-white/70 text-[#6B7B8D] text-sm">
                  {t("reviews.yourRating")}
                </Label>
                <div className={`flex gap-2 ${isRTL ? "flex-row-reverse justify-end" : ""}`}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      onMouseEnter={() => setHoveredRating(s)}
                      onMouseLeave={() => setHoveredRating(0)}
                      className="transition-transform hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          s <= starDisplay
                            ? "text-warm fill-warm"
                            : "dark:text-white/30 text-[#6B7B8D]/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* التعليق */}
              <div className="space-y-2">
                <Label className="dark:text-white/70 text-[#6B7B8D] text-sm">
                  {t("reviews.yourComment")}
                </Label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={t("reviews.commentPlaceholder")}
                  rows={4}
                  className="w-full glass dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-xl px-4 py-3 dark:text-white text-[#323D50] dark:placeholder-white/30 placeholder-[#6B7B8D]/60 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#5B8DD9]/50"
                  dir={isRTL ? "rtl" : "ltr"}
                />
                <div className="flex justify-between text-xs dark:text-white/40 text-[#6B7B8D]">
                  <span>{comment.length < 10 && comment.length > 0 ? t("reviews.commentMinLength") : ""}</span>
                  <span>{comment.length} / 10+</span>
                </div>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
              >
                <Star className="w-4 h-4 me-2" />
                {submitting ? t("reviews.submitting") : t("reviews.submitReview")}
              </Button>
            </div>
          )}
        </div>

        {/* قائمة المراجعات */}
        {reviews.length === 0 ? (
          <div className="text-center py-8 dark:text-white/40 text-[#6B7B8D]">
            {t("reviews.noReviews")}
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="glass-card p-5 rounded-2xl space-y-3">
                <div className={`flex items-start justify-between gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {review.user_email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium dark:text-white/80 text-[#323D50]">
                        {maskEmail(review.user_email)}
                      </div>
                      <div className="flex gap-0.5 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= review.rating
                                ? "text-warm fill-warm"
                                : "dark:text-white/20 text-[#6B7B8D]/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs dark:text-white/30 text-[#6B7B8D] flex-shrink-0 tabular-nums">
                    {formatReviewDate(review.created_at, isRTL ? "ar" : "en")}
                  </span>
                </div>
                <p className="dark:text-white/70 text-[#6B7B8D] text-sm leading-relaxed" dir={isRTL ? "rtl" : "ltr"}>
                  {review.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }
);

/**
 * DetailsTab — لوح "التفاصيل": النوع والحجم والتقييم والوصف.
 * memoized بحيث يُعاد تصييره فقط عند تغيّر props الخاصة به. يختار الوصف
 * العربي عندما تكون اللغة النشطة هي العربية ويوجد وصف عربي.
 */
const DetailsTab = React.memo(({ product, t, language }: { product: Product; t: (key: string) => string; language: string }) => {
  const productDescription = language === "ar" && product.description_ar ? product.description_ar : product.description;
  return (
  <div className="space-y-6 animate-fade-in">
    <h3 className="text-xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-4">{t("product.productDetails")}</h3>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="text-sm dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6]">{t("product.type")}</div>
        <div className="dark:text-[#F5F5F5] text-[#323D50] font-medium">
          {product.type === "sample" ? t("product.sampleSize") : t("product.fullBottle")}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6]">{t("product.size")}</div>
        <div className="dark:text-[#F5F5F5] text-[#323D50] font-medium">{product.size}</div>
      </div>
      <div className="space-y-2">
        <div className="text-sm dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6]">{t("product.rating")}</div>
        <div className="dark:text-[#F5F5F5] text-[#323D50] font-medium">{product.rating}/5.0</div>
      </div>
    </div>
    <Separator className="dark:bg-white/10 bg-[#EDF1F7]" />
    <p className="dark:text-white/70 text-[#6B7B8D] leading-relaxed">{productDescription}</p>
  </div>
  );
});

const NotesTab = React.memo(({ product, t, language }: { product: Product; t: (key: string) => string; language: string }) => {
  const productNotes = language === "ar" && product.fragranceNotes_ar?.top?.length ? product.fragranceNotes_ar : product.fragranceNotes;
  return (
  <div className="space-y-6 animate-fade-in">
    <h3 className="text-xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-4">{t("product.fragranceNotes")}</h3>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <div className="text-xs dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6] font-medium uppercase mb-1">
          {t("product.topNotes")}
        </div>
        <ul className="dark:text-white/80 text-[#6B7B8D] text-sm space-y-1">
          {productNotes.top.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6] font-medium uppercase mb-1">
          {t("product.middleNotes")}
        </div>
        <ul className="dark:text-white/80 text-[#6B7B8D] text-sm space-y-1">
          {productNotes.middle.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6] font-medium uppercase mb-1">
          {t("product.baseNotes")}
        </div>
        <ul className="dark:text-white/80 text-[#6B7B8D] text-sm space-y-1">
          {productNotes.base.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
  );
});
