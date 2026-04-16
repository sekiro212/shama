import {
  Eye,
  Check,
  RotateCcw,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { PAYMENT_METHOD_STYLES } from "@/lib/orderUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Order } from "@/services/ordersService";
import type { useOrders } from "../hooks/useOrders";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";

interface OrdersTabProps {
  ordersApi: ReturnType<typeof useOrders>;
}

export function OrdersTab({ ordersApi }: OrdersTabProps) {
  const { t } = useLanguage();
  const {
    orders,
    ordersLoading,
    acceptingOrder,
    returningOrder,
    deletingOrder,
    sendingToVanex,
    updatingOrderStatus,
    confirmDialogProps,
    loadOrders,
    handleDeleteOrder,
    handleSendToVanex,
    handleAcceptOrder,
    handleBackOrder,
    handleViewOrderDetails,
    handleStatusChange,
  } = ordersApi;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#323D50] dark:text-white">
          {t("admin.ordersManagement")}
        </h2>
        <Button
          onClick={loadOrders}
          variant="outline"
          className="border-[#323D50]/15 dark:border-white/20 text-white hover:bg-white/10"
        >
          {t("admin.refreshOrders")}
        </Button>
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow className="border-[#323D50]/10 dark:border-white/10">
                <TableHead className="text-[#323D50] dark:text-white/80">
                  {t("admin.table.orderId")}
                </TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">
                  {t("admin.table.customer")}
                </TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.email")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.phone")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.city")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">
                  {t("admin.table.placeName")}
                </TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.total")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.orderDetails.paymentMethod")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.date")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.items")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">{t("admin.table.status")}</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80">Vanex Code</TableHead>
                <TableHead className="text-[#323D50] dark:text-white/80 text-center">
                  {t("admin.table.actions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordersLoading ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <div className="text-[#6B7B8D] dark:text-white/60">
                      {t("admin.orders.loadingOrders")}
                    </div>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11} className="text-center py-8">
                    <div className="text-[#6B7B8D] dark:text-white/60">{t("admin.orders.noOrders")}</div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="border-[#323D50]/10 dark:border-white/10">
                    <TableCell className="text-[#323D50] dark:text-white font-mono text-sm">
                      {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-[#323D50] dark:text-white font-medium">
                      {order.first_name} {order.last_name}
                    </TableCell>
                    <TableCell className="text-[#323D50] dark:text-white/80">
                      {order.email}
                    </TableCell>
                    <TableCell className="text-[#323D50] dark:text-white/80">
                      {order.phone}
                    </TableCell>
                    <TableCell className="text-[#323D50] dark:text-white/80">
                      {order.city}
                    </TableCell>
                    <TableCell className="text-[#323D50] dark:text-white/80">
                      {order.place_name || "-"}
                    </TableCell>
                    <TableCell className="text-[#5B8DD9] font-semibold">
                      {order.total.toFixed(2)} LYD
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${PAYMENT_METHOD_STYLES[order.payment_method as keyof typeof PAYMENT_METHOD_STYLES] || PAYMENT_METHOD_STYLES.cod}`}>
                        {order.payment_method === "bank_transfer" ? t("admin.orderDetails.bankTransfer") : t("admin.orderDetails.cod")}
                      </span>
                    </TableCell>
                    <TableCell className="text-[#323D50] dark:text-white/80">
                      {new Date(order.order_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-[#323D50] dark:text-white/80">
                      {order.items.length} {t("admin.orders.itemCount")}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          handleStatusChange(order, value as Order["status"])
                        }
                        disabled={updatingOrderStatus === order.id}
                      >
                        <SelectTrigger className={`h-8 w-[130px] text-xs border-[#323D50]/15 dark:border-white/20 ${
                          order.status === "delivered"
                            ? "bg-green-500/20 text-green-400 border-green-500/40"
                            : order.status === "shipped"
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/40"
                            : order.status === "processing"
                            ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                            : order.status === "confirmed" || order.status === "accepted"
                            ? "bg-white/50/20 text-[#5B8DD9] border-[#5B8DD9]/40"
                            : order.status === "returned"
                            ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                            : "bg-white dark:bg-white/5 text-[#6B7B8D] dark:text-white/60 border-[#323D50]/15 dark:border-white/20"
                        }`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                          <SelectItem value="pending" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.pending")}</SelectItem>
                          <SelectItem value="confirmed" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.confirmed")}</SelectItem>
                          <SelectItem value="processing" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.processing")}</SelectItem>
                          <SelectItem value="shipped" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.shipped")}</SelectItem>
                          <SelectItem value="delivered" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.delivered")}</SelectItem>
                          <SelectItem value="accepted" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.accepted")}</SelectItem>
                          <SelectItem value="returned" className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10">{t("admin.status.returned")}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {order.vanex_package_code ? (
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(order.vanex_package_code!);
                            toast.success("Package code copied!");
                          }}
                          className="font-mono text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg px-2 py-1 transition-colors"
                          title="Click to copy"
                        >
                          {order.vanex_package_code}
                        </button>
                      ) : (
                        <span className="text-[#6B7B8D] dark:text-white/30 text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewOrderDetails(order)}
                          className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-blue-500/20 hover:border-blue-500/40 transition-colors"
                          title={t("admin.orders.viewDetails")}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                        {/* Send to Vanex */}
                        {!order.vanex_package_code && (
                          <LoadingButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleSendToVanex(order)}
                            loading={sendingToVanex === order.id}
                            loadingText=""
                            className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-[#5B8DD9]/20 hover:border-[#5B8DD9]/40 transition-colors"
                            title="Send to Vanex"
                          >
                            <Truck className="w-3 h-3" />
                          </LoadingButton>
                        )}
                        <LoadingButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcceptOrder(order)}
                          loading={acceptingOrder === order.id}
                          loadingText=""
                          className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-green-500/20 hover:border-green-500/40 transition-colors"
                          title={t("admin.orders.acceptOrder")}
                        >
                          <Check className="w-3 h-3" />
                        </LoadingButton>
                        <LoadingButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleBackOrder(order)}
                          loading={returningOrder === order.id}
                          loadingText=""
                          className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-yellow-500/20 hover:border-yellow-500/40 transition-colors"
                          title={t("admin.orders.returnOrder")}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </LoadingButton>
                        <LoadingButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteOrder(order.id)}
                          loading={deletingOrder === order.id}
                          loadingText=""
                          className="h-8 px-3 border-[#323D50]/15 dark:border-white/20 text-white hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                          title={t("admin.orders.deleteOrder")}
                        >
                          <Trash2 className="w-3 h-3" />
                        </LoadingButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
