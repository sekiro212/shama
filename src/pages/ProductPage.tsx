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
import { trackEvent } from "@/services/trackingService";

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
  const [activeTab, setActiveTab] = useState("details");
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [selectedBottleSize, setSelectedBottleSize] = useState<string | null>(
    null
  );
  const [activeMode, setActiveMode] = useState<"sample" | "bottle">("bottle");

  // Get product images from the database
  const productImages = product?.images?.length
    ? product.images.map((img) => img.image_url)
    : [PLACEHOLDER_IMAGE_URL];

  // Language-aware content
  const productName = product ? (language === "ar" && product.name_ar ? product.name_ar : product.name) : "";
  const productDescription = product ? (language === "ar" && product.description_ar ? product.description_ar : product.description) : "";
  const productNotes = product ? (language === "ar" && product.fragranceNotes_ar?.top?.length ? product.fragranceNotes_ar : product.fragranceNotes) : { top: [], middle: [], base: [] };

  useEffect(() => {
    setIsImageLoaded(false);
  }, [selectedImage]);

  // On mount, check for ?size= in URL and auto-select variant
  useEffect(() => {
    if (!product) return;
    const params = new URLSearchParams(location.search);
    const sizeParam = params.get("size");
    if (sizeParam) {
      // Try to match sample first
      const sample = product.samples?.find((s) => s.size === sizeParam);
      if (sample) {
        setActiveMode("sample");
        setSelectedSample(sample.id);
        setSelectedBottleSize(null);
        return;
      }
      // Try to match bottle size
      const bottle = product.bottle_sizes?.find((b) => b.size === sizeParam);
      if (bottle) {
        setActiveMode("bottle");
        setSelectedBottleSize(bottle.id);
        setSelectedSample(null);
        return;
      }
      // If not found, reset to default
      setSelectedSample(null);
      setSelectedBottleSize(null);
    }
  }, [product, location.search]);

  useEffect(() => {
    const loadData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const productData = await fetchProductById(id);
        setProduct(productData);
        // Track recently viewed
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

  // Keyboard navigation for images
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Image navigation
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

  const handleAddToCart = () => {
    const selectedSampleData =
      activeMode === "sample" && selectedSample
        ? product.samples?.find((s) => s.id === selectedSample)
        : null;
    const selectedBottleSizeData =
      activeMode === "bottle" && selectedBottleSize
        ? product.bottle_sizes?.find((b) => b.id === selectedBottleSize)
        : null;

    // Only block add-to-cart if a selection is required and not made, but not when Default is selected
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
    { id: "details", label: t("product.details"), icon: Info },
    { id: "notes", label: t("product.fragranceNotes"), icon: Sparkles },
    { id: "journey", label: t("product.journey"), icon: Wind },
  ];

  return (
    <div className="bg-[#F8F9FB] dark:bg-[#1a2235] min-h-screen w-full relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-r from-[#5B8DD9]/10 to-[#3E6BB5]/10 rounded-full blur-xl animate-float" />
        <div
          className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-r from-[#3E6BB5]/10 to-[#5B8DD9]/10 rounded-full blur-xl animate-float"
          style={{ animationDelay: "3s" }}
        />
      </div>

      <div className="container mx-auto px-3 sm:px-4 pt-20 md:pt-24 pb-8 relative z-10">
        {/* Breadcrumb */}
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
          {/* Product Images */}
          <div className="space-y-4 sm:space-y-6 animate-scale-in">
            {/* Main Image */}
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
                  {/* Loading Placeholder */}
                  {!isImageLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#5B8DD9]/20 to-[#3E6BB5]/20 animate-pulse flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-[#5B8DD9] animate-spin" />
                    </div>
                  )}
                  {/* Overlay Actions */}
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
                  {/* Image Navigation Arrows */}
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

                {/* Product Type Badge */}
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

                {/* Premium Badge */}
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

            {/* Thumbnail Images */}
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
                  {/* Active Indicator */}
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

            {/* Image Navigation Info */}
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

          {/* Product Details */}
          <div
            className="space-y-8 animate-slide-up"
            style={{ animationDelay: "0.2s" }}
          >
            {/* Product Header */}
            <div className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text leading-tight">
                  {productName}
                </h1>
                <div className="dark:text-white/70 text-[#6B7B8D] text-base sm:text-lg leading-relaxed">
                  {productDescription}
                </div>
              </div>
            </div>

            {/* Price and Quantity */}
            <div className="glass-card p-4 sm:p-5 md:p-6 rounded-2xl space-y-4 sm:space-y-6">
              {/* Mode Toggle - Only show if product has both samples and bottle sizes */}
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

              {/* Sample Selection - Show if activeMode is 'sample' OR if no bottle sizes available */}
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
                    {/* Default Button */}
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
                    {/* Sample Buttons */}
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

              {/* Bottle Size Selection - Show if activeMode is 'bottle' OR if no samples available */}
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
                    {/* Default Button */}
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
                    {/* Bottle Size Buttons */}
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
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text">
                    {(() => {
                      const hasSamples =
                        product.has_samples &&
                        product.samples &&
                        product.samples.length > 0;
                      const hasBottleSizes =
                        product.has_bottle_sizes &&
                        product.bottle_sizes &&
                        product.bottle_sizes.length > 0;
                      // Only samples
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
                      // Only bottle sizes
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
                      // Both
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
                    LYD
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
                      // Only samples
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
                      // Only bottle sizes
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
                      // Both
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
                    // Only samples
                    if (hasSamples && !hasBottleSizes) return null;
                    // Only bottle sizes
                    if (!hasSamples && hasBottleSizes) return null;
                    // Both
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
                    ? "border-red-500/50 bg-red-500/10"
                    : "dark:border-white/20 border-[#323D50]/10 dark:border-white/10 dark:bg-white/5 bg-white dark:hover:bg-white/10 hover:bg-white/5"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${
                    isInWishlist(product.id) ? "fill-red-500 text-red-500" : "dark:text-white/70 text-[#6B7B8D]"
                  }`}
                />
              </Button>
              <Button
                onClick={handleAddToCart}
                className="flex-1 glass bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#5B8DD9]/25"
                disabled={
                  // Only disable if a selection is required and not made, but not when Default is selected
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

            {/* Product Tabs */}
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex space-x-1 rtl:space-x-reverse glass dark:bg-white/5 bg-white/60 border dark:border-white/10 border-[#323D50]/10 rounded-xl p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 rtl:space-x-reverse px-2 sm:px-4 py-2.5 sm:py-3 rounded-lg font-medium transition-all duration-300 flex-1 justify-center ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white shadow-lg"
                        : " dark:hover:bg-white dark:bg-white/5 hover:bg-white/5"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
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

        {/* Related Products */}
        <div className="col-span-1 lg:col-span-2">
          <RelatedProducts currentProduct={product} />
        </div>

        {/* Recently Viewed */}
        <div className="col-span-1 lg:col-span-2">
          <RecentlyViewed />
        </div>

        {/* Reviews */}
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
    </div>
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local[0]}***@${domain}`;
}

interface ReviewSectionProps {
  productId: string;
  productName: string;
  user: { id: string; email?: string } | null;
  t: (key: string) => string;
  isRTL: boolean;
}

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

    useEffect(() => {
      let cancelled = false;
      async function load() {
        setLoading(true);
        const approved = await fetchApprovedReviews(productId);
        if (!cancelled) setReviews(approved);

        if (user) {
          const existing = await fetchUserReview(productId, user.id);
          if (!cancelled) setUserReview(existing);
        } else {
          setUserReview(null);
        }
        if (!cancelled) setLoading(false);
      }
      load();
      return () => {
        cancelled = true;
      };
    }, [productId, user]);

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
        const status = await evaluateReview(rating, comment.trim(), productName);
        const submitted = await submitReview({
          perfume_id: productId,
          user_id: user.id,
          user_email: user.email || "",
          rating,
          comment: comment.trim(),
          status,
        });
        setUserReview(submitted);
        if (status === "approved") {
          setReviews((prev) => [submitted, ...prev]);
          toast.success(t("reviews.toast.approved"));
        } else {
          toast.success(t("reviews.toast.pending"));
        }
        setRating(0);
        setComment("");
      } catch (err: any) {
        if (err?.message === "ALREADY_REVIEWED") {
          toast.error(t("reviews.toast.alreadyReviewed"));
        } else {
          toast.error(t("reviews.toast.submitFailed"));
        }
      } finally {
        setSubmitting(false);
      }
    };

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

        {/* Review Form */}
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
                        ? "text-amber-400 fill-amber-400"
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

              {/* Star Rating */}
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
                            ? "text-amber-400 fill-amber-400"
                            : "dark:text-white/30 text-[#6B7B8D]/40"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
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

        {/* Reviews List */}
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
                                ? "text-amber-400 fill-amber-400"
                                : "dark:text-white/20 text-[#6B7B8D]/30"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs dark:text-white/30 text-[#6B7B8D] flex-shrink-0">
                    {new Date(review.created_at).toLocaleDateString()}
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
