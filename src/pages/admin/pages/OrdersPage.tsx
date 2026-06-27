/**
 * ملف: OrdersPage.tsx
 * الدور: صفحة هدف المسار الخاصة بطلبات الشراء في لوحة التحكم (/admin/orders).
 * تجمع جدول الطلبات مع نافذة تفاصيل الطلب ونافذة تكبير الصورة. تحتاج إلى خطّاف العطور
 * لإعادة تحميل المخزون عند تغيّره نتيجة قبول/إرجاع طلب.
 */
import { useEffect } from "react";
import { useOrders } from "../hooks/useOrders";
import { usePerfumes } from "../hooks/usePerfumes";
import { OrdersTab } from "../tabs/OrdersTab";
import { OrderDetailsDialog } from "../dialogs/OrderDetailsDialog";
import { ImageModal } from "../dialogs/ImageModal";

/**
 * المكوّن الرئيسي لصفحة الطلبات.
 * يربط منطق الطلبات بالمخزون عبر onStockMutated، ويعرض الجدول ونافذتي التفاصيل والصورة.
 */
export default function OrdersPage() {
  const perfumesApi = usePerfumes();
  // عند تغيّر المخزون بفعل عملية على الطلب، يُعاد تحميل العطور لإبقاء أرقام المخزون متزامنة
  const ordersApi = useOrders({ onStockMutated: () => perfumesApi.loadPerfumes() });

  // جلب الطلبات مرة واحدة عند أول تحميل للصفحة
  useEffect(() => {
    ordersApi.loadOrders();
  }, []);

  return (
    <>
      <OrdersTab ordersApi={ordersApi} />
      <OrderDetailsDialog
        open={ordersApi.showOrderDetails}
        onOpenChange={ordersApi.setShowOrderDetails}
        order={ordersApi.selectedOrder}
        onImageClick={ordersApi.handleImageClick}
        vanexActions={ordersApi}
      />
      <ImageModal
        open={ordersApi.showImageModal}
        onOpenChange={ordersApi.setShowImageModal}
        imageUrl={ordersApi.selectedImage}
      />
    </>
  );
}
