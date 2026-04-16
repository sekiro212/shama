import {
  Plus,
  Edit,
  Trash2,
  Ticket,
  Power,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { isPromoExpired } from "@/services/promoCodesService";
import { useLanguage } from "@/contexts/LanguageContext";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">
                  {t("admin.coupons.stats.total")}
                </p>
                <p className="text-2xl font-bold text-[#323D50] dark:text-white">
                  {coupons.length}
                </p>
              </div>
              <Ticket className="w-8 h-8 text-[#5B8DD9]" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">
                  {t("admin.coupons.stats.active")}
                </p>
                <p className="text-2xl font-bold text-green-500">
                  {activeCouponCount}
                </p>
              </div>
              <Power className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-[#323D50]/10 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[#6B7B8D] dark:text-white/60 text-sm">
                  {t("admin.coupons.stats.redemptions")}
                </p>
                <p className="text-2xl font-bold text-[#323D50] dark:text-white">
                  {totalCouponRedemptions}
                </p>
              </div>
              <ClipboardCheck className="w-8 h-8 text-[#5B8DD9]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b dark:border-white/10 border-[#323D50]/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#323D50] dark:text-[#F5F5F5]">
            {t("admin.coupons.title")}
          </h2>
          <Button
            onClick={openCreateCoupon}
            className="bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
          >
            <Plus className={`w-4 h-4 ${isRTL ? "ms-2" : "me-2"}`} />
            {t("admin.coupons.add")}
          </Button>
        </div>
        {couponsLoading ? (
          <div className="text-center py-8 text-[#6B7B8D]">
            {t("admin.loadingTitle")}
          </div>
        ) : coupons.length === 0 ? (
          <p className="text-center text-[#6B7B8D] py-12">
            {t("admin.coupons.empty")}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="dark:border-white/10 border-[#323D50]/10">
                  <TableHead className="text-[#323D50] dark:text-white/80">
                    {t("admin.coupons.table.code")}
                  </TableHead>
                  <TableHead className="text-[#323D50] dark:text-white/80">
                    {t("admin.coupons.table.type")}
                  </TableHead>
                  <TableHead className="text-[#323D50] dark:text-white/80">
                    {t("admin.coupons.table.value")}
                  </TableHead>
                  <TableHead className="text-[#323D50] dark:text-white/80">
                    {t("admin.coupons.table.scope")}
                  </TableHead>
                  <TableHead className="text-[#323D50] dark:text-white/80">
                    {t("admin.coupons.table.minOrder")}
                  </TableHead>
                  <TableHead className="text-[#323D50] dark:text-white/80">
                    {t("admin.coupons.table.status")}
                  </TableHead>
                  <TableHead className="text-[#323D50] dark:text-white/80">
                    {t("admin.coupons.table.expires")}
                  </TableHead>
                  <TableHead className="text-[#323D50] dark:text-white/80">
                    {t("admin.coupons.table.usage")}
                  </TableHead>
                  <TableHead className="text-[#323D50] dark:text-white/80 text-right">
                    {t("admin.coupons.table.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => {
                  const expired = isPromoExpired(coupon);
                  const statusLabel = expired
                    ? t("admin.coupons.status.expired")
                    : coupon.is_active
                    ? t("admin.coupons.status.active")
                    : t("admin.coupons.status.inactive");
                  const statusClass = expired
                    ? "bg-red-500/20 text-red-400"
                    : coupon.is_active
                    ? "bg-green-500/20 text-green-400"
                    : "bg-amber-500/20 text-amber-400";
                  return (
                    <TableRow
                      key={coupon.id}
                      className="dark:border-white/10 border-[#323D50]/10"
                    >
                      <TableCell className="font-mono font-bold text-[#5B8DD9]">
                        {coupon.code}
                      </TableCell>
                      <TableCell className="text-[#323D50] dark:text-white/80">
                        {coupon.discount_type === "fixed"
                          ? t("admin.coupons.fixed")
                          : t("admin.coupons.percentage")}
                      </TableCell>
                      <TableCell className="text-[#323D50] dark:text-white/80">
                        {coupon.discount_type === "fixed"
                          ? `${coupon.discount_value.toFixed(2)} LYD`
                          : `${coupon.discount_value}%${
                              coupon.max_discount
                                ? ` (max ${coupon.max_discount.toFixed(2)})`
                                : ""
                            }`}
                      </TableCell>
                      <TableCell className="text-[#323D50] dark:text-white/80 text-sm">
                        {coupon.scope === "all_products"
                          ? t("admin.coupons.scopeBadge.all")
                          : t("admin.coupons.scopeBadge.specific").replace(
                              "{count}",
                              String(coupon.scope_product_ids.length)
                            )}
                      </TableCell>
                      <TableCell className="text-[#323D50] dark:text-white/80 text-sm">
                        {coupon.min_order_total > 0
                          ? `${coupon.min_order_total.toFixed(2)} LYD`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusClass}>
                          {statusLabel}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[#323D50] dark:text-white/60 text-sm">
                        {coupon.expires_at
                          ? new Date(
                              coupon.expires_at
                            ).toLocaleDateString()
                          : t("admin.coupons.never")}
                      </TableCell>
                      <TableCell className="text-[#323D50] dark:text-white/80 text-sm font-mono">
                        {coupon.usage_count}/
                        {coupon.usage_limit ?? t("admin.coupons.unlimited")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditCoupon(coupon)}
                            className="h-8 w-8 p-0 text-[#5B8DD9] hover:bg-[#5B8DD9]/10"
                            title={t("admin.coupons.edit")}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            loading={togglingCoupon === coupon.id}
                            loadingText=""
                            onClick={() => handleToggleCoupon(coupon)}
                            className="h-8 w-8 p-0 text-amber-500 hover:bg-amber-500/10"
                            title={
                              coupon.is_active
                                ? t("admin.coupons.deactivate")
                                : t("admin.coupons.activate")
                            }
                          >
                            <Power className="w-4 h-4" />
                          </LoadingButton>
                          <LoadingButton
                            variant="ghost"
                            size="sm"
                            loading={deletingCoupon === coupon.id}
                            loadingText=""
                            onClick={() => handleDeleteCoupon(coupon.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10"
                            title={t("admin.coupons.confirm.delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </LoadingButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
