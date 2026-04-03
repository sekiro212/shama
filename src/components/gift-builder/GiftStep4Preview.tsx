import { Download, Share2, ShoppingCart, Package, ChevronLeft, RefreshCw } from "lucide-react";
import { GiftImageStyle } from "@/types/giftBuilder";
import { Product } from "@/services/productsService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface Props {
  imageUrl: string;
  imageStyle: GiftImageStyle;
  onStyleChange: (style: GiftImageStyle) => void;
  onRegenerate: () => void;
  onPlaceOrder: () => void;
  onBack: () => void;
  selectedProducts: Product[];
  isGenerating: boolean;
  isPlacingOrder: boolean;
}

export default function GiftStep4Preview({
  imageUrl,
  imageStyle,
  onStyleChange,
  onRegenerate,
  onPlaceOrder,
  onBack,
  selectedProducts,
  isGenerating,
  isPlacingOrder,
}: Props) {
  const { t, isRTL } = useLanguage();
  const { addToCart } = useCart();

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = `shama-gift-${Date.now()}.jpg`;
    link.click();
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: "My Shama Gift", url: imageUrl });
      } else {
        await navigator.clipboard.writeText(imageUrl);
        toast.success(t("giftBuilder.linkCopied"));
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        toast.error(t("giftBuilder.errorOrder"));
      }
    }
  };

  const handleAddToCart = () => {
    selectedProducts.forEach((p) => {
      addToCart({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.images?.[0]?.image_url ?? "",
        size: p.size,
        stock_quantity: p.stock_quantity,
      });
    });
    toast.success(t("giftBuilder.addedToCart"));
  };

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold dark:text-[#F5F5F5] text-[#323D50] mb-2">
          {t("giftBuilder.step4Title")}
        </h2>
      </div>

      {/* Style Toggle */}
      <div className="flex gap-2 justify-center">
        {(["realistic", "stylized"] as GiftImageStyle[]).map((s) => (
          <button
            key={s}
            onClick={() => !isGenerating && onStyleChange(s)}
            disabled={isGenerating}
            className={`px-5 py-2 rounded-full text-sm font-medium border transition-all ${
              imageStyle === s
                ? "bg-[#5B8DD9] text-white border-[#5B8DD9]"
                : "glass dark:border-white/10 border-[#323D50]/10 dark:text-white/70 text-[#6B7B8D] hover:border-[#5B8DD9]"
            } disabled:opacity-50`}
          >
            {s === "realistic" ? t("giftBuilder.styleRealistic") : t("giftBuilder.styleStylized")}
          </button>
        ))}
      </div>

      {/* Image */}
      <div className="relative aspect-square rounded-2xl overflow-hidden glass-card border dark:border-white/10 border-[#323D50]/10">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#F8F9FB] dark:bg-[#1a2235]">
            <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-[#5B8DD9]" />
            <p className="dark:text-white/60 text-[#6B7B8D] text-sm">{t("giftBuilder.generating")}</p>
          </div>
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt="Generated gift"
            className="w-full h-full object-cover"
          />
        ) : null}
      </div>

      {/* Action buttons — only show when image is ready */}
      {!isGenerating && imageUrl && (
        <>
          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              className="flex-1 glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-2.5 rounded-xl font-medium hover:scale-105 transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <Download className="h-4 w-4" />
              {t("giftBuilder.download")}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-2.5 rounded-xl font-medium hover:scale-105 transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <Share2 className="h-4 w-4" />
              {t("giftBuilder.share")}
            </button>
            <button
              onClick={onRegenerate}
              className="flex-1 glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-2.5 rounded-xl font-medium hover:scale-105 transition-all flex items-center justify-center gap-1.5 text-sm"
            >
              <RefreshCw className="h-4 w-4" />
              {t("giftBuilder.regenerate")}
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-3 rounded-xl font-semibold hover:scale-105 transition-all flex items-center justify-center gap-2"
          >
            <ShoppingCart className="h-5 w-5" />
            {t("giftBuilder.addToCart")}
          </button>

          <button
            onClick={onPlaceOrder}
            disabled={isPlacingOrder}
            className="w-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white py-3 px-6 rounded-xl font-semibold transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isPlacingOrder ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                {t("giftBuilder.placingOrder")}
              </>
            ) : (
              <>
                <Package className="h-5 w-5" />
                {t("giftBuilder.placeOrder")}
              </>
            )}
          </button>
        </>
      )}

      <button
        onClick={onBack}
        disabled={isGenerating}
        className="w-full glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-2.5 rounded-xl font-medium hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <ChevronLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
        {t("giftBuilder.back")}
      </button>
    </div>
  );
}
