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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { fetchProductById, Product } from "@/services/productsService";
import { toast } from "sonner";
import React, { useState, useEffect } from "react";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { addToCart } = useCart();
  const location = useLocation();

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
    : ["https://source.unsplash.com/100x100/?perfume,bottle"];

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
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

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
      <div className="container mx-auto px-4 py-20 text-center bg-[#0e0a1d] min-h-screen flex items-center justify-center animate-fade-in">
        <div className="glass-card p-12 rounded-2xl text-center max-w-md">
          <Package className="w-16 h-16 text-[#b24ce2] mx-auto mb-6 animate-pulse" />
          <h1 className="text-3xl font-bold gradient-text mb-4">Loading...</h1>
          <p className="text-white/60 mb-8">Fetching product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center bg-[#0e0a1d] min-h-screen flex items-center justify-center animate-fade-in">
        <div className="glass-card p-12 rounded-2xl text-center max-w-md">
          <Package className="w-16 h-16 text-[#b24ce2] mx-auto mb-6" />
          <h1 className="text-3xl font-bold gradient-text mb-4">
            Product not found
          </h1>
          <p className="text-white/60 mb-8">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Button
            asChild
            className="bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] hover:from-[#8e2de2] hover:to-[#b24ce2] text-white"
          >
            <Link to="/">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Return to homepage
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
      toast.error("Please select a size before adding to cart.", {
        className: "glass-card border-[#b24ce2]",
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
        name: product.name,
        price: selectedSampleData
          ? selectedSampleData.price
          : selectedBottleSizeData
          ? selectedBottleSizeData.price
          : product.price,
        image:
          product.images?.[0]?.image_url ||
          "https://source.unsplash.com/100x100/?perfume,bottle",
        size: selectedSampleData
          ? selectedSampleData.size
          : selectedBottleSizeData
          ? selectedBottleSizeData.size
          : product.size,
      });
    }

    const itemName = selectedSampleData
      ? `${product.name} (${selectedSampleData.size} Sample)`
      : selectedBottleSizeData
      ? `${product.name} (${selectedBottleSizeData.size} Bottle)`
      : product.name;

    toast.success(`${quantity} × ${itemName} added to cart!`, {
      className: "glass-card border-[#b24ce2]",
    });
  };

  const tabs = [
    { id: "details", label: "Details", icon: Info },
    { id: "notes", label: "Fragrance Notes", icon: Sparkles },
  ];

  return (
    <div className="bg-[#0e0a1d] min-h-screen w-full relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-20 right-10 w-32 h-32 bg-gradient-to-r from-[#b24ce2]/10 to-[#8e2de2]/10 rounded-full blur-xl animate-float" />
        <div
          className="absolute bottom-40 left-20 w-24 h-24 bg-gradient-to-r from-[#8e2de2]/10 to-[#b24ce2]/10 rounded-full blur-xl animate-float"
          style={{ animationDelay: "3s" }}
        />
      </div>

      <div className="container mx-auto px-4 pt-[80px] md:pt-24 pb-8 relative z-10">
        {/* Breadcrumb */}
        <div className="flex items-center space-x-4 mb-8 mt-4 sm:mt-6 animate-slide-up relative z-50">
          <Link
            to="/collection"
            className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-lg inline-flex items-center font-medium transition-all duration-300 hover:scale-105 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Collection
          </Link>
          <span className="text-white/40">/</span>
          <span className="text-[#b24ce2] font-medium truncate">
            {product.name}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Product Images */}
          <div className="space-y-6 animate-scale-in">
            {/* Main Image */}
            <div className="relative group">
              <div className="glass-card rounded-2xl overflow-hidden p-4">
                <div className="relative aspect-square rounded-xl overflow-hidden">
                  <img
                    src={productImages[selectedImage]}
                    alt={product.name}
                    loading="lazy"
                    className={`w-full h-full object-cover transition-all duration-700 hover:scale-105 ${
                      isImageLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setIsImageLoaded(true)}
                  />
                  {/* Loading Placeholder */}
                  {!isImageLoaded && (
                    <div className="absolute inset-0 bg-gradient-to-br from-[#b24ce2]/20 to-[#8e2de2]/20 animate-pulse flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-[#b24ce2] animate-spin" />
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
                        className="absolute left-4 top-1/2 -translate-y-1/2 glass bg-black/50 backdrop-blur-sm border border-white/20 rounded-full p-3 text-white hover:bg-black/70 transition-all duration-300 opacity-0 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={nextImage}
                        disabled={selectedImage === productImages.length - 1}
                        className="absolute right-4 top-1/2 -translate-y-1/2 glass bg-black/50 backdrop-blur-sm border border-white/20 rounded-full p-3 text-white hover:bg-black/70 transition-all duration-300 opacity-0 group-hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Product Type Badge */}
                <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
                  <div className="flex items-center space-x-2 bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 shadow-md hover:bg-black/80 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#b24ce2]/50">
                    {product.type === "sample" ? (
                      <TestTube className="h-4 w-4 text-[#b24ce2]" />
                    ) : (
                      <Bottle className="h-4 w-4 text-[#b24ce2]" />
                    )}
                    <span className="text-white font-medium text-sm">
                      {product.size}{" "}
                      {product.type === "sample" ? "Sample" : "Full Bottle"}
                    </span>
                  </div>
                </div>

                {/* Premium Badge */}
                {product.rating >= 4.5 && (
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4">
                    <div className="flex items-center space-x-2 bg-purple-600 backdrop-blur-md rounded-full px-3 py-1.5 shadow-md hover:bg-purple-700 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                      <Award className="w-4 h-4 text-white" />
                      <span className="text-white font-medium text-sm">
                        Premium
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Thumbnail Images */}
            <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
              {productImages.map((image, index) => (
                <Button
                  variant="ghost"
                  size="icon"
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                    selectedImage === index
                      ? "border-[#b24ce2] scale-105 shadow-lg shadow-[#b24ce2]/25"
                      : "border-white/20 hover:border-white/40"
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} view ${index + 1}`}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  {/* Active Indicator */}
                  {/* {selectedImage === index && (
                    <div className="absolute inset-0 bg-[#b24ce2]/20 flex items-center justify-center">
                      <div className="w-6 h-6 bg-[#b24ce2] rounded-full flex items-center justify-center">
                        <Eye className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )} */}
                </Button>
              ))}
            </div>

            {/* Image Navigation Info */}
            {productImages.length > 1 && (
              <div className="flex items-center justify-between text-sm text-white/60">
                <span>
                  {selectedImage + 1} of {productImages.length} images
                </span>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevImage}
                    disabled={selectedImage === 0}
                    className="glass bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextImage}
                    disabled={selectedImage === productImages.length - 1}
                    className="glass bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
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
                  {product.name}
                </h1>
                <div className="text-white/70 text-base sm:text-lg leading-relaxed">
                  {product.description}
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
                  <Label className="text-white/80 text-sm font-medium">
                    Choose Option
                  </Label>
                  <div className="flex glass bg-white/5 border border-white/10 rounded-xl p-1">
                    <Button
                      variant={activeMode === "bottle" ? "default" : "ghost"}
                      onClick={() => {
                        setActiveMode("bottle");
                        setSelectedSample(null);
                        setSelectedBottleSize(null);
                      }}
                      className={`flex-1 ${
                        activeMode === "bottle"
                          ? "bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] text-white border-0"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Bottle className="w-4 h-4 mr-2" />
                      Bottle Sizes
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
                          ? "bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] text-white border-0"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Samples
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
                  <Label className="text-white/80 text-sm font-medium">
                    Choose Sample Size
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
                          ? "bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] text-white border-0"
                          : "glass bg-white/5 border-white/20 text-white hover:bg-white/10"
                      }`}
                    >
                      <span className="text-sm font-medium">
                        Default (Original Size)
                      </span>
                      <span className="text-xs opacity-80">
                        {product.price} LYD
                      </span>
                      <span className="text-xs opacity-60">
                        Stock: {product.stock_quantity ?? "-"}
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
                            ? "bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] text-white border-0"
                            : "glass bg-white/5 border-white/20 text-white hover:bg-white/10"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {sample.size}
                        </span>
                        <span className="text-xs opacity-80">
                          {sample.price} LYD
                        </span>
                        <span className="text-xs opacity-60">
                          Stock: {sample.stock_quantity}
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
                  <Label className="text-white/80 text-sm font-medium">
                    Choose Bottle Size
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
                          ? "bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] text-white border-0"
                          : "glass bg-white/5 border-white/20 text-white hover:bg-white/10"
                      }`}
                    >
                      <span className="text-sm font-medium">
                        Default (Original Size)
                      </span>
                      <span className="text-xs opacity-80">
                        {product.price} LYD
                      </span>
                      <span className="text-xs opacity-60">
                        Stock: {product.stock_quantity ?? "-"}
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
                            ? "bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] text-white border-0"
                            : "glass bg-white/5 border-white/20 text-white hover:bg-white/10"
                        }`}
                      >
                        <span className="text-sm font-medium">
                          {bottleSize.size}
                        </span>
                        <span className="text-xs opacity-80">
                          {bottleSize.price} LYD
                        </span>
                        <span className="text-xs opacity-60">
                          Stock: {bottleSize.stock_quantity}
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
                  <div className="text-white/50 text-sm">
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
                              <span className="text-[#b24ce2] font-medium">
                                {sample?.size} Sample
                              </span>{" "}
                              • {sample?.size}
                            </>
                          );
                        } else {
                          return (
                            <>
                              <span className="text-[#b24ce2] font-medium">
                                Sample
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
                              <span className="text-[#b24ce2] font-medium">
                                {bottleSize?.size} Bottle
                              </span>{" "}
                              • {bottleSize?.size}
                            </>
                          );
                        } else {
                          return (
                            <>
                              <span className="text-[#b24ce2] font-medium">
                                Full Bottle
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
                            <span className="text-[#b24ce2] font-medium">
                              {sample?.size} Sample
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
                            <span className="text-[#b24ce2] font-medium">
                              {bottleSize?.size} Bottle
                            </span>{" "}
                            • {bottleSize?.size}
                          </>
                        );
                      } else {
                        return (
                          <>
                            <span className="text-[#b24ce2] font-medium">
                              {activeMode === "sample"
                                ? "Sample"
                                : "Full Bottle"}
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
                        <div className="text-white/40 text-xs">
                          Full bottle: {product.size} - {product.price} LYD
                        </div>
                      );
                    } else if (activeMode === "bottle" && hasSamples) {
                      return (
                        <div className="text-white/40 text-xs">
                          Sample available: {product.samples?.[0]?.size} -{" "}
                          {product.samples?.[0]?.price} LYD
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm sm:text-base font-medium">
                    Quantity
                  </span>
                  <div className="flex items-center gap-3 bg-white/5 rounded-xl p-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="bg-purple-600 hover:bg-purple-700 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-purple-500/50"
                    >
                      <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>

                    <span className="text-lg sm:text-xl font-bold text-white w-8 sm:w-10 text-center bg-white/10 rounded-lg py-2">
                      {quantity}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                      className="bg-purple-600 hover:bg-purple-700 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-md transition-all duration-200 hover:scale-105 focus:ring-2 focus:ring-purple-500/50"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleAddToCart}
                className="w-full glass bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] hover:from-[#8e2de2] hover:to-[#b24ce2] text-white border-0 py-3 sm:py-4 rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-[#b24ce2]/25"
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
                <ShoppingBag className="w-5 h-5 mr-3" />
                Add {quantity > 1 ? `${quantity} items` : "1 item"} to Cart
              </Button>
            </div>

            {/* Product Tabs */}
            <div className="space-y-6">
              {/* Tab Navigation */}
              <div className="flex space-x-1 glass bg-white/5 border border-white/10 rounded-xl p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 flex-1 justify-center ${
                      activeTab === tab.id
                        ? "bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] text-white shadow-lg"
                        : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="glass-card p-6 rounded-2xl">
                {activeTab === "details" && <DetailsTab product={product} />}
                {activeTab === "notes" && <NotesTab product={product} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DetailsTab = React.memo(({ product }: { product: Product }) => (
  <div className="space-y-6 animate-fade-in">
    <h3 className="text-xl font-bold text-white mb-4">Product Details</h3>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <div className="text-sm text-white/50">Type</div>
        <div className="text-white font-medium">
          {product.type === "sample" ? "Sample Size" : "Full Bottle"}
        </div>
      </div>
      <div className="space-y-2">
        <div className="text-sm text-white/50">Size</div>
        <div className="text-white font-medium">{product.size}</div>
      </div>
      <div className="space-y-2">
        <div className="text-sm text-white/50">Rating</div>
        <div className="text-white font-medium">{product.rating}/5.0</div>
      </div>
    </div>
    <Separator className="bg-white/10" />
    <p className="text-white/70 leading-relaxed">{product.description}</p>
  </div>
));

const NotesTab = React.memo(({ product }: { product: Product }) => (
  <div className="space-y-6 animate-fade-in">
    <h3 className="text-xl font-bold text-white mb-4">Fragrance Notes</h3>
    <div className="grid grid-cols-3 gap-4">
      <div>
        <div className="text-xs text-white/50 font-medium uppercase mb-1">
          Top
        </div>
        <ul className="text-white/80 text-sm space-y-1">
          {product.fragranceNotes.top.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs text-white/50 font-medium uppercase mb-1">
          Middle
        </div>
        <ul className="text-white/80 text-sm space-y-1">
          {product.fragranceNotes.middle.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>
      <div>
        <div className="text-xs text-white/50 font-medium uppercase mb-1">
          Base
        </div>
        <ul className="text-white/80 text-sm space-y-1">
          {product.fragranceNotes.base.map((note, i) => (
            <li key={i}>{note}</li>
          ))}
        </ul>
      </div>
    </div>
  </div>
));
