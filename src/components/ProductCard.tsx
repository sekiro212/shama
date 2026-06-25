import { Link } from "react-router-dom";
import { ShoppingBag, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useWishlist } from "@/contexts/WishlistContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Product } from "@/services/productsService";
import { toast } from "sonner";
import { useState } from "react";
import React from "react";
import {
  PLACEHOLDER_IMAGE_URL,
  ProductImageFallback,
} from "@/lib/productImage";
import { cdnImg } from "@/lib/cdnImage";

interface ProductCardProps {
  product: Product;
}

/**
 * Editorial product card (Amouage-inspired, Shama brand):
 * big full-bleed image → crossfades to a second image on hover; centered
 * serif name + price; add-to-cart + wishlist reveal on hover (desktop) and
 * stay visible on touch. Built for an edge-to-edge hairline grid.
 */
const ProductCardComponent = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { t, language, isRTL } = useLanguage();
  const [primaryLoaded, setPrimaryLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const wishlisted = isInWishlist(product.id);

  // Language-aware name only — minimal card shows nothing else
  const productName =
    language === "ar" && product.name_ar ? product.name_ar : product.name;

  const productImages = product?.images?.length
    ? product.images.map((img) => img.image_url)
    : [];
  const hasImages = productImages.length > 0;
  const primaryImage = productImages[0];
  const hoverImage = productImages[1]; // second image → hover crossfade target
  const hasHoverImage = Boolean(hoverImage);

  const isSoldOut = !product.is_active || product.stock_quantity === 0;

  // Latin text gets editorial uppercase + tracking; Arabic must not (breaks shaping)
  const latinDisplay = isRTL ? "" : "uppercase";

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSoldOut) {
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

  const toggleWishlist = (e: React.MouseEvent) => {
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
  };

  return (
    <div className="group relative flex h-full flex-col bg-[#F8F9FB] dark:bg-[#1a2235]">
      {/* Image — tonal backdrop, hover crossfade to second image */}
      <div className="relative aspect-[4/5] overflow-hidden bg-[#EFE9E1] dark:bg-[#10172A]">
        <Link
          to={`/product/${product.id}`}
          aria-label={productName}
          className="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm/70"
        >
          {hasImages && !imageError ? (
            <>
              {/* Primary image */}
              <img
                src={cdnImg(primaryImage, { width: 600, format: "webp" })}
                alt={productName}
                loading="lazy"
                decoding="async"
                width={600}
                height={750}
                onLoad={() => setPrimaryLoaded(true)}
                onError={() => setImageError(true)}
                className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[600ms] ease-out ${
                  primaryLoaded ? "opacity-100" : "opacity-0"
                } ${
                  hasHoverImage
                    ? "md:group-hover:opacity-0"
                    : "motion-safe:md:group-hover:scale-[1.05]"
                }`}
              />

              {/* Secondary image — fades in on hover */}
              {hasHoverImage && (
                <img
                  src={cdnImg(hoverImage, { width: 600, format: "webp" })}
                  alt=""
                  aria-hidden
                  loading="lazy"
                  decoding="async"
                  width={600}
                  height={750}
                  className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-[600ms] ease-out motion-safe:md:group-hover:scale-[1.03] md:group-hover:opacity-100"
                />
              )}

              {/* Loading shimmer */}
              {!primaryLoaded && (
                <div className="absolute inset-0 shama-skeleton" />
              )}
            </>
          ) : (
            <ProductImageFallback className="absolute inset-0 h-full w-full" />
          )}
        </Link>

        {/* Wishlist — always visible on touch, reveals on hover (desktop) */}
        <button
          onClick={toggleWishlist}
          aria-label={t("header.wishlist")}
          className="absolute end-3 top-3 z-20 flex h-10 w-10 p-0 items-center justify-center rounded-full border border-[#323D50]/10 bg-white/85 backdrop-blur-sm transition-all duration-300 motion-safe:active:scale-90 dark:border-white/15 dark:bg-black/55 md:opacity-0 md:translate-y-1 md:group-hover:translate-y-0 md:group-hover:opacity-100 focus-visible:opacity-100 focus-visible:translate-y-0"
        >
          <Heart
            className={`h-4 w-4 transition-colors duration-200 ${
              wishlisted
                ? "fill-warm text-warm"
                : "text-[#323D50] dark:text-white"
            }`}
          />
        </button>

        {/* Sold-out overlay */}
        {isSoldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/65 ring-1 ring-inset ring-warm/40">
            <div className="text-center">
              <div className="mb-1.5 font-display text-2xl italic text-white">
                {t("product.outOfStock")}
              </div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/70">
                {t("product.checkBackLater")}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Text — centered editorial: name + price, hover-reveal CTA */}
      <div className="flex flex-1 flex-col items-center gap-2 px-4 pb-6 pt-5 text-center">
        <Link to={`/product/${product.id}`} className="w-full">
          <h3
            className={`font-display text-[15px] font-medium leading-snug text-[#1E2A3D] transition-colors duration-300 line-clamp-2 group-hover:text-warm dark:text-[#F5F5F5] sm:text-base ${latinDisplay} ${
              isRTL ? "" : "tracking-[0.1em]"
            }`}
          >
            {productName}
          </h3>
        </Link>

        <div
          className={`font-display text-lg leading-none tabular-nums ${
            isSoldOut
              ? "text-[#6B7B8D] dark:text-white/50"
              : "text-[#1E2A3D] dark:text-[#F5F5F5]"
          }`}
        >
          <span className="me-1 align-middle font-sans text-[11px] tracking-[0.2em] text-[#6B7B8D] dark:text-white/50">
            LYD
          </span>
          {product.price}
        </div>

        {/* Add to cart — visible on touch, reveals on hover (desktop) */}
        <div className="mt-auto w-full pt-3 transition-all duration-300 md:translate-y-1 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100">
          <Button
            onClick={handleAddToCart}
            disabled={isSoldOut}
            aria-label={isSoldOut ? t("product.soldOut") : t("product.addToCart")}
            className={`h-10 w-full rounded-lg border text-[11px] font-semibold transition-colors duration-300 ${
              isRTL ? "" : "uppercase tracking-[0.18em]"
            } ${
              isSoldOut
                ? "cursor-not-allowed border-transparent bg-gray-500/40 text-[#6B7B8D] dark:text-white/60"
                : "border-[#5B8DD9]/40 bg-transparent text-[#3E6BB5] hover:border-transparent hover:bg-gradient-to-r hover:from-[#5B8DD9] hover:to-[#3E6BB5] hover:text-white dark:border-white/25 dark:text-[#F5F5F5]"
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="ms-2">
              {isSoldOut ? t("product.soldOut") : t("product.addToCart")}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCardComponent);
