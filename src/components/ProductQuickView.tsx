/**
 * ===============================================================
 * ProductQuickView.tsx — نافذة المعاينة السريعة للمنتَج
 * ---------------------------------------------------------------
 * نافذة منبثقة (Dialog) تعرض ملخّصًا سريعًا عن العطر دون مغادرة
 * الصفحة الحالية: معرض صور مصغّر، الاسم، الحجم/النوع/التقييم،
 * وصف مختصر، أبرز النفحات (notes)، السعر، وزرّا الإضافة للسلّة
 * والانتقال للتفاصيل الكاملة. يتعامل مع حالة "نفاد المخزون".
 *
 * مكان الاستخدام: تُفتح من بطاقات/قوائم المنتجات لمعاينة سريعة.
 * تدعم الاتجاهين العربي (RTL) والإنجليزي (LTR).
 * ===============================================================
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, X, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Product } from "@/services/productsService";
import { toast } from "sonner";

interface ProductQuickViewProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * المكوّن الرئيسي لنافذة المعاينة السريعة.
 * @param product بيانات المنتَج (العطر) المعروض.
 * @param open هل النافذة مفتوحة؟
 * @param onOpenChange دالة تغيير حالة الفتح/الإغلاق.
 */
export default function ProductQuickView({ product, open, onOpenChange }: ProductQuickViewProps) {
  const { addToCart } = useCart();
  const { t, isRTL } = useLanguage();
  // فهرس الصورة المعروضة حاليًا ضمن معرض الصور المصغّر
  const [selectedImage, setSelectedImage] = useState(0);

  const productImages = product?.images?.length
    ? product.images.map((img) => img.image_url)
    : [];

  // الإضافة للسلّة مع منعها عند نفاد المخزون، ثم إغلاق النافذة
  const handleAddToCart = () => {
    if (product.stock_quantity === 0) {
      toast.error(t("product.currentlySoldOut"));
      return;
    }
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.image_url || "",
      size: product.size,
      stock_quantity: product.stock_quantity,
    });
    toast.success(`${product.name} ${t("product.addedToCart")}`);
    onOpenChange(false);
  };

  // المنتَج يُعدّ نافدًا إذا كان غير مُفعَّل أو كانت كمية المخزون صفرًا
  const isSoldOut = !product.is_active || product.stock_quantity === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#F8F9FB] dark:bg-[#1a2235] border border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-2xl p-0 overflow-hidden rounded-2xl">
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="md:w-1/2 relative">
            <img
              src={productImages[selectedImage] || ""}
              alt={product.name}
              className="w-full h-64 md:h-full object-cover"
            />
            {isSoldOut && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-bold text-lg">{t("product.soldOut")}</span>
              </div>
            )}
            {/* نقاط التنقّل بين الصور (حتى 5 صور) تظهر فقط عند وجود أكثر من صورة واحدة */}
            {productImages.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {productImages.slice(0, 5).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === selectedImage ? "bg-[#5B8DD9] scale-125" : "bg-white/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Details */}
          <div className="md:w-1/2 p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold gradient-text mb-1">{product.name}</h2>
              <div className="flex items-center gap-2 text-sm text-[#6B7B8D] dark:text-white/60">
                <span>{product.size}</span>
                <span>•</span>
                <span>{product.gender || "unisex"}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#5B8DD9] text-[#5B8DD9]" />
                  <span>{product.rating}</span>
                </div>
              </div>
            </div>
            <p className="text-[#6B7B8D] dark:text-white/70 text-sm line-clamp-3">{product.description}</p>
            <div className="flex flex-wrap gap-1">
              {product.fragranceNotes?.top?.slice(0, 4).map((note, i) => (
                <span key={i} className="text-xs px-2 py-1 rounded-full bg-white dark:bg-white/5 border border-[#323D50]/10 dark:border-white/10 text-[#6B7B8D] dark:text-white/60">
                  {note}
                </span>
              ))}
            </div>
            <div className="text-2xl font-bold gradient-text">{product.price} LYD</div>
            <div className="flex gap-3">
              <Button
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className="flex-1 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white border-0 rounded-xl py-3 font-semibold disabled:opacity-50"
              >
                <ShoppingBag className="w-4 h-4 me-2" />
                {isSoldOut ? t("product.soldOut") : t("product.addToCart")}
              </Button>
              <Button
                asChild
                variant="outline"
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10 rounded-xl px-4"
                onClick={() => onOpenChange(false)}
              >
                <Link to={`/product/${product.id}`}>
                  <Eye className="w-4 h-4 me-2" />
                  {t("product.fullDetails")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
