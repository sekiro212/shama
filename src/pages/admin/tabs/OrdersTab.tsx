import { useState, useMemo } from "react";
import {
  Eye,
  Check,
  RotateCcw,
  Trash2,
  Truck,
  MoreHorizontal,
  RefreshCw,
  ShoppingCart,
  Copy,
} from "lucide-react";
import { StatusBadge } from "../components/StatusBadge";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { PAYMENT_METHOD_STYLES } from "@/lib/orderUtils";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Order } from "@/services/ordersService";
import type { useOrders } from "../hooks/useOrders";
import { DataTable } from "../components/DataTable";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";

interface OrdersTabProps {
  ordersApi: ReturnType<typeof useOrders>;
}

export function OrdersTab({ ordersApi }: OrdersTabProps) {
  const { t, isRTL } = useLanguage();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const {
    orders,
    ordersLoading,
    updatingOrderStatus,
    syncingVanex,
    bulkSyncingVanex,
    confirmDialogProps,
    loadOrders,
    handleDeleteOrder,
    handleSendToVanex,
    handleSyncVanex,
    handleBulkSyncVanex,
    handleAcceptOrder,
    handleBackOrder,
    handleViewOrderDetails,
    handleStatusChange,
  } = ordersApi;

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  const columns: ColumnDef<Order>[] = [
    {
      accessorKey: "first_name",
      header: t("admin.table.customer"),
      cell: ({ row }) => (
        <span className="font-medium text-[#323D50] dark:text-white">
          {row.original.first_name} {row.original.last_name}
        </span>
      ),
    },
    {
      accessorKey: "total",
      header: t("admin.table.total"),
      cell: ({ row }) => (
        <span className="text-[#5B8DD9] font-semibold whitespace-nowrap">
          {row.original.total.toFixed(2)} LYD
        </span>
      ),
    },
    {
      accessorKey: "payment_method",
      header: t("admin.orderDetails.paymentMethod"),
      enableSorting: false,
      cell: ({ row }) => {
        const method = row.original.payment_method as keyof typeof PAYMENT_METHOD_STYLES;
        return (
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              PAYMENT_METHOD_STYLES[method] || PAYMENT_METHOD_STYLES.cod
            }`}
          >
            {method === "bank_transfer"
              ? t("admin.orderDetails.bankTransfer")
              : t("admin.orderDetails.cod")}
          </span>
        );
      },
    },
    {
      accessorKey: "order_date",
      header: t("admin.table.date"),
      cell: ({ row }) => (
        <span className="text-sm text-[#6B7B8D] dark:text-white/70 whitespace-nowrap">
          {new Date(row.original.order_date).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: t("admin.table.status"),
      enableSorting: false,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <Select
            value={order.status}
            onValueChange={(value) =>
              handleStatusChange(order, value as Order["status"])
            }
            disabled={updatingOrderStatus === order.id}
          >
            <SelectTrigger
              className={`h-8 w-[130px] text-xs cursor-pointer border-[#323D50]/15 dark:border-white/20 ${
                order.status === "delivered"
                  ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40"
                  : order.status === "shipped"
                  ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40"
                  : order.status === "processing"
                  ? "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/40"
                  : order.status === "confirmed" || order.status === "accepted"
                  ? "bg-[#5B8DD9]/20 text-[#5B8DD9] border-[#5B8DD9]/40"
                  : order.status === "returned"
                  ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/40"
                  : "bg-white dark:bg-white/5 text-[#6B7B8D] dark:text-white/60 border-[#323D50]/15 dark:border-white/20"
              }`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
              {(
                [
                  "pending",
                  "confirmed",
                  "processing",
                  "shipped",
                  "delivered",
                  "accepted",
                  "returned",
                ] as const
              ).map((s) => (
                <SelectItem
                  key={s}
                  value={s}
                  className="text-[#323D50] dark:text-white hover:bg-[#323D50]/10 dark:hover:bg-white/10 focus:bg-[#323D50]/10 dark:focus:bg-white/10 cursor-pointer"
                >
                  {t(`admin.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      },
    },
    {
      id: "vanex",
      header: "Vanex",
      enableSorting: false,
      cell: ({ row }) => {
        const order = row.original;
        const code = order.vanex_package_code;
        if (!code) {
          return <span className="text-[#6B7B8D] dark:text-white/30 text-xs">&mdash;</span>;
        }
        const vanexStatus = order.vanex_status;
        return (
          <div className="flex flex-col items-start gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(code);
                      toast.success("Package code copied!");
                    }}
                    className="inline-flex items-center gap-1.5 font-mono text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg px-2 py-1 transition-colors cursor-pointer"
                  >
                    {code}
                    <Copy className="w-3 h-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Click to copy</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            {vanexStatus && (
              <StatusBadge
                type="vanex"
                status={vanexStatus}
                label={t(`admin.vanex.statuses.${vanexStatus}`)}
              />
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => <span className="text-center w-full block">{t("admin.table.actions")}</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <div className="flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align={isRTL ? "start" : "end"}
                className="glass bg-white dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10"
              >
                <DropdownMenuItem
                  onClick={() => handleViewOrderDetails(order)}
                  className="cursor-pointer"
                >
                  <Eye className="w-4 h-4 me-2" /> {t("admin.orders.viewDetails")}
                </DropdownMenuItem>
                {!order.vanex_package_code && (
                  <DropdownMenuItem
                    onClick={() => handleSendToVanex(order)}
                    className="cursor-pointer"
                  >
                    <Truck className="w-4 h-4 me-2" /> Send to Vanex
                  </DropdownMenuItem>
                )}
                {order.vanex_package_code && (
                  <DropdownMenuItem
                    onClick={() => handleSyncVanex(order)}
                    className="cursor-pointer"
                    disabled={syncingVanex === order.id}
                  >
                    <RefreshCw
                      className={`w-4 h-4 me-2 ${syncingVanex === order.id ? "animate-spin" : ""}`}
                    />
                    {t("admin.vanex.syncNow")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => handleAcceptOrder(order)}
                  className="cursor-pointer text-green-600 dark:text-green-400"
                >
                  <Check className="w-4 h-4 me-2" /> {t("admin.orders.acceptOrder")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBackOrder(order)}
                  className="cursor-pointer text-yellow-600 dark:text-yellow-400"
                >
                  <RotateCcw className="w-4 h-4 me-2" /> {t("admin.orders.returnOrder")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleDeleteOrder(order.id)}
                  className="cursor-pointer text-red-600 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4 me-2" /> {t("admin.orders.deleteOrder")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-[#323D50] dark:text-white">
          {t("admin.ordersManagement")}
        </h2>
        <div className="flex gap-2 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-9 text-sm glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 cursor-pointer">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="glass bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
              <SelectItem value="all" className="cursor-pointer">
                All Statuses
              </SelectItem>
              {(
                [
                  "pending",
                  "confirmed",
                  "processing",
                  "shipped",
                  "delivered",
                  "accepted",
                  "returned",
                ] as const
              ).map((s) => (
                <SelectItem key={s} value={s} className="cursor-pointer capitalize">
                  {t(`admin.status.${s}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleBulkSyncVanex}
            variant="outline"
            size="sm"
            disabled={bulkSyncingVanex || syncingVanex !== null}
            className="h-9 border-[#323D50]/15 dark:border-white/20 cursor-pointer gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${bulkSyncingVanex ? "animate-spin" : ""}`} />
            <span className="hidden md:inline">{t("admin.vanex.syncAll")}</span>
          </Button>
          <Button
            onClick={loadOrders}
            variant="outline"
            size="icon"
            className="h-9 w-9 border-[#323D50]/15 dark:border-white/20 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${ordersLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        searchKey="first_name"
        searchPlaceholder={t("admin.table.customer") + "..."}
        pageSize={25}
        isLoading={ordersLoading}
        emptyState={{
          icon: ShoppingCart,
          title: t("admin.orders.noOrders"),
        }}
      />

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
