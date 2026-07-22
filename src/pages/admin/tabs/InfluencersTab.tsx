/**
 * ملف: InfluencersTab.tsx
 * الدور: جدول المشاهير في لوحة التحكم. صف لكل مشهور مع أرقامه المجمَّعة
 * (أكواد، طلبات، مبيعات، عمولة، مدفوع، متبقٍ) وأزرار الحساب/التعديل/الحذف.
 * مكوّن عرض محض — كل الحالة تأتي من الـ hook `useInfluencers`.
 */
import { Plus, Receipt, Pencil, Trash2, Megaphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { useInfluencers } from "../hooks/useInfluencers";
import { StatCard } from "../components/StatCard";
import { StatusBadge } from "../components/StatusBadge";
import { TableSkeleton } from "../components/TableSkeleton";
import { EmptyState } from "../components/EmptyState";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";

interface InfluencersTabProps {
  influencersApi: ReturnType<typeof useInfluencers>;
}

export function InfluencersTab({ influencersApi }: InfluencersTabProps) {
  const { t } = useLanguage();
  const {
    summaries,
    summariesLoading,
    totalCommission,
    totalBalance,
    deletingId,
    openCreate,
    openEdit,
    handleDelete,
    openStatement,
    confirmDialogProps,
  } = influencersApi;

  // تنسيق موحّد للمبالغ بالدينار الليبي بمنزلتين عشريتين، مطابق لـ CouponsTab.tsx.
  const money = (n: number) => `${n.toFixed(2)} LYD`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold gradient-text">
            {t("admin.influencers.title")}
          </h1>
          <p className="text-sm text-[#6B7B8D]">
            {t("admin.influencers.subtitle")}
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4 me-1.5" />
          {t("admin.influencers.create")}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title={t("admin.influencers.commissionEarned")}
          value={money(totalCommission)}
          icon={Receipt}
          iconColor="text-green-500"
        />
        <StatCard
          title={t("admin.influencers.balanceDue")}
          value={money(totalBalance)}
          icon={Wallet}
          iconColor="text-[#5B8DD9]"
        />
      </div>

      {summariesLoading ? (
        <TableSkeleton columns={8} />
      ) : summaries.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={t("admin.influencers.empty")}
          subtitle={t("admin.influencers.emptyHint")}
          action={{
            label: t("admin.influencers.create"),
            onClick: openCreate,
          }}
        />
      ) : (
        <div className="glass-card p-0 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[#6B7B8D] border-b border-[#323D50]/10 dark:border-white/10">
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.name")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.codesCount")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.ordersCount")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.grossSales")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.commissionEarned")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.totalPaid")}
                </th>
                <th className="text-start p-3 font-medium">
                  {t("admin.influencers.balanceDue")}
                </th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {summaries.map((row) => (
                <tr
                  key={row.influencer_id}
                  className="border-b border-[#323D50]/5 dark:border-white/5 text-[#323D50] dark:text-[#F5F5F5]"
                >
                  <td className="p-3 font-medium">
                    <span className="flex items-center gap-2">
                      {row.name}
                      {!row.is_active && (
                        <StatusBadge
                          status="inactive"
                          type="coupon"
                          label={t("admin.influencers.inactive")}
                        />
                      )}
                    </span>
                  </td>
                  <td className="p-3">{row.codes_count}</td>
                  <td className="p-3">{row.orders_count}</td>
                  <td className="p-3">{money(row.gross_sales)}</td>
                  <td className="p-3">{money(row.commission_earned)}</td>
                  <td className="p-3">{money(row.total_paid)}</td>
                  {/* المتبقي هو الرقم الذي يهم عند الدفع، فيُبرز */}
                  <td className="p-3 font-bold text-[#5B8DD9]">
                    {money(row.balance_due)}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openStatement(row)}
                        className="rounded-lg cursor-pointer"
                      >
                        <Receipt className="w-4 h-4 me-1" />
                        {t("admin.influencers.viewStatement")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(row.influencer_id)}
                        className="rounded-lg cursor-pointer"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={deletingId === row.influencer_id}
                        onClick={() => handleDelete(row.influencer_id)}
                        className="rounded-lg text-red-500 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* نافذة التأكيد تُركَّب داخل الـ tab، مطابقةً لنمط CouponsTab.tsx:322 */}
      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}
