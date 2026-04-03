import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Star,
  TestTube,
  PillBottle as Bottle,
  Eye,
  Sparkles,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Product } from "@/services/productsService";
import { toast } from "sonner";
import { useState } from "react";
import React from "react";
import ProductQuickView from "@/components/ProductQuickView";

interface ProductCardProps {
  product: Product;
}

const ProductCardComponent = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { t, isRTL, language } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const wishlisted = isInWishlist(product.id);

  // Language-aware content
  const productName = language === "ar" && product.name_ar ? product.name_ar : product.name;
  const productDescription = language === "ar" && product.description_ar ? product.description_ar : product.description;
  const productNotes = language === "ar" && product.fragranceNotes_ar?.top?.length ? product.fragranceNotes_ar : product.fragranceNotes;

  // Get all product images
  const productImages = product?.images?.length
    ? product.images.map((img) => img.image_url)
    : ["https://source.unsplash.com/100x100/?perfume,bottle"];

  const handleAddToCart = () => {
    // Check if product is sold out
    if (!product.is_active || product.stock_quantity === 0) {
      toast.error(t("product.currentlySoldOut"));
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image:
        product.images?.[0]?.image_url ||
        "https://source.unsplash.com/100x100/?perfume,bottle",
      size: product.size,
      stock_quantity: product.stock_quantity,
    });
    toast.success(`${productName} ${t("product.addedToCart")}`, {
      className: "glass-card border-[#5B8DD9]",
    });
  };

  const isSoldOut = !product.is_active || product.stock_quantity === 0;

  const nextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(
      (prev) => (prev - 1 + productImages.length) % productImages.length
    );
  };

  const goToImage = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  return (
    <div className="whisper-card">
    <CardContainer
      className="w-full h-full"
      containerClassName="py-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardBody className="glass-card group cursor-pointer animate-scale-in relative overflow-hidden w-full h-full">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#5B8DD9]/20 to-[#3E6BB5]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />

        {/* Image Container */}
        <CardItem
          translateZ="20"
          className="relative overflow-hidden rounded-t-2xl w-full"
        >
          <Link to={`/product/${product.id}`}>
            <div className="relative">
              <img
                src={productImages[currentImageIndex]}
                alt={productName}
                loading="lazy"
                className={`w-full h-72 object-cover transition-all duration-700 group-hover:scale-110 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
              />

              {/* Image Loading Placeholder */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-[#5B8DD9]/20 to-[#3E6BB5]/20 animate-pulse flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#5B8DD9] animate-spin" />
                </div>
              )}

              {/* Multiple Images Indicator */}
              {productImages.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-white text-xs flex items-center">
                  <ImageIcon className="w-3 h-3 me-1" />
                  {productImages.length}
                </div>
              )}

              {/* Image Navigation - Show on hover if multiple images */}
              {productImages.length > 1 && isHovered && (
                <>
                  {/* Previous Button */}
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 glass bg-black/50 backdrop-blur-sm border border-[#323D50]/15 dark:border-white/20 rounded-full p-2 text-white hover:bg-black/70 transition-all duration-300 opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Next Button */}
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 glass bg-black/50 backdrop-blur-sm border border-[#323D50]/15 dark:border-white/20 rounded-full p-2 text-white hover:bg-black/70 transition-all duration-300 opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Image Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 rtl:space-x-reverse opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {productImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => goToImage(index, e)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentImageIndex
                            ? "bg-[#5B8DD9] scale-125"
                            : "bg-white/50 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Wishlist Heart Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (wishlisted) {
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
                className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-sm border border-[#323D50]/15 dark:border-white/20 hover:bg-black/60 transition-all duration-200 hover:scale-110"
              >
                <Heart
                  className={`w-4 h-4 transition-colors duration-200 ${
                    wishlisted ? "fill-red-500 text-red-500" : "text-white"
                  }`}
                />
              </button>

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Quick View Button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                <Button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setQuickViewOpen(true);
                  }}
                  className="glass bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 px-6 py-3 rounded-full font-medium"
                >
                  <Eye className="w-4 h-4 me-2" />
                  {t("product.quickView")}
                </Button>
              </div>
            </div>
          </Link>

          {/* Product Type Badge */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center space-x-1 rtl:space-x-reverse glass bg-black/40 backdrop-blur-md rounded-full px-3 py-2 border border-[#323D50]/15 dark:border-white/20">
              {product.type === "sample" ? (
                <TestTube className="h-4 w-4 text-[#5B8DD9]" />
              ) : (
                <Bottle className="h-4 w-4 text-[#5B8DD9]" />
              )}
              <span className="text-white text-sm font-medium">
                {product.size}
              </span>
            </div>
          </div>

          {/* Sample Available Badge */}
          {product.has_samples &&
            product.samples &&
            product.samples.length > 0 && (
              <div className="absolute top-4 right-4">
                <div className="flex items-center space-x-1 rtl:space-x-reverse glass bg-[#5B8DD9]/80 backdrop-blur-md rounded-full px-3 py-2 border border-[#5B8DD9]/50">
                  <TestTube className="h-3 w-3 text-white" />
                  <span className="text-white text-xs font-medium">
                    {t("product.samplesAvailable")}
                  </span>
                </div>
              </div>
            )}

          {/* Sold Out Badge */}
          {isSoldOut && (
            <div className="absolute top-16 right-4">
              <div className="flex items-center space-x-1 rtl:space-x-reverse glass bg-red-500/80 backdrop-blur-md rounded-full px-3 py-2 border border-red-400/50">
                <span className="text-white text-sm font-semibold">
                  {t("product.soldOut")}
                </span>
              </div>
            </div>
          )}

          {/* Premium Quality Indicator */}
          {product.rating >= 4.5 && !isSoldOut && (
            <div className="absolute bottom-4 right-4 glass bg-gradient-to-r from-[#5B8DD9]/20 to-[#3E6BB5]/20 backdrop-blur-md border border-[#5B8DD9]/30 rounded-full px-3 py-1">
              <div className="flex items-center space-x-1 rtl:space-x-reverse">
                <Sparkles className="w-3 h-3 text-[#5B8DD9]" />
                <span className="text-[#323D50] dark:text-white text-xs font-medium">{t("product.premium")}</span>
              </div>
            </div>
          )}

          {/* Sold Out Overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="text-white text-lg font-bold mb-2">
                  {t("product.outOfStock")}
                </div>
                <div className="text-white/60 text-sm">{t("product.checkBackLater")}</div>
              </div>
            </div>
          )}
        </CardItem>

        {/* Image Thumbnails Preview - Show below main image if multiple images */}
        <CardItem translateZ="15" className="w-full">
          {productImages.length > 1 && (
            <div className="px-4 py-2 bg-black/20 border-b border-white/5">
              <div className="flex space-x-2 rtl:space-x-reverse overflow-x-auto scrollbar-hide">
                {productImages.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={(e) => goToImage(index, e)}
                    className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      index === currentImageIndex
                        ? "border-[#5B8DD9] scale-105"
                        : "border-[#323D50]/15 dark:border-white/20 hover:border-white/40"
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} view ${index + 1}`}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
                {productImages.length > 4 && (
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-black/40 border-2 border-[#323D50]/15 dark:border-white/20 flex items-center justify-center">
                    <span className="text-white/60 text-xs">
                      +{productImages.length - 4}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardItem>

        {/* Content Container */}
        <CardItem
          translateZ="30"
          className="p-4 sm:p-5 md:p-6 space-y-3 sm:space-y-4 w-full"
        >
          {/* Product Name */}
          <Link to={`/product/${product.id}`}>
            <h3 className="text-lg sm:text-xl font-bold dark:text-[#F5F5F5] text-[#323D50] group-hover:gradient-text transition-all duration-300 leading-tight">
              {productName}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 transition-all duration-200 ${
                      i < Math.floor(product.rating)
                        ? "fill-[#5B8DD9] text-[#5B8DD9] drop-shadow-sm"
                        : "text-[#323D50]/20 dark:text-white/20"
                    }`}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="dark:text-white/70 text-[#6B7B8D] text-sm font-medium">
                ({product.rating})
              </span>
            </div>

            {/* Product Type Label */}
            <div className="glass dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-full px-3 py-1">
              <span className="dark:text-white/70 text-[#6B7B8D] text-xs font-medium">
                {product.type === "sample" ? t("product.sample") : t("product.fullSize")}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="dark:text-white/60 text-[#6B7B8D] text-sm leading-relaxed line-clamp-2 dark:group-hover:text-white/80 group-hover:text-[#6B7B8D] dark:text-[#D6D6D6] transition-colors duration-300">
            {productDescription}
          </p>

          {/* Fragrance Notes Preview */}
          <div className="space-y-2">
            <div className="text-xs dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6] font-medium uppercase tracking-wider">
              {t("product.topNotes")}
            </div>
            <div className="flex flex-wrap gap-1">
              {productNotes.top.slice(0, 3).map((note, index) => (
                <span
                  key={index}
                  className="glass dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-full px-2 py-1 text-xs dark:text-white/70 text-[#6B7B8D]"
                >
                  {note}
                </span>
              ))}
            </div>
          </div>

          {/* Price and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 sm:pt-4 gap-3 sm:gap-0">
            <div className="space-y-1">
              <div
                className={`text-xl sm:text-2xl font-bold ${
                  isSoldOut ? "text-[#6B7B8D] dark:text-white/50" : "gradient-text"
                }`}
              >
                {product.price} LYD
              </div>
              <div className="dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6] text-xs">
                {product.type === "sample" ? t("product.sampleSize") : t("product.fullBottle")}
              </div>
            </div>

            <div
              className="w-full sm:w-auto relative z-10"
              style={{ pointerEvents: "auto" }}
            >
              <Button
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className={`glass border-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#5B8DD9]/25 text-sm sm:text-base w-full sm:w-auto ${
                  isSoldOut
                    ? "bg-gray-500/50 text-[#6B7B8D] dark:text-white/60 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white"
                }`}
                style={{ pointerEvents: "auto" }}
              >
                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 me-2" />
                {isSoldOut ? t("product.soldOut") : t("product.addToCart")}
              </Button>
            </div>
          </div>
        </CardItem>

        {/* Animated Border */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#5B8DD9] via-[#3E6BB5] to-[#5B8DD9] opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 animate-pulse-glow"
          style={{ padding: "1px" }}
        >
          <div className="w-full h-full rounded-2xl bg-[#F8F9FB] dark:bg-[#1a2235]" />
        </div>
      </CardBody>
      <ProductQuickView
        product={product}
        open={quickViewOpen}
        onOpenChange={setQuickViewOpen}
      />
    </CardContainer>
    </div>
  );
};

export default React.memo(ProductCardComponent);
