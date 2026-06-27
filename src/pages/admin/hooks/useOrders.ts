/**
 * useOrders.ts
 *
 * hook للبيانات والتعديلات الخاص بمورد "الطلبات" في لوحة الإدارة — وهو أكبر hook
 * في اللوحة. يحمّل الطلبات والإحصاءات المجمّعة، ويوفّر دورة حياة الطلب كاملةً:
 * القبول (إنقاص المخزون)، الإرجاع (إعادة التخزين)، الحذف، تغيير الحالة،
 * إضافةً إلى تكامل التوصيل مع Vanex (إرسال / مزامنة / مزامنة جماعية /
 * إلغاء / استرجاع). يتتبّع كل إجراء طويل التنفيذ معرّف الطلب "المنشغل" الخاص به
 * من أجل مؤشّرات التحميل على مستوى الصف، وتُعلِم الإجراءات المؤثّرة على المخزون
 * المكوّن الأب عبر `onStockMutated` كي تتمكّن قائمة العطور من التحديث.
 */
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  fetchOrders,
  getOrderStats,
  deleteOrder,
  updateOrderStatus,
  saveVanexPackageInfo,
  syncVanexOrder,
  bulkSyncVanex,
  Order,
  OrderStats,
} from "@/services/ordersService";
import {
  createVanexPackage,
  cancelVanexPackage,
  recallVanexPackage,
} from "@/services/vanexService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirmDialog } from "./useConfirmDialog";

interface UseOrdersOptions {
  onStockMutated?: () => void;
}

/**
 * hook يدير مورد الطلبات في لوحة الإدارة.
 * @param onStockMutated دالة استدعاء اختيارية تُطلَق بعد أي إجراء يغيّر المخزون
 *                       (قبول/إرجاع) كي يتمكّن المكوّن الأب من تحديث مخزون العطور.
 * @returns الطلبات + الإحصاءات + حالة التحميل، وحالة النافذة/النافذة المنبثقة، وجميع
 *          معرّفات الانشغال لكل إجراء، وprops نافذة التأكيد، وكل معالجات التحميل/التعديل.
 */
