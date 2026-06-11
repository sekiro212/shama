import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar as arLocale } from "date-fns/locale";
import { Eye, RefreshCw, Truck, Ban, Undo2, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { PAYMENT_METHOD_STYLES } from "@/lib/orderUtils";
import { canCancelVanex, canRecallVanex } from "@/lib/vanexStatus";
import type { Order } from "@/services/ordersService";
import type { useOrders } from "../hooks/useOrders";
import { StatusBadge } from "../components/StatusBadge";
import { vanexStatusLabel } from "../constants";

type VanexActions = Pick<
  ReturnType<typeof useOrders>,
  | "handleSyncVanex"
  | "handleCancelVanex"
  | "handleRecallVanex"
  | "syncingVanex"
  | "cancellingVanex"
  | "recallingVanex"
>;

interface OrderDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onImageClick: (imageUrl: string) => void;
  vanexActions?: VanexActions;
}

export function OrderDetailsDialog({
  open,
  onOpenChange,
  order,
  onImageClick,
  vanexActions,
}: OrderDetailsDialogProps) {
  const { t, language } = useLanguage();
  const [recallOpen, setRecallOpen] = useState(false);
  const [recallReason, setRecallReason] = useState("");

  const vanexStatus = order?.vanex_status ?? null;
  const hasPackageId = Boolean(order?.vanex_package_id);
  const canSync = Boolean(order?.vanex_package_code) && Boolean(vanexActions);
  const canCancel = hasPackageId && canCancelVanex(vanexStatus) && Boolean(vanexActions);
  const canRecall = hasPackageId && canRecallVanex(vanexStatus) && Boolean(vanexActions);

  const isSyncing = order ? vanexActions?.syncingVanex === order.id : false;
  const isCancelling = order ? vanexActions?.cancellingVanex === order.id : false;
  const isRecalling = order ? vanexActions?.recallingVanex === order.id : false;

  const sortedLogs = useMemo(() => {
    if (!order?.vanex_logs?.length) return [];
    return [...order.vanex_logs].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [order?.vanex_logs]);

  const lastSyncedLabel = order?.vanex_last_synced_at
    ? formatDistanceToNow(new Date(order.vanex_last_synced_at), {
        addSuffix: true,
        locale: language === "ar" ? arLocale : undefined,
      })
    : t("admin.vanex.neverSynced");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text text-xl">
            {t("admin.orderDetails.title")}
          </DialogTitle>
        </DialogHeader>

        {order && (
          <div className="space-y-6">
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="text-[#323D50] dark:text-white text-lg">
                    {t("admin.orderDetails.customerInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.nameLabel")}</span>
                    <span className="text-[#323D50] dark:text-white font-medium">
                      {order.first_name} {order.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.emailLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">{order.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.phoneLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">{order.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.cityLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">{order.city}</span>
                  </div>
                  {order.place_name && (
                    <div className="flex justify-between">
                      <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.placeNameLabel")}</span>
                      <span className="text-[#323D50] dark:text-white">
                        {order.place_name}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
                <CardHeader>
                  <CardTitle className="text-[#323D50] dark:text-white text-lg">
                    {t("admin.orderDetails.orderInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.orderIdLabel")}</span>
                    <span className="text-[#323D50] dark:text-white font-mono text-sm">
                      {order.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.orderDateLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">
                      {new Date(order.order_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.totalItemsLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">
                      {order.items.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.totalAmountLabel")}</span>
                    <span className="text-[#5B8DD9] font-bold text-lg">
                      {order.total.toFixed(2)} LYD
                    </span>
                  </div>
                  {(order.delivery_fee ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.deliveryFee")}</span>
                      <span className="text-[#323D50] dark:text-white">
                        {order.delivery_fee?.toFixed(2)} LYD
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.paymentMethod")}</span>
                    <span className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${PAYMENT_METHOD_STYLES[order.payment_method as keyof typeof PAYMENT_METHOD_STYLES] || PAYMENT_METHOD_STYLES.cod}`}>
                      {order.payment_method === "bank_transfer"
                        ? t("admin.orderDetails.bankTransfer")
                        : t("admin.orderDetails.cod")}
                    </span>
                  </div>
                  {order.payment_method === "bank_transfer" && (
                    <div className="mt-3 pt-3 border-t border-[#323D50]/10 dark:border-white/10">
                      <span className="text-[#6B7B8D] dark:text-white/60 text-sm">{t("admin.orderDetails.transferProof")}</span>
                      {order.transfer_proof_url ? (
                        <a
                          href={order.transfer_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-2"
                        >
                          <img
                            src={order.transfer_proof_url}
                            alt="Transfer proof"
                            className="w-full max-h-64 object-contain rounded-lg border dark:border-white/10 border-[#323D50]/10 hover:opacity-90 transition-opacity cursor-pointer"
                          />
                          <p className="text-xs text-[#5B8DD9] mt-1 hover:underline">{t("admin.orderDetails.viewProof")}</p>
                        </a>
                      ) : (
                        <p className="text-xs text-[#6B7B8D] dark:text-white/40 mt-1 italic">{t("admin.orderDetails.noProof")}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {order.vanex_package_code && (
              <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-[#323D50] dark:text-white text-lg flex items-center gap-2">
                    <Truck className="w-5 h-5 text-[#5B8DD9]" />
                    {t("admin.vanex.trackingTitle")}
                  </CardTitle>
                  {canSync && (
                    <Button
                      onClick={() => vanexActions?.handleSyncVanex(order)}
                      variant="outline"
                      size="sm"
                      disabled={isSyncing}
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                      {t("admin.vanex.syncNow")}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#6B7B8D] dark:text-white/60 text-sm">
                        {t("admin.vanex.currentStatus")}
                      </span>
                      {vanexStatus ? (
                        <StatusBadge
                          type="vanex"
                          status={vanexStatus}
                          label={vanexStatusLabel(t, vanexStatus)}
                        />
                      ) : (
                        <span className="text-[#6B7B8D] dark:text-white/40 text-sm italic">
                          {t("admin.vanex.neverSynced")}
                        </span>
                      )}
                    </div>
                    {order.vanex_current_location && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#6B7B8D] dark:text-white/60 text-sm">
                          {t("admin.vanex.currentLocation")}
                        </span>
                        <span className="text-[#323D50] dark:text-white text-sm">
                          {order.vanex_current_location}
                        </span>
                      </div>
                    )}
                    {order.vanex_estimated_delivery && (
                      <div className="flex justify-between items-center">
                        <span className="text-[#6B7B8D] dark:text-white/60 text-sm">
                          {t("admin.vanex.estimatedDelivery")}
                        </span>
                        <span className="text-[#323D50] dark:text-white text-sm">
                          {new Date(order.vanex_estimated_delivery).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-[#6B7B8D] dark:text-white/60 text-sm">
                        {t("admin.vanex.lastSynced")}
                      </span>
                      <span className="text-[#323D50] dark:text-white text-sm flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#6B7B8D] dark:text-white/40" />
                        {lastSyncedLabel}
                      </span>
                    </div>
                  </div>

                  {sortedLogs.length > 0 && (
                    <div className="pt-3 border-t border-[#323D50]/10 dark:border-white/10">
                      <h4 className="text-sm font-medium text-[#323D50] dark:text-white mb-2">
                        {t("admin.vanex.history")}
                      </h4>
                      <div className="space-y-2 max-h-52 overflow-y-auto">
                        {sortedLogs.map((logEntry) => (
                          <div
                            key={logEntry.id}
                            className="flex items-start gap-3 text-sm"
                          >
                            <div className="mt-1.5 w-2 h-2 rounded-full bg-[#5B8DD9] flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge
                                  type="vanex"
                                  status={logEntry.status}
                                  label={vanexStatusLabel(t, logEntry.status)}
                                />
                                <span className="text-xs text-[#6B7B8D] dark:text-white/40">
                                  {new Date(logEntry.created_at).toLocaleString()}
                                </span>
                              </div>
                              {(logEntry.description || logEntry.location) && (
                                <p className="text-xs text-[#6B7B8D] dark:text-white/60 mt-0.5">
                                  {logEntry.description}
                                  {logEntry.location ? ` — ${logEntry.location}` : ""}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(canCancel || canRecall) && !recallOpen && (
                    <div className="pt-3 border-t border-[#323D50]/10 dark:border-white/10 flex gap-2 flex-wrap">
                      {canCancel && (
                        <Button
                          onClick={() => vanexActions?.handleCancelVanex(order)}
                          variant="outline"
                          size="sm"
                          disabled={isCancelling}
                          className="gap-2 text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                        >
                          <Ban className="w-4 h-4" />
                          {t("admin.vanex.cancelAction")}
                        </Button>
                      )}
                      {canRecall && (
                        <Button
                          onClick={() => setRecallOpen(true)}
                          variant="outline"
                          size="sm"
                          disabled={isRecalling}
                          className="gap-2 text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                        >
                          <Undo2 className="w-4 h-4" />
                          {t("admin.vanex.recallAction")}
                        </Button>
                      )}
                    </div>
                  )}

                  {canRecall && recallOpen && (
                    <div className="pt-3 border-t border-[#323D50]/10 dark:border-white/10 space-y-2">
                      <label className="text-sm text-[#6B7B8D] dark:text-white/60">
                        {t("admin.vanex.recallReason")}
                      </label>
                      <Input
                        value={recallReason}
                        onChange={(e) => setRecallReason(e.target.value)}
                        placeholder={t("admin.vanex.recallReason")}
                        className="bg-white dark:bg-white/5"
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            await vanexActions?.handleRecallVanex(
                              order,
                              recallReason.trim() || undefined,
                            );
                            setRecallOpen(false);
                            setRecallReason("");
                          }}
                          size="sm"
                          disabled={isRecalling}
                          className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                        >
                          <Undo2 className="w-4 h-4" />
                          {t("admin.vanex.recallAction")}
                        </Button>
                        <Button
                          onClick={() => {
                            setRecallOpen(false);
                            setRecallReason("");
                          }}
                          variant="ghost"
                          size="sm"
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-[#323D50] dark:text-white text-lg">
                  {t("admin.orderDetails.orderItems")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 bg-white dark:bg-white/5 rounded-lg border border-[#323D50]/10 dark:border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <div
                          className="relative group cursor-pointer"
                          onClick={() => onImageClick(item.image)}
                        >
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-md border border-[#323D50]/15 dark:border-white/20 transition-transform group-hover:scale-105"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src =
                                "https://via.placeholder.com/80x80/333/fff?text=No+Image";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-md"></div>
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                            <Eye className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[#323D50] dark:text-white font-medium text-lg truncate">
                          {item.name}
                        </h4>
                        <p className="text-[#6B7B8D] dark:text-white/60 text-sm">{item.size}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            ID: {item.id.slice(0, 8)}...
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="mb-2">
                          <p className="text-[#6B7B8D] dark:text-white/60 text-sm">
                            {t("admin.orderDetails.quantity")}{" "}
                            <span className="text-[#323D50] dark:text-white font-medium">
                              {item.quantity}
                            </span>
                          </p>
                          <p className="text-[#5B8DD9] font-semibold">
                            {item.price.toFixed(2)} {t("admin.orderDetails.eachSuffix")}
                          </p>
                        </div>
                        <div className="bg-[#5B8DD9]/10 px-3 py-1 rounded-md">
                          <p className="text-[#323D50] dark:text-white font-medium">
                            {t("admin.orderDetails.subtotal")} {(item.price * item.quantity).toFixed(2)}{" "}
                            LYD
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="mt-6 pt-4 border-t border-[#323D50]/10 dark:border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.totalItemsLabel")}</span>
                    <span className="text-[#323D50] dark:text-white">
                      {order.items.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}
                    </span>
                  </div>
                  {(order.delivery_fee ?? 0) > 0 && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.deliveryFee")}</span>
                      <span className="text-[#323D50] dark:text-white">
                        {order.delivery_fee?.toFixed(2)} LYD
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[#6B7B8D] dark:text-white/60">{t("admin.orderDetails.orderTotal")}</span>
                    <span className="text-[#5B8DD9] font-bold text-xl">
                      {order.total.toFixed(2)} LYD
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
