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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContainer, CardBody, CardItem } from "@/components/ui/3d-card";
import { useCart } from "@/contexts/CartContext";
import { Product } from "@/services/productsService";
import { toast } from "sonner";
import { useState } from "react";
import React from "react";

interface ProductCardProps {
  product: Product;
}

const ProductCardComponent = ({ product }: ProductCardProps) => {
  const { addToCart } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get all product images
  const productImages = product?.images?.length
    ? product.images.map((img) => img.image_url)
    : ["https://source.unsplash.com/100x100/?perfume,bottle"];

  const handleAddToCart = () => {
    // Check if product is sold out
    if (!product.is_active || product.stock_quantity === 0) {
      toast.error("This product is currently sold out");
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
    toast.success(`${product.name} added to cart!`, {
      className: "glass-card border-[#b24ce2]",
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
    <CardContainer
      className="w-full h-full"
      containerClassName="py-0"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardBody className="glass-card group cursor-pointer animate-scale-in relative overflow-hidden w-full h-full">
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#b24ce2]/20 to-[#8e2de2]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10" />

        {/* Image Container */}
        <CardItem
          translateZ="20"
          className="relative overflow-hidden rounded-t-2xl w-full"
        >
          <Link to={`/product/${product.id}`}>
            <div className="relative">
              <img
                src={productImages[currentImageIndex]}
                alt={product.name}
                loading="lazy"
                className={`w-full h-72 object-cover transition-all duration-700 group-hover:scale-110 ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
                onLoad={() => setImageLoaded(true)}
              />

              {/* Image Loading Placeholder */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-[#b24ce2]/20 to-[#8e2de2]/20 animate-pulse flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-[#b24ce2] animate-spin" />
                </div>
              )}

              {/* Multiple Images Indicator */}
              {productImages.length > 1 && (
                <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm rounded-full px-2 py-1 text-white text-xs flex items-center">
                  <ImageIcon className="w-3 h-3 mr-1" />
                  {productImages.length}
                </div>
              )}

              {/* Image Navigation - Show on hover if multiple images */}
              {productImages.length > 1 && isHovered && (
                <>
                  {/* Previous Button */}
                  <button
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 glass bg-black/50 backdrop-blur-sm border border-white/20 rounded-full p-2 text-white hover:bg-black/70 transition-all duration-300 opacity-0 group-hover:opacity-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Next Button */}
                  <button
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 glass bg-black/50 backdrop-blur-sm border border-white/20 rounded-full p-2 text-white hover:bg-black/70 transition-all duration-300 opacity-0 group-hover:opacity-100"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Image Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    {productImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={(e) => goToImage(index, e)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === currentImageIndex
                            ? "bg-[#b24ce2] scale-125"
                            : "bg-white/50 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Quick View Button */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-4 group-hover:translate-y-0">
                <Button
                  asChild
                  className="glass bg-white/20 backdrop-blur-md border-white/30 text-white hover:bg-white/30 px-6 py-3 rounded-full font-medium"
                >
                  <Link to={`/product/${product.id}`}>
                    <Eye className="w-4 h-4 mr-2" />
                    Quick View
                  </Link>
                </Button>
              </div>
            </div>
          </Link>

          {/* Product Type Badge */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center space-x-1 glass bg-black/40 backdrop-blur-md rounded-full px-3 py-2 border border-white/20">
              {product.type === "sample" ? (
                <TestTube className="h-4 w-4 text-[#b24ce2]" />
              ) : (
                <Bottle className="h-4 w-4 text-[#b24ce2]" />
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
                <div className="flex items-center space-x-1 glass bg-[#b24ce2]/80 backdrop-blur-md rounded-full px-3 py-2 border border-[#b24ce2]/50">
                  <TestTube className="h-3 w-3 text-white" />
                  <span className="text-white text-xs font-medium">
                    Samples Available
                  </span>
                </div>
              </div>
            )}

          {/* Sold Out Badge */}
          {isSoldOut && (
            <div className="absolute top-16 right-4">
              <div className="flex items-center space-x-1 glass bg-red-500/80 backdrop-blur-md rounded-full px-3 py-2 border border-red-400/50">
                <span className="text-white text-sm font-semibold">
                  Sold Out
                </span>
              </div>
            </div>
          )}

          {/* Premium Quality Indicator */}
          {product.rating >= 4.5 && !isSoldOut && (
            <div className="absolute bottom-4 right-4 glass bg-gradient-to-r from-[#b24ce2]/20 to-[#8e2de2]/20 backdrop-blur-md border border-[#b24ce2]/30 rounded-full px-3 py-1">
              <div className="flex items-center space-x-1">
                <Sparkles className="w-3 h-3 text-[#b24ce2]" />
                <span className="text-white text-xs font-medium">Premium</span>
              </div>
            </div>
          )}

          {/* Sold Out Overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="text-white text-lg font-bold mb-2">
                  Out of Stock
                </div>
                <div className="text-white/60 text-sm">Check back later</div>
              </div>
            </div>
          )}
        </CardItem>

        {/* Image Thumbnails Preview - Show below main image if multiple images */}
        <CardItem translateZ="15" className="w-full">
          {productImages.length > 1 && (
            <div className="px-4 py-2 bg-black/20 border-b border-white/5">
              <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
                {productImages.slice(0, 4).map((image, index) => (
                  <button
                    key={index}
                    onClick={(e) => goToImage(index, e)}
                    className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                      index === currentImageIndex
                        ? "border-[#b24ce2] scale-105"
                        : "border-white/20 hover:border-white/40"
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
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-black/40 border-2 border-white/20 flex items-center justify-center">
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
            <h3 className="text-lg sm:text-xl font-bold text-white group-hover:gradient-text transition-all duration-300 leading-tight">
              {product.name}
            </h3>
          </Link>

          {/* Rating */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 transition-all duration-200 ${
                      i < Math.floor(product.rating)
                        ? "fill-[#b24ce2] text-[#b24ce2] drop-shadow-sm"
                        : "text-white/20"
                    }`}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
              <span className="text-white/70 text-sm font-medium">
                ({product.rating})
              </span>
            </div>

            {/* Product Type Label */}
            <div className="glass bg-white/5 border border-white/10 rounded-full px-3 py-1">
              <span className="text-white/70 text-xs font-medium">
                {product.type === "sample" ? "Sample" : "Full Size"}
              </span>
            </div>
          </div>

          {/* Description */}
          <p className="text-white/60 text-sm leading-relaxed line-clamp-2 group-hover:text-white/80 transition-colors duration-300">
            {product.description}
          </p>

          {/* Fragrance Notes Preview */}
          <div className="space-y-2">
            <div className="text-xs text-white/50 font-medium uppercase tracking-wider">
              Top Notes
            </div>
            <div className="flex flex-wrap gap-1">
              {product.fragranceNotes.top.slice(0, 3).map((note, index) => (
                <span
                  key={index}
                  className="glass bg-white/5 border border-white/10 rounded-full px-2 py-1 text-xs text-white/70"
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
                  isSoldOut ? "text-white/50" : "gradient-text"
                }`}
              >
                {product.price} LYD
              </div>
              <div className="text-white/50 text-xs">
                {product.type === "sample" ? "Sample Size" : "Full Bottle"}
              </div>
            </div>

            <div
              className="w-full sm:w-auto relative z-10"
              style={{ pointerEvents: "auto" }}
            >
              <Button
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className={`glass border-0 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#b24ce2]/25 text-sm sm:text-base w-full sm:w-auto ${
                  isSoldOut
                    ? "bg-gray-500/50 text-white/60 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#b24ce2] to-[#8e2de2] hover:from-[#8e2de2] hover:to-[#b24ce2] text-white"
                }`}
                style={{ pointerEvents: "auto" }}
              >
                <ShoppingBag className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                {isSoldOut ? "Sold Out" : "Add to Cart"}
              </Button>
            </div>
          </div>
        </CardItem>

        {/* Animated Border */}
        <div
          className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#b24ce2] via-[#8e2de2] to-[#b24ce2] opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10 animate-pulse-glow"
          style={{ padding: "1px" }}
        >
          <div className="w-full h-full rounded-2xl bg-[#0e0a1d]" />
        </div>
      </CardBody>
    </CardContainer>
  );
};

export default React.memo(ProductCardComponent);
