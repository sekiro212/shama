import {
  Plus,
  Edit,
  Trash2,
  Ticket,
  Power,
  ClipboardCheck,
  Copy,
  MoreHorizontal,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isPromoExpired, PromoCode } from "@/services/promoCodesService";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import type { useCoupons } from "../hooks/useCoupons";

interface CouponsTabProps {
  couponsApi: ReturnType<typeof useCoupons>;
}

export function CouponsTab({ couponsApi }: CouponsTabProps) {
  const { t, isRTL } = useLanguage();
  const {
    coupons,
    couponsLoading,
    togglingCoupon,
    deletingCoupon,
    activeCouponCount,
    totalCouponRedemptions,
    openCreateCoupon,
    openEditCoupon,
    handleToggleCoupon,
    handleDeleteCoupon,
    confirmDialogProps,
  } = couponsApi;

  const columns: ColumnDef<PromoCode>[] = [
    {
      accessorKey: "code",
      header: t("admin.coupons.table.code"),
      cell: ({ row }) => {
        const coupon = row.original;
        return (
          <button
            onClick={() => {
              navigator.clipboard.writeText(coupon.code);
              toast.success("Code copied!");
            }}
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="font-mono font-bold text-[#5B8DD9]">{coupon.code}</span>
            <Copy className="w-3 h-3 text-[#6B7B8D]" />
          </button>
        );
      },
    },
    {
      accessorKey: "discount_type",
      header: t("admin.coupons.table.type"),
      cell: ({ row }) => (
        <span className="text-[#323D50] dark:text-white/80 text-sm">
          {row.original.discount_type === "fixed"
            ? t("admin.coupons.fixed")
            : t("admin.coupons.percentage")}
        </span>
      ),
    },
    {
      id: "value",
      header: t("admin.coupons.table.value"),
      cell: ({ row }) => {
        const coupon = row.original;
        return (
          <span className="text-[#323D50] dark:text-white/80 text-sm">
            {coupon.discount_type === "fixed"
              ? `${coupon.discount_value.toFixed(2)} LYD`
              : `${coupon.discount_value}%${
                  coupon.max_discount ? ` (max ${coupon.max_discount.toFixed(2)})` : ""
                }`}
          </span>
        );
      },
    },
    {
      id: "scope",
      header: t("admin.coupons.table.scope"),
      cell: ({ row }) => {
        const coupon = row.original;
        return (
          <span className="text-[#323D50] dark:text-white/80 text-sm">
            {coupon.scope === "all_products"
              ? t("admin.coupons.scopeBadge.all")
              : t("admin.coupons.scopeBadge.specific").replace(
                  "{count}",
                  String(coupon.scope_product_ids.length)
                )}
          </span>
        );
      },
    },
    {
      id: "minOrder",
      header: t("admin.coupons.table.minOrder"),
      cell: ({ row }) => {
        const coupon = row.original;
        return (
          <span className="text-[#323D50] dark:text-white/80 text-sm">
            {coupon.min_order_total > 0
              ? `${coupon.min_order_total.toFixed(2)} LYD`
              : "\u2014"}
          </span>
        );
      },
    },
    {
      id: "status",
      header: t("admin.coupons.table.status"),
      cell: ({ row }) => {
        const coupon = row.original;
        const expired = isPromoExpired(coupon);
        const status = expired ? "expired" : coupon.is_active ? "active" : "inactive";
        return <StatusBadge status={status} type="coupon" />;
      },
    },
    {
      id: "expires",
      header: t("admin.coupons.table.expires"),
      cell: ({ row }) => {
        const coupon = row.original;
        if (!coupon.expires_at) {
          return <span className="text-[#6B7B8D] text-sm">{t("admin.coupons.never")}</span>;
        }
        const expiresDate = new Date(coupon.expires_at);
        const now = Date.now();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const expired = isPromoExpired(coupon);
        const expiringSoon = !expired && expiresDate.getTime() - now <= sevenDaysMs;
        return (
          <span
            className={`text-sm ${
              expired
                ? "text-red-500"
                : expiringSoon
                ? "text-amber-500 font-medium"
                : "text-[#323D50] dark:text-white/60"
            }`}
          >
            {expiresDate.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      id: "usage",
      header: t("admin.coupons.table.usage"),
      cell: ({ row }) => {
        const coupon = row.original;
        const usagePercent = coupon.usage_limit
          ? (coupon.usage_count / coupon.usage_limit) * 100
          : 0;
        const progressColor =
          usagePercent > 80
            ? "[&>div]:bg-red-500"
            : usagePercent > 50
            ? "[&>div]:bg-amber-500"
            : "[&>div]:bg-green-500";
        return (
          <div className="space-y-1 min-w-[80px]">
            <span className="text-xs font-mono text-[#323D50] dark:text-white/80">
              {coupon.usage_count}/{coupon.usage_limit ?? "\u221E"}
            </span>
            {coupon.usage_limit && (
              <Progress
                value={usagePercent}
                className={`h-1.5 ${progressColor}`}
              />
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: t("admin.coupons.table.actions"),
      enableSorting: false,
      cell: ({ row }) => {
        const coupon = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isRTL ? "start" : "end"}>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => openEditCoupon(coupon)}
              >
                <Edit className="w-4 h-4" />
                {t("admin.coupons.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => handleToggleCoupon(coupon)}
                disabled={togglingCoupon === coupon.id}
              >
                <Power className="w-4 h-4" />
                {coupon.is_active
                  ? t("admin.coupons.deactivate")
                  : t("admin.coupons.activate")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-red-500 focus:text-red-500"
                onClick={() => handleDeleteCoupon(coupon.id)}
                disabled={deletingCoupon === coupon.id}
              >
                <Trash2 className="w-4 h-4" />
                {t("admin.confirmDialog.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title={t("admin.coupons.stats.total")}
          value={coupons.length}
          icon={Ticket}
          iconColor="text-[#5B8DD9]"
        />
        <StatCard
          title={t("admin.coupons.stats.active")}
          value={activeCouponCount}
          icon={Power}
          iconColor="text-green-500"
        />
        <StatCard
          title={t("admin.coupons.stats.redemptions")}
          value={totalCouponRedemptions}
          icon={ClipboardCheck}
          iconColor="text-[#5B8DD9]"
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[#323D50] dark:text-[#F5F5F5]">
          {t("admin.coupons.title")}
        </h2>
        <Button
          onClick={openCreateCoupon}
          className="bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white cursor-pointer"
        >
          <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
          {t("admin.coupons.add")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={coupons}
        searchKey="code"
        searchPlaceholder="Search by code..."
        pageSize={25}
        isLoading={couponsLoading}
        emptyState={{
          icon: Ticket,
          title: t("admin.coupons.empty"),
        }}
      />

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
