import { useEffect } from "react";
import { useOrders } from "../hooks/useOrders";
import { usePerfumes } from "../hooks/usePerfumes";
import { OrdersTab } from "../tabs/OrdersTab";
import { OrderDetailsDialog } from "../dialogs/OrderDetailsDialog";
import { ImageModal } from "../dialogs/ImageModal";

export default function OrdersPage() {
  const perfumesApi = usePerfumes();
  const ordersApi = useOrders({ onStockMutated: () => perfumesApi.loadPerfumes() });

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
