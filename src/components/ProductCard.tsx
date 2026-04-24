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
  Gift,
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
import {
  PLACEHOLDER_IMAGE_URL,
  ProductImageFallback,
} from "@/lib/productImage";
import { cdnImg } from "@/lib/cdnImage";

interface ProductCardProps {
  product: Product;
}

const ProductCardComponent = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { t, language } = useLanguage();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const wishlisted = isInWishlist(product.id);

  // Language-aware content
  const productName = language === "ar" && product.name_ar ? product.name_ar : product.name;
  const productDescription = language === "ar" && product.description_ar ? product.description_ar : product.description;
  const productNotes = language === "ar" && product.fragranceNotes_ar?.top?.length ? product.fragranceNotes_ar : product.fragranceNotes;

  // Get all product images (empty array when none uploaded — triggers fallback)
  const productImages = product?.images?.length
    ? product.images.map((img) => img.image_url)
    : [];
  const hasImages = productImages.length > 0;

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
      image: product.images?.[0]?.image_url || PLACEHOLDER_IMAGE_URL,
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
    <div className="h-full">
      <CardContainer
        className="w-full h-full"
        containerClassName="py-0 h-full w-full"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardBody className="glass-card group cursor-pointer animate-scale-in relative overflow-hidden w-full h-full flex flex-col focus-within:ring-2 focus-within:ring-warm/60 focus-within:ring-offset-2 focus-within:ring-offset-transparent">
          {/* Glow Effect — warm candlelight */}
          <div className="absolute inset-0 bg-gradient-to-br from-warm/10 via-warm/20 to-warm-glow/10 opacity-0 hover-only:group-hover:opacity-100 transition-opacity duration-500 rounded-2xl -z-10" />

          {/* Image Container */}
          <CardItem
            translateZ="20"
            className="relative overflow-hidden rounded-t-2xl w-full"
          >
            <Link to={`/product/${product.id}`}>
              <div className="relative aspect-[4/5] overflow-hidden transform-gpu">
                {hasImages ? (
                  <>
                    <img
                      src={cdnImg(productImages[currentImageIndex], { width: 480, format: "webp" })}
                      alt={productName}
                      loading="lazy"
                      decoding="async"
                      width={480}
                      height={600}
                      className={`absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover-only:group-hover:scale-[1.04] ${
                        imageLoaded ? "opacity-100" : "opacity-0"
                      }`}
                      onLoad={() => setImageLoaded(true)}
                    />

                    {/* Image Loading Placeholder */}
                    {!imageLoaded && (
                      <div className="absolute inset-0 bg-gradient-to-br from-warm/10 to-warm-glow/10 animate-pulse flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-warm animate-spin" />
                      </div>
                    )}
                  </>
                ) : (
                  <ProductImageFallback className="absolute inset-0 w-full h-full transition-transform duration-300 hover-only:group-hover:scale-[1.04]" />
                )}

                {/* Multiple Images Indicator — bottom-end so it doesn't fight the wishlist heart */}
                {productImages.length > 1 && (
                  <div className="absolute bottom-3 end-3 bg-black/70 rounded-full px-2 py-1 text-white text-xs flex items-center rtl:space-x-reverse">
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
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 border border-white/20 rounded-full p-2 text-white hover:bg-black/85 transition-colors duration-300 opacity-0 hover-only:group-hover:opacity-100"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Next Button */}
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 border border-white/20 rounded-full p-2 text-white hover:bg-black/85 transition-colors duration-300 opacity-0 hover-only:group-hover:opacity-100"
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
                              ? "bg-warm scale-125"
                              : "bg-white/50 hover:bg-white/80"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}

                {/* Wishlist Heart Button */}
                <button
                  aria-label={t("nav.wishlist")}
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
                        image: product.images?.[0]?.image_url || PLACEHOLDER_IMAGE_URL,
                        size: product.size,
                        gender: product.gender,
                      });
                      toast.success(`${productName} ${t("product.addedToWishlist")}`);
                    }
                  }}
                  className="absolute top-3 end-3 z-20 w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-black/60 border border-white/20 hover:bg-black/80 transition-colors duration-200"
                >
                  <Heart
                    className={`w-4 h-4 transition-colors duration-200 ${
                      wishlisted ? "fill-warm text-warm" : "text-white"
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
                    className="bg-white/25 border-white/30 text-white hover:bg-warm/30 hover:border-warm/60 px-6 py-3 rounded-full font-medium transition-colors"
                  >
                    <Eye className="w-4 h-4 me-2" />
                    {t("product.quickView")}
                  </Button>
                </div>
              </div>
            </Link>

            {/* Product Type Badge */}
            <div className="absolute top-3 start-3">
              <div className="flex items-center space-x-1 rtl:space-x-reverse bg-black/65 rounded-full px-2.5 sm:px-3 py-1.5 sm:py-2 border border-warm/30">
                {product.type === "gift" ? (
                  <Gift className="h-4 w-4 text-warm" />
                ) : product.type === "sample" ? (
                  <TestTube className="h-4 w-4 text-warm" />
                ) : (
                  <Bottle className="h-4 w-4 text-warm" />
                )}
                <span className="text-white text-sm font-medium">
                  {product.type === "gift" ? t("giftSets.gridBadge") : product.size}
                </span>
              </div>
            </div>

            {/* Sold Out Overlay — Fraunces italic + amber ring */}
            {isSoldOut && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center ring-1 ring-inset ring-warm/40">
                <div className="text-center">
                  <div className="font-display italic text-white text-2xl mb-1.5">
                    {t("product.outOfStock")}
                  </div>
                  <div className="text-white/70 text-xs tracking-[0.2em] uppercase">
                    {t("product.checkBackLater")}
                  </div>
                </div>
              </div>
            )}
          </CardItem>

          {/* Content Container — flex-1 so all cards in a row reach the same height */}
          <CardItem
            translateZ="30"
            className="p-5 w-full flex flex-col gap-3 flex-1"
          >
            {/* Product Name — Fraunces editorial */}
            <Link to={`/product/${product.id}`}>
              <h3 className="font-display text-xl sm:text-[22px] font-semibold tracking-tight text-[#1E2A3D] dark:text-[#F5F5F5] transition-colors duration-300 leading-[1.15] line-clamp-1 group-hover:text-warm">
                {productName}
              </h3>
            </Link>

            {/* Rating row — includes Premium + Samples inline (moved from image overlays) */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 transition-all duration-200 ${
                        i < Math.floor(product.rating)
                          ? "fill-warm text-warm"
                          : "text-[#323D50]/20 dark:text-white/20"
                      }`}
                    />
                  ))}
                </div>
                <span className="dark:text-white/70 text-[#6B7B8D] text-xs font-medium tabular-nums">
                  {product.rating.toFixed(1)}
                </span>
                {product.rating >= 4.5 && !isSoldOut && (
                  <span className="inline-flex items-center gap-1 rtl:space-x-reverse text-warm text-[11px] font-semibold uppercase tracking-wider">
                    <Sparkles className="w-3 h-3" />
                    {t("product.premium")}
                  </span>
                )}
              </div>

              {/* Product Type Label + samples-available accent */}
              <div className="flex items-center gap-1.5">
                <div className="glass dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-full px-2.5 py-0.5">
                  <span className="dark:text-white/70 text-[#6B7B8D] text-[11px] font-medium">
                    {product.type === "sample" ? t("product.sample") : t("product.fullSize")}
                  </span>
                </div>
                {product.has_samples &&
                  product.samples &&
                  product.samples.length > 0 && (
                    <span
                      className="inline-flex items-center text-warm text-[11px] font-medium"
                      title={t("product.samplesAvailable")}
                    >
                      <TestTube className="w-3 h-3" />
                    </span>
                  )}
              </div>
            </div>

            {/* Description — fixed 2-line slot so cards align even with short copy */}
            <p className="dark:text-white/55 text-[#6B7B8D] text-sm leading-relaxed line-clamp-2 min-h-[2.625rem] transition-colors duration-300">
              {productDescription}
            </p>

            {/* Fragrance Notes — fixed-height slot rendered even when empty */}
            <div className="flex flex-wrap gap-1.5 min-h-[1.375rem]">
              {productNotes.top?.slice(0, 2).map((note, index) => (
                <span
                  key={index}
                  className="glass dark:bg-white/5 bg-white border dark:border-white/10 border-[#323D50]/10 rounded-full px-2 py-0.5 text-[11px] dark:text-white/70 text-[#6B7B8D]"
                >
                  {note}
                </span>
              ))}
              {(productNotes.top?.length ?? 0) > 2 && (
                <span className="text-[11px] dark:text-white/40 text-[#6B7B8D]/60 self-center">
                  +{(productNotes.top?.length ?? 0) - 2}
                </span>
              )}
            </div>

            {/* Price + CTA — pinned to card bottom via mt-auto */}
            <div className="flex items-end justify-between gap-3 pt-2 mt-auto">
              <div className="space-y-0.5">
                <div
                  className={`font-display text-2xl sm:text-[26px] font-semibold leading-none tabular-nums tracking-tight ${
                    isSoldOut
                      ? "text-[#6B7B8D] dark:text-white/50"
                      : "text-[#1E2A3D] dark:text-[#F5F5F5] group-hover:text-warm transition-colors duration-300"
                  }`}
                >
                  {product.price} <span className="text-xs font-sans tracking-[0.2em] text-[#6B7B8D] dark:text-white/50 align-middle">LYD</span>
                </div>
                <div className="dark:text-white/50 text-[#6B7B8D] text-[11px]">
                  {product.type === "sample" ? t("product.sampleSize") : t("product.fullBottle")}
                </div>
              </div>

              <div className="relative z-10" style={{ pointerEvents: "auto" }}>
                <Button
                  onClick={handleAddToCart}
                  disabled={isSoldOut}
                  className={`border-0 h-11 px-4 rounded-xl font-semibold transition-all duration-300 text-sm inline-flex items-center ${
                    isSoldOut
                      ? "bg-gray-500/50 text-[#6B7B8D] dark:text-white/60 cursor-not-allowed"
                      : "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white glow-warm-hover"
                  }`}
                  style={{ pointerEvents: "auto" }}
                  aria-label={isSoldOut ? t("product.soldOut") : t("product.addToCart")}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span className="ms-2 hidden sm:inline">
                    {isSoldOut ? t("product.soldOut") : t("product.addToCart")}
                  </span>
                </Button>
              </div>
            </div>
          </CardItem>

          {/* Animated Border — warm candlelight */}
          <div
            className="absolute inset-0 rounded-2xl bg-gradient-to-r from-warm/0 via-warm/60 to-warm/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"
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
