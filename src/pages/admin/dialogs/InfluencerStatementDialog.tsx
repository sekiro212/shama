/**
 * InfluencerStatementDialog.tsx
 * -----------------------------
 * قائمة حساب مشهور واحد: تفصيل الأكواد (طلبات/مبيعات/عمولة لكل كود)
 * وسجلّ الدفعات مع نموذج تسجيل دفعة جديدة.
 * مكوّن عرض محض — كل الحالة من الـ hook `useInfluencers`.
 *
 * ملاحظة: قد يظهر الكود الواحد في صفّين إذا عُدِّلت نسبة عمولته أثناء
 * الحملة — صف لكل نسبة، بمجموعه الصحيح.
 */
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingButton } from "@/components/ui/loading-button";
import { useLanguage } from "@/contexts/LanguageContext";
import type { useInfluencers } from "../hooks/useInfluencers";

interface InfluencerStatementDialogProps {
  influencersApi: ReturnType<typeof useInfluencers>;
}

export function InfluencerStatementDialog({
  influencersApi,
}: InfluencerStatementDialogProps) {
  const { t } = useLanguage();
  const {
    isStatementOpen,
    setIsStatementOpen,
    statementInfluencer,
    codeStats,
    payouts,
    statementLoading,
    payoutForm,
    setPayoutForm,
    payoutError,
    payoutSubmitLoading,
    handleRecordPayout,
  } = influencersApi;

  // تنسيق موحّد للمبالغ بالدينار الليبي بمنزلتين عشريتين، مطابق لـ InfluencersTab.tsx.
  const money = (n: number) => `${n.toFixed(2)} LYD`;

  // دفعة أكبر من الرصيد مسموحة (مقدّمة) لكن تستحق تحذيرًا واضحًا.
  const enteredAmount = Number(payoutForm.amount);
  const isOverpay =
    !!statementInfluencer &&
    Number.isFinite(enteredAmount) &&
    enteredAmount > statementInfluencer.balance_due;

  return (
    <Dialog open={isStatementOpen} onOpenChange={setIsStatementOpen}>
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {t("admin.influencers.statementTitle")}
            {statementInfluencer ? ` — ${statementInfluencer.name}` : ""}
          </DialogTitle>
        </DialogHeader>

        {statementLoading ? (
          <p className="text-sm text-[#6B7B8D] py-6">…</p>
        ) : (
          <div className="space-y-6">
            {/* ملخّص الأرقام الثلاثة التي تهم عند الدفع */}
            {statementInfluencer && (
              <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-xs text-[#6B7B8D]">
                    {t("admin.influencers.commissionEarned")}
                  </p>
                  <p className="font-bold">
                    {money(statementInfluencer.commission_earned)}
                  </p>
                </div>
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-xs text-[#6B7B8D]">
                    {t("admin.influencers.totalPaid")}
                  </p>
                  <p className="font-bold">
                    {money(statementInfluencer.total_paid)}
                  </p>
                </div>
                <div className="glass-card p-3 rounded-xl">
                  <p className="text-xs text-[#6B7B8D]">
                    {t("admin.influencers.balanceDue")}
                  </p>
                  <p className="font-bold text-[#5B8DD9]">
                    {money(statementInfluencer.balance_due)}
                  </p>
                </div>
              </div>
            )}

            {/* الجزء الأول: تفصيل الأكواد */}
            <div className="space-y-2">
              <h3 className="font-semibold">
                {t("admin.influencers.codeBreakdown")}
              </h3>
              {codeStats.length === 0 ? (
                <div className="glass-card p-4 rounded-xl">
                  <p className="text-sm">{t("admin.influencers.noOrders")}</p>
                  <p className="text-xs text-[#6B7B8D]">
                    {t("admin.influencers.noOrdersHint")}
                  </p>
                </div>
              ) : (
                <div className="glass-card p-0 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#6B7B8D] border-b border-[#323D50]/10 dark:border-white/10">
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.code")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.commissionRate")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.ordersCount")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.grossSales")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.commissionDue")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {codeStats.map((row) => (
                        <tr
                          key={`${row.code}-${row.commission_rate}`}
                          className="border-b border-[#323D50]/5 dark:border-white/5"
                        >
                          <td className="p-3 font-mono">{row.code}</td>
                          <td className="p-3">{row.commission_rate}%</td>
                          <td className="p-3">{row.orders_count}</td>
                          <td className="p-3">{money(row.gross_sales)}</td>
                          <td className="p-3 font-semibold">
                            {money(row.commission_due)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* الجزء الثاني: سجلّ الدفعات + تسجيل دفعة */}
            <div className="space-y-2">
              <h3 className="font-semibold">
                {t("admin.influencers.payouts")}
              </h3>
              {payouts.length === 0 ? (
                <p className="text-sm text-[#6B7B8D]">
                  {t("admin.influencers.noPayouts")}
                </p>
              ) : (
                <div className="glass-card p-0 rounded-xl overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[#6B7B8D] border-b border-[#323D50]/10 dark:border-white/10">
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.payoutDate")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.payoutAmount")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.payoutMethod")}
                        </th>
                        <th className="text-start p-3 font-medium">
                          {t("admin.influencers.payoutNote")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payouts.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-[#323D50]/5 dark:border-white/5"
                        >
                          <td className="p-3">{p.paid_at.slice(0, 10)}</td>
                          <td className="p-3 font-semibold">
                            {money(p.amount)}
                          </td>
                          <td className="p-3">{p.method ?? "—"}</td>
                          <td className="p-3">{p.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="glass-card p-4 rounded-xl space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>{t("admin.influencers.payoutAmount")} *</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={payoutForm.amount}
                      onChange={(e) =>
                        setPayoutForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.influencers.payoutMethod")}</Label>
                    <Select
                      value={payoutForm.method}
                      onValueChange={(v) =>
                        setPayoutForm((prev) => ({ ...prev, method: v }))
                      }
                    >
                      <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                        <SelectItem value="cash">
                          {t("admin.influencers.payoutMethodCash")}
                        </SelectItem>
                        <SelectItem value="transfer">
                          {t("admin.influencers.payoutMethodTransfer")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t("admin.influencers.payoutNote")}</Label>
                    <Input
                      value={payoutForm.note}
                      onChange={(e) =>
                        setPayoutForm((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20"
                    />
                  </div>
                </div>

                {isOverpay && (
                  <p className="text-sm text-amber-500">
                    {t("admin.influencers.overpayWarning")}
                  </p>
                )}
                {payoutError && (
                  <p className="text-sm text-red-500">{payoutError}</p>
                )}

                <LoadingButton
                  loading={payoutSubmitLoading}
                  onClick={handleRecordPayout}
                  className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] text-white rounded-xl"
                >
                  {t("admin.influencers.recordPayout")}
                </LoadingButton>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
