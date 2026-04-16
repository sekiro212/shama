import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  fetchOrders,
  getOrderStats,
  deleteOrder,
  updateOrderStatus,
  saveVanexPackageCode,
  Order,
  OrderStats,
} from "@/services/ordersService";
import { createVanexPackage } from "@/services/vanexService";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConfirmDialog } from "./useConfirmDialog";

interface UseOrdersOptions {
  onStockMutated?: () => void;
}

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
  const [updatingOrderStatus, setUpdatingOrderStatus] = useState<string | null>(
    null
  );

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

  const loadOrderStats = async () => {
    try {
      const stats = await getOrderStats();
      setOrderStats(stats);
    } catch (error) {
      console.error("Error loading order stats:", error);
    }
  };

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
      const packageCode = await createVanexPackage(order);

      if (!packageCode) {
        toast.error(t("admin.vanex.sendFailed"));
        return;
      }

      const saved = await saveVanexPackageCode(order.id, packageCode);
      if (!saved) {
        toast.error(t("admin.vanex.saveFailed").replace("{code}", packageCode));
        return;
      }

      toast.success(t("admin.vanex.sendSuccess").replace("{code}", packageCode));
      loadOrders();
      loadOrderStats();
    } catch (error) {
      console.error("Error sending to Vanex:", error);
      toast.error(t("admin.vanex.sendError"));
    } finally {
      setSendingToVanex(null);
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

      // Update order status to accepted
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "accepted",
          processed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Update stock quantities for each item
      for (const item of order.items) {
        const { data: perfume, error: fetchError } = await supabase
          .from("perfumes")
          .select("stock_quantity")
          .eq("id", item.id)
          .single();

        if (fetchError) throw fetchError;

        const newStock = perfume.stock_quantity - item.quantity;

        // Update stock and set inactive if stock reaches 0
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

      // Update order status to returned
      const { error: orderError } = await supabase
        .from("orders")
        .update({
          status: "returned",
          processed_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (orderError) throw orderError;

      // Update stock quantities for each item (increase)
      for (const item of order.items) {
        const { data: perfume, error: fetchError } = await supabase
          .from("perfumes")
          .select("stock_quantity")
          .eq("id", item.id)
          .single();

        if (fetchError) throw fetchError;

        const newStock = perfume.stock_quantity + item.quantity;

        // Update stock and set active if it was inactive
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
    updatingOrderStatus,
    confirmDialogProps,
    loadOrders,
    loadOrderStats,
    handleDeleteOrder,
    handleSendToVanex,
    handleAcceptOrder,
    handleBackOrder,
    handleViewOrderDetails,
    handleImageClick,
    handleStatusChange,
  };
}
