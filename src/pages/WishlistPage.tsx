import { Heart, ShoppingBag, Trash2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useWishlist } from "@/contexts/WishlistContext";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const WishlistPage = () => {
  const { t, isRTL } = useLanguage();
  const { items, removeFromWishlist, clearWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleAddToCart = (item: (typeof items)[0]) => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image,
      size: item.size,
    });
    removeFromWishlist(item.id);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#1a2235] pt-20 md:pt-24 pb-12 sm:pb-16">
      <div className="container mx-auto px-3 sm:px-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text mb-1 sm:mb-2 leading-tight">
              {t("wishlist.title")}
            </h1>
            <p className="dark:text-white/60 text-[#6B7B8D] text-xs sm:text-sm">
              {items.length} {items.length === 1 ? t("wishlist.itemSaved") : t("wishlist.itemsSaved")} {t("wishlist.saved")}
            </p>
          </div>
          {items.length > 0 && (
            <Button
              variant="outline"
              onClick={clearWishlist}
              className="w-full sm:w-auto min-h-[44px] dark:border-white/10 border-[#323D50]/10  hover:border-[#323D50]/12 dark:border-white/15 dark:hover:bg-white dark:bg-white/5 hover:bg-white dark:bg-white/5 transition-all duration-300"
            >
              <Trash2 className="w-4 h-4 me-2" />
              {t("wishlist.clearWishlist")}
            </Button>
          )}
        </div>

        {/* Empty State */}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-full dark:bg-white/5 bg-white/10 flex items-center justify-center mb-6">
              <Heart className="w-12 h-12 dark:text-white/20 text-[#5B8DD9]" />
            </div>
            <h2 className="text-2xl font-semibold dark:text-[#F5F5F5] text-[#323D50] mb-3">
              {t("wishlist.emptyTitle")}
            </h2>
            <p className="dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6] mb-8 max-w-md">
              {t("wishlist.emptyDesc")}
            </p>
            <Link to="/collection">
              <Button className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:opacity-90 text-white px-8 py-3 rounded-xl transition-all duration-300">
                {t("wishlist.exploreCollection")}
                <ArrowRight className="w-4 h-4 ms-2" />
              </Button>
            </Link>
          </div>
        )}

        {/* Wishlist Grid */}
        {items.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {items.map((item) => (
              <div
                key={item.id}
                className="glass-card rounded-2xl overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-[#5B8DD9]/10"
              >
                {/* Image */}
                <div className="relative aspect-square overflow-hidden bg-white/5">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromWishlist(item.id)}
                    className="absolute top-2 end-2 sm:top-3 sm:end-3 w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-black/70 transition-all duration-300"
                    aria-label={t("wishlist.clearWishlist")}
                  >
                    <Heart className="w-5 h-5 fill-current" />
                  </button>
                  {/* Gender Badge */}
                  {item.gender && (
                    <span className="absolute top-2 start-2 sm:top-3 sm:start-3 px-3 py-1 rounded-full text-[11px] sm:text-xs font-medium bg-black/50 backdrop-blur-sm text-white/80 capitalize">
                      {item.gender}
                    </span>
                  )}
                </div>

                {/* Details */}
                <div className="p-4 sm:p-5">
                  <h3 className="dark:text-[#F5F5F5] text-[#323D50] font-semibold text-base sm:text-lg mb-1 truncate">
                    {item.name}
                  </h3>
                  <p className="dark:text-white/50 text-[#6B7B8D] dark:text-[#D6D6D6] text-xs sm:text-sm mb-3">{t("wishlist.size")}: {item.size}</p>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-lg sm:text-xl font-bold gradient-text">
                      {item.price} LYD
                    </span>
                    <Button
                      onClick={() => handleAddToCart(item)}
                      size="sm"
                      className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:opacity-90 text-white rounded-xl min-h-[40px] transition-all duration-300"
                    >
                      <ShoppingBag className="w-4 h-4 me-1 sm:me-2" />
                      <span className="text-xs sm:text-sm">{t("wishlist.addToCart")}</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;