export function useOrders({ onStockMutated }: UseOrdersOptions = {}) {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    topCities: [],
    recentOrders: [],
  });
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [acceptingOrder, setAcceptingOrder] = useState<string | null>(null);
  const [returningOrder, setReturningOrder] = useState<string | null>(null);
  const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
  const [sendingToVanex, setSendingToVanex] = useState<string | null>(null);
  const [syncingVanex, setSyncingVanex] = useState<string | null>(null);
  const [bulkSyncingVanex, setBulkSyncingVanex] = useState(false);
  const [cancellingVanex, setCancellingVanex] = useState<string | null>(null);
  const [recallingVanex, setRecallingVanex] = useState<string | null>(null);
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState<string | null>(
    null
  );

  // جلب قائمة الطلبات من Supabase إلى الحالة.
  const loadOrders = async () => {
    try {
      setOrdersLoading(true);
      const fetchedOrders = await fetchOrders();
      setOrders(fetchedOrders);
    } catch (error) {
      console.error("Error loading orders:", error);
      toast.error(t("admin.toast.loadOrdersFailed"));
    } finally {
      setOrdersLoading(false);
    }
  };

  // جلب الإحصاءات المجمّعة للطلبات (الإجماليات، أبرز المدن، الطلبات الأخيرة).
  const loadOrderStats = async () => {
    try {
      const stats = await getOrderStats();
      setOrderStats(stats);
    } catch (error) {
      console.error("Error loading order stats:", error);
    }
  };

  // حذف طلب بعد التأكيد، ثم تحديث القائمة + الإحصاءات.
  const handleDeleteOrder = async (id: string) => {
    const confirmed = await confirm({
      title: t("admin.confirmDialog.deleteOrder.title"),
      description: t("admin.confirm.deleteOrder"),
      confirmLabel: t("admin.confirmDialog.delete"),
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      setDeletingOrder(id);
      const success = await deleteOrder(id);
      if (success) {
        toast.success(t("admin.toast.orderDeletedSuccess"));
        // إعادة مزامنة كلٍّ من الجدول وإحصاءات لوحة المعلومات.
        loadOrders();
        loadOrderStats();
      } else {
        toast.error(t("admin.toast.orderDeleteFailed"));
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      toast.error(t("admin.toast.orderDeleteFailed"));
    } finally {
      setDeletingOrder(null);
    }
  };

  // إنشاء طرد توصيل Vanex لطلب، وحفظ أكواده، ثم المزامنة.
  const handleSendToVanex = async (order: Order) => {
    const confirmed = await confirm({
      title: t("admin.confirmDialog.sendToVanex.title"),
      description: t("admin.confirm.sendToVanex"),
      confirmLabel: t("admin.confirmDialog.sendToVanex.confirm"),
      variant: "default",
    });
    if (!confirmed) return;

    try {
      setSendingToVanex(order.id);
      // 1) طلب من Vanex إنشاء طرد الشحنة.
      const result = await createVanexPackage(order);

      if (!result) {
        toast.error(t("admin.vanex.sendFailed"));
        return;
      }

      // 2) حفظ كود/معرّف الطرد المُرجَع في صف الطلب.
      const { packageCode, packageId } = result;
      const saved = await saveVanexPackageInfo(order.id, packageCode, packageId);
      if (!saved) {
        toast.error(t("admin.vanex.saveFailed").replace("{code}", packageCode));
        return;
      }

      toast.success(t("admin.vanex.sendSuccess").replace("{code}", packageCode));
      // 3) مزامنة أولية للحالة بأفضل جهد ممكن (مع تجاهل الإخفاقات هنا).
      await syncVanexOrder(order.id).catch(() => undefined);
      loadOrders();
      loadOrderStats();
    } catch (error) {
      console.error("Error sending to Vanex:", error);
      toast.error(t("admin.vanex.sendError"));
    } finally {
      setSendingToVanex(null);
    }
  };

  // جلب أحدث حالة توصيل من Vanex لطلب واحد.
  const handleSyncVanex = async (order: Order) => {
    if (!order.vanex_package_code) return; // لا شيء للمزامنة إذا لم يُرسَل قط.
    try {
      setSyncingVanex(order.id);
      const ok = await syncVanexOrder(order.id);
      if (!ok) {
        toast.error(t("admin.vanex.syncFailed"));
        return;
      }
      toast.success(t("admin.vanex.syncSuccess"));
      loadOrders();
    } catch (error) {
      console.error("Error syncing Vanex:", error);
      toast.error(t("admin.vanex.syncFailed"));
    } finally {
      setSyncingVanex(null);
    }
  };

  // مزامنة حالة التوصيل لكل طلبات Vanex في استدعاء جماعي واحد.
  const handleBulkSyncVanex = async () => {
    try {
      setBulkSyncingVanex(true);
      const result = await bulkSyncVanex();
      if (!result) {
        toast.error(t("admin.vanex.syncFailed"));
        return;
      }
      toast.success(
        t("admin.vanex.bulkSyncSuccess").replace("{count}", String(result.synced)),
      );
      loadOrders();
    } catch (error) {
      console.error("Error bulk-syncing Vanex:", error);
      toast.error(t("admin.vanex.syncFailed"));
    } finally {
      setBulkSyncingVanex(false);
    }
  };

  const handleCancelVanex = async (order: Order) => {
    if (!order.vanex_package_id) {
      toast.error(t("admin.vanex.missingPackageId"));
      return;
    }
    const confirmed = await confirm({
      title: t("admin.vanex.cancelTitle"),
      description: t("admin.vanex.cancelConfirm"),
      confirmLabel: t("admin.vanex.cancelAction"),
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      setCancellingVanex(order.id);
      const result = await cancelVanexPackage(order.vanex_package_id);
      if (!result?.cancelled) {
        toast.error(t("admin.vanex.cancelFailed"));
        return;
      }
      toast.success(t("admin.vanex.cancelSuccess"));
      await syncVanexOrder(order.id);
      loadOrders();
    } catch (error) {
      console.error("Error cancelling Vanex package:", error);
      toast.error(t("admin.vanex.cancelFailed"));
    } finally {
      setCancellingVanex(null);
    }
  };

  const handleRecallVanex = async (order: Order, reason?: string) => {
    if (!order.vanex_package_id) {
      toast.error(t("admin.vanex.missingPackageId"));
      return;
    }
    const confirmed = await confirm({
      title: t("admin.vanex.recallTitle"),
      description: t("admin.vanex.recallConfirm"),
      confirmLabel: t("admin.vanex.recallAction"),
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      setRecallingVanex(order.id);
      const ok = await recallVanexPackage(order.vanex_package_id, reason);
      if (!ok) {
        toast.error(t("admin.vanex.recallFailed"));
        return;
      }
      toast.success(t("admin.vanex.recallSuccess"));
      await syncVanexOrder(order.id);
      loadOrders();
    } catch (error) {
      console.error("Error recalling Vanex package:", error);
      toast.error(t("admin.vanex.recallFailed"));
    } finally {
      setRecallingVanex(null);
    }
  };

  const handleAcceptOrder = async (order: Order) => {
    const confirmed = await confirm({
      title: t("admin.confirmDialog.acceptOrder.title"),
      description: t("admin.confirm.acceptOrder"),
      confirmLabel: t("admin.confirmDialog.acceptOrder.confirm"),
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      setAcceptingOrder(order.id);

      // تحديث حالة الطلب إلى مقبول (accepted)
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "accepted",
          processed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // تحديث كميات المخزون لكل عنصر
      for (const item of order.items) {
        const { data: perfume, error: fetchError } = await supabase
          .from("perfumes")
          .select("stock_quantity")
          .eq("id", item.id)
          .single();

        if (fetchError) throw fetchError;

        const newStock = perfume.stock_quantity - item.quantity;

        // تحديث المخزون وتعيينه غير نشط إذا بلغ المخزون 0
        const { error: updateError } = await supabase
          .from("perfumes")
          .update({
            stock_quantity: newStock,
            is_active: newStock > 0,
          })
          .eq("id", item.id);

        if (updateError) throw updateError;
      }

      toast.success(t("admin.toast.orderAcceptedSuccess"));
      loadOrders();
      loadOrderStats();
      onStockMutated?.();
    } catch (error) {
      console.error("Error accepting order:", error);
      toast.error(t("admin.toast.orderAcceptFailed"));
    } finally {
      setAcceptingOrder(null);
    }
  };

  const handleBackOrder = async (order: Order) => {
    const confirmed = await confirm({
      title: t("admin.confirmDialog.returnOrder.title"),
      description: t("admin.confirm.returnOrder"),
      confirmLabel: t("admin.confirmDialog.returnOrder.confirm"),
      variant: "warning",
    });
    if (!confirmed) return;

    try {
      setReturningOrder(order.id);

      // تحديث حالة الطلب إلى مُرجَع (returned)
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "returned",
          processed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // تحديث كميات المخزون لكل عنصر (زيادة)
      for (const item of order.items) {
        const { data: perfume, error: fetchError } = await supabase
          .from("perfumes")
          .select("stock_quantity")
          .eq("id", item.id)
          .single();

        if (fetchError) throw fetchError;

        const newStock = perfume.stock_quantity + item.quantity;

        // تحديث المخزون وتعيينه نشطًا إذا كان غير نشط
        const { error: updateError } = await supabase
          .from("perfumes")
          .update({
            stock_quantity: newStock,
            is_active: true,
          })
          .eq("id", item.id);

        if (updateError) throw updateError;
      }

      toast.success(t("admin.toast.returnProcessedSuccess"));
      loadOrders();
      loadOrderStats();
      onStockMutated?.();
    } catch (error) {
      console.error("Error processing return:", error);
      toast.error(t("admin.toast.returnProcessFailed"));
    } finally {
      setReturningOrder(null);
    }
  };

  const handleViewOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setShowOrderDetails(true);
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setShowImageModal(true);
  };

  const handleStatusChange = async (
    order: Order,
    newStatus: Order["status"]
  ) => {
    try {
      setUpdatingOrderStatus(order.id);
      const success = await updateOrderStatus(order.id, newStatus);
      if (success) {
        toast.success(
          `${t("admin.toast.orderStatusUpdated")} ${t("admin.status." + newStatus)}`
        );
        loadOrders();
        loadOrderStats();
      } else {
        toast.error(t("admin.toast.orderStatusFailed"));
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      toast.error(t("admin.toast.orderStatusFailed"));
    } finally {
      setUpdatingOrderStatus(null);
    }
  };

  return {
    orders,
    orderStats,
    ordersLoading,
    selectedOrder,
    showOrderDetails,
    setShowOrderDetails,
    selectedImage,
    showImageModal,
    setShowImageModal,
    acceptingOrder,
    returningOrder,
    deletingOrder,
    sendingToVanex,
    syncingVanex,
    bulkSyncingVanex,
    cancellingVanex,
    recallingVanex,
    updatingOrderStatus,
    confirmDialogProps,
    loadOrders,
    loadOrderStats,
    handleDeleteOrder,
    handleSendToVanex,
    handleSyncVanex,
    handleBulkSyncVanex,
    handleCancelVanex,
    handleRecallVanex,
    handleAcceptOrder,
    handleBackOrder,
    handleViewOrderDetails,
    handleImageClick,
    handleStatusChange,
  };
}
