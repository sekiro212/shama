/**
 * ====================================================================
 * GiftStep4Preview — الخطوة الرابعة (الأخيرة) من معالج بناء الهدية
 * --------------------------------------------------------------------
 * تعرض المعاينة النهائية للهدية: صورة الهدية المولَّدة بالذكاء الاصطناعي،
 * شبكة صور العطور المختارة، وأزرار الإجراء (الإضافة إلى السلة أو تأكيد الطلب).
 * تدعم اللغتين العربية والإنجليزية مع اتجاه RTL عبر useLanguage().
 * ====================================================================
 */
import { ChevronLeft, ShoppingCart, Package } from "lucide-react";
import { Product } from "@/services/productsService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

/**
 * خصائص المكوّن:
 * - onPlaceOrder: دالة تأكيد طلب الهدية المخصّصة.
 * - onBack: العودة إلى خطوة التخصيص.
 * - selectedProducts: العطور المختارة لعرضها في المعاينة.
 * - isPlacingOrder: مؤشّر انشغال أثناء إرسال الطلب.
 * - generatedImageUrl: رابط صورة الهدية المولَّدة بالذكاء الاصطناعي (اختياري).
 */
interface Props {
  onPlaceOrder: () => void;
  onBack: () => void;
  selectedProducts: Product[];
  isPlacingOrder: boolean;
  generatedImageUrl?: string;
}

/**
 * المكوّن الرئيسي لخطوة معاينة الهدية وتأكيد الطلب.
 */
export default function GiftStep4Preview({
  onPlaceOrder,
  onBack,
  selectedProducts,
  isPlacingOrder,
  generatedImageUrl,
}: Props) {
  const { t, isRTL } = useLanguage();
  const { addToCart } = useCart();

  /**
   * تضيف جميع العطور المختارة إلى سلة التسوّق دفعةً واحدة، ثم تُظهر إشعار نجاح.
   * تُستخدم كبديل عن تأكيد طلب الهدية المخصّصة مباشرة.
   */
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

      {/* AI-generated gift preview */}
      {generatedImageUrl && (
        <div className="relative rounded-2xl overflow-hidden border dark:border-white/10 border-[#323D50]/10 shadow-lg">
          <img
            src={generatedImageUrl}
            alt={t("giftBuilder.step4Title")}
            className="w-full rounded-2xl"
            onError={(e) => console.error("[GiftImage] Failed to render img:", e)}
          />
          <div className="absolute top-3 end-3 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
            ✨ AI Gift Preview
          </div>
        </div>
      )}

      {/* Product image grid */}
      {/* شبكة صور العطور المختارة: عمود واحد عند اختيار عطر واحد، وعمودان لما زاد */}
      <div className={`grid ${selectedProducts.length === 1 ? "grid-cols-1" : "grid-cols-2"} gap-3`}>
        {selectedProducts.map((product) => (
          <div
            key={product.id}
            className="glass-card rounded-2xl overflow-hidden border dark:border-white/10 border-[#323D50]/10"
          >
            <div className="aspect-square">
              {product.images?.[0]?.image_url ? (
                <img
                  src={product.images[0].image_url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#F8F9FB] dark:bg-[#1a2235] flex items-center justify-center">
                  <Package className="h-10 w-10 dark:text-white/20 text-[#323D50]/20" />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium dark:text-[#F5F5F5] text-[#323D50] truncate">
                {product.name}
              </p>
              <p className="text-xs dark:text-white/50 text-[#6B7B8D]">
                {product.price} LYD
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <button
        onClick={handleAddToCart}
        className="w-full glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-3 rounded-xl font-semibold hover:scale-105 transition-all flex items-center justify-center gap-2"
      >
        <ShoppingCart className="h-5 w-5" />
        {t("giftBuilder.addToCart")}
      </button>

      {/* زر تأكيد طلب الهدية المخصّصة؛ يُعطَّل ويُظهر مؤشّر تحميل أثناء الإرسال */}
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

      <button
        onClick={onBack}
        className="w-full glass border dark:border-white/10 border-[#323D50]/10 dark:text-white text-[#323D50] py-2.5 rounded-xl font-medium hover:scale-105 transition-all flex items-center justify-center gap-2"
      >
        <ChevronLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
        {t("giftBuilder.back")}
      </button>
    </div>
  );
}
