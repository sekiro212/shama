/**
 * CouponFormDialog.tsx
 * --------------------
 * نموذج نافذة لإنشاء أو تحرير كوبون خصم (رمز ترويجي / promo code).
 * تأتي كل حالة النموذج ومعالج الإرسال من الـ hook `useCoupons` (يُمرَّر باسم
 * `couponsApi`) — وهذا المكوّن طبقة عرض (presentation) محضة.
 * يلتقط: الرمز، نوع/قيمة الخصم، الحد الأقصى الاختياري للخصم (للنِّسَب المئوية)،
 * الحد الأدنى لإجمالي الطلب، النطاق (كل المنتجات مقابل منتجات محدّدة)، تاريخ
 * الانتهاء، حدود الاستخدام، ومفتاح التفعيل/التعطيل.
 */
import { X, Calendar, Search, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import type { DiscountType, PromoScope } from "@/services/promoCodesService";
import type { useCoupons } from "../hooks/useCoupons";
import type { Perfume } from "../types";
import { initialCouponForm } from "../constants";

interface CouponFormDialogProps {
  couponsApi: ReturnType<typeof useCoupons>;
  perfumes: Perfume[];
}

/**
 * يعرض نافذة إنشاء/تحرير الكوبون.
 * الخصائص (props) الأساسية:
 * - couponsApi: ناتج الـ hook `useCoupons` الكامل (حالة النموذج + التعديلات)
 * - perfumes: قائمة المنتجات، يستخدمها مُحدِّد نطاق المنتجات المحدّدة
 */
export function CouponFormDialog({
  couponsApi,
  perfumes,
}: CouponFormDialogProps) {
  const { t, isRTL } = useLanguage();
  // تفكيك حالة النموذج والمعالِجات من الـ hook الخاص بالكوبونات.
  const {
    isCouponDialogOpen,
    setIsCouponDialogOpen,
    editingCoupon,
    setEditingCoupon,
    couponForm,
    setCouponForm,
    couponFormError,
    setCouponFormError,
    couponSubmitLoading,
    productPickerSearch,
    setProductPickerSearch,
    filteredPickerProducts,
    handleCouponSubmit,
    toggleCouponScopeProduct,
  } = couponsApi;

  return (
    <Dialog
      open={isCouponDialogOpen}
      onOpenChange={(open) => {
        setIsCouponDialogOpen(open);
        // عند إغلاق النافذة، إعادة تعيين النموذج إلى حالة نظيفة.
        if (!open) {
          setEditingCoupon(null);
          setCouponForm(initialCouponForm);
          setCouponFormError(null);
          setProductPickerSearch("");
        }
      }}
    >
      <DialogContent className="glass-card bg-[#F8F9FB] dark:bg-[#1a2235] border-[#323D50]/10 dark:border-white/10 text-[#323D50] dark:text-white max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="gradient-text">
            {editingCoupon
              ? t("admin.coupons.edit")
              : t("admin.coupons.create")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[#323D50] dark:text-white/80">
              {t("admin.coupons.code")} *
            </Label>
            {/* يُحوَّل رمز الكوبون قسرًا إلى أحرف كبيرة بحيث لا تتأثر الرموز بحالة الأحرف. */}
            <Input
              value={couponForm.code}
              onChange={(e) =>
                setCouponForm((prev) => ({
                  ...prev,
                  code: e.target.value.toUpperCase(),
                }))
              }
              placeholder={t("admin.coupons.codePlaceholder")}
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white font-mono uppercase"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[#323D50] dark:text-white/80">
                {t("admin.coupons.discountType")} *
              </Label>
              <Select
                value={couponForm.discount_type}
                onValueChange={(v) =>
                  setCouponForm((prev) => ({
                    ...prev,
                    discount_type: v as DiscountType,
                  }))
                }
              >
                <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                  <SelectItem value="fixed">
                    {t("admin.coupons.fixed")}
                  </SelectItem>
                  <SelectItem value="percentage">
                    {t("admin.coupons.percentage")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[#323D50] dark:text-white/80">
                {t("admin.coupons.discountValue")} *
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={couponForm.discount_value}
                onChange={(e) =>
                  setCouponForm((prev) => ({
                    ...prev,
                    discount_value: e.target.value,
                  }))
                }
                placeholder={
                  couponForm.discount_type === "percentage" ? "20" : "50.00"
                }
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white"
              />
            </div>
          </div>

          {/* سقف الحد الأقصى للخصم لا معنى له إلا مع الخصومات بالنسبة المئوية. */}
          {couponForm.discount_type === "percentage" && (
            <div className="space-y-2">
              <Label className="text-[#323D50] dark:text-white/80">
                {t("admin.coupons.maxDiscount")}
              </Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={couponForm.max_discount}
                onChange={(e) =>
                  setCouponForm((prev) => ({
                    ...prev,
                    max_discount: e.target.value,
                  }))
                }
                placeholder="50.00"
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white"
              />
              <p className="text-xs text-[#6B7B8D] dark:text-white/50">
                {t("admin.coupons.maxDiscountHint")}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[#323D50] dark:text-white/80">
              {t("admin.coupons.minOrderTotal")}
            </Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={couponForm.min_order_total}
              onChange={(e) =>
                setCouponForm((prev) => ({
                  ...prev,
                  min_order_total: e.target.value,
                }))
              }
              placeholder="100.00"
              className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-[#323D50] dark:text-white/80">
              {t("admin.coupons.scope")} *
            </Label>
            {/* تبديل النطاق إلى "all_products" يمسح أي معرّفات منتجات (IDs) مختارة سابقًا. */}
            <Select
              value={couponForm.scope}
              onValueChange={(v) =>
                setCouponForm((prev) => ({
                  ...prev,
                  scope: v as PromoScope,
                  scope_product_ids:
                    v === "all_products" ? [] : prev.scope_product_ids,
                }))
              }
            >
              <SelectTrigger className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#1a2235] border-[#323D50]/15 dark:border-white/20">
                <SelectItem value="all_products">
                  {t("admin.coupons.scopeAllProducts")}
                </SelectItem>
                <SelectItem value="specific_products">
                  {t("admin.coupons.scopeSpecificProducts")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* لا يظهر مُحدِّد المنتجات إلا عندما يكون نطاق الكوبون محصورًا بمنتجات محدّدة.
              (هذه الكتلة تكرّر واجهة CouponProductPicker المستقلة بشكل مضمّن.) */}
          {couponForm.scope === "specific_products" && (
            <div className="space-y-2">
              <Label className="text-[#323D50] dark:text-white/80">
                {t("admin.coupons.selectProducts")} *
              </Label>
              <p className="text-xs text-[#6B7B8D] dark:text-white/50">
                {t("admin.coupons.selectProductsHint")}
              </p>
              {couponForm.scope_product_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-[#5B8DD9]/5 border border-[#5B8DD9]/20">
                  {couponForm.scope_product_ids.map((id) => {
                    const p = perfumes.find((pp) => pp.id === id);
                    if (!p) return null;
                    return (
                      <Badge
                        key={id}
                        className="bg-[#5B8DD9]/20 text-[#5B8DD9] hover:bg-[#5B8DD9]/30 cursor-pointer"
                        onClick={() => toggleCouponScopeProduct(id)}
                      >
                        {p.name} ({p.size})
                        <X className="w-3 h-3 ms-1" />
                      </Badge>
                    );
                  })}
                </div>
              )}
              <div className="relative">
                <Search
                  className={`w-4 h-4 absolute top-1/2 -translate-y-1/2 ${
                    isRTL ? "right-3" : "left-3"
                  } text-[#6B7B8D]`}
                />
                <Input
                  value={productPickerSearch}
                  onChange={(e) => setProductPickerSearch(e.target.value)}
                  placeholder={t("admin.coupons.searchProducts")}
                  className={`glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white ${
                    isRTL ? "pr-9" : "pl-9"
                  }`}
                />
              </div>
              <div className="max-h-48 overflow-y-auto border border-[#323D50]/10 dark:border-white/10 rounded-xl divide-y divide-[#323D50]/10 dark:divide-white/5">
                {filteredPickerProducts.length === 0 ? (
                  <div className="p-4 text-center text-sm text-[#6B7B8D]">
                    {t("admin.coupons.noProductsFound")}
                  </div>
                ) : (
                  filteredPickerProducts.map((p) => {
                    const selected = couponForm.scope_product_ids.includes(
                      p.id
                    );
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => toggleCouponScopeProduct(p.id)}
                        className={`w-full text-start px-3 py-2 text-sm flex items-center justify-between hover:bg-[#5B8DD9]/10 ${
                          selected
                            ? "bg-[#5B8DD9]/10 text-[#5B8DD9] font-medium"
                            : "text-[#323D50] dark:text-white/80"
                        }`}
                      >
                        <span className="truncate">
                          {p.name}{" "}
                          <span className="text-xs text-[#6B7B8D]">
                            ({p.size}, {p.type})
                          </span>
                        </span>
                        {selected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[#323D50] dark:text-white/80">
                <Calendar className="w-4 h-4 inline me-1" />
                {t("admin.coupons.expiresAt")}
              </Label>
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={couponForm.expires_at}
                  onChange={(e) =>
                    setCouponForm((prev) => ({
                      ...prev,
                      expires_at: e.target.value,
                    }))
                  }
                  className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white"
                />
                {/* زر المسح يُزيل تاريخ الانتهاء (السلسلة الفارغة = لا ينتهي أبدًا). */}
                {couponForm.expires_at && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setCouponForm((prev) => ({ ...prev, expires_at: "" }))
                    }
                    className="px-2"
                    title={t("admin.coupons.clearDate")}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[#323D50] dark:text-white/80">
                {t("admin.coupons.usageLimit")}
              </Label>
              <Input
                type="number"
                min={0}
                value={couponForm.usage_limit}
                onChange={(e) =>
                  setCouponForm((prev) => ({
                    ...prev,
                    usage_limit: e.target.value,
                  }))
                }
                placeholder={t("admin.coupons.unlimited")}
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#323D50] dark:text-white/80">
                {t("admin.coupons.usageLimitPerUser")}
              </Label>
              <Input
                type="number"
                min={0}
                value={couponForm.usage_limit_per_user}
                onChange={(e) =>
                  setCouponForm((prev) => ({
                    ...prev,
                    usage_limit_per_user: e.target.value,
                  }))
                }
                placeholder={t("admin.coupons.unlimited")}
                className="glass bg-white dark:bg-white/5 border-[#323D50]/15 dark:border-white/20 text-[#323D50] dark:text-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-[#323D50]/10 dark:border-white/10">
            <Label className="text-[#323D50] dark:text-white/80 cursor-pointer">
              {t("admin.coupons.isActive")}
            </Label>
            {/* مفتاح تبديل مخصّص يقلب حالة تفعيل الكوبون. */}
            <button
              type="button"
              onClick={() =>
                setCouponForm((prev) => ({
                  ...prev,
                  is_active: !prev.is_active,
                }))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                couponForm.is_active ? "bg-green-500" : "bg-zinc-400"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                  couponForm.is_active ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* رسالة خطأ التحقق/الحفظ التي يعيدها الـ hook الخاص بـ useCoupons. */}
          {couponFormError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-500">
              {couponFormError}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setIsCouponDialogOpen(false)}
              className="border-[#323D50]/15 dark:border-white/20"
            >
              {t("admin.coupons.cancel")}
            </Button>
            {/* يرسل النموذج؛ يتحقّق الـ hook ثم يُدرج الكوبون أو يحدّثه. */}
            <LoadingButton
              loading={couponSubmitLoading}
              loadingText={t("admin.coupons.saving")}
              onClick={handleCouponSubmit}
              className="bg-[#5B8DD9] hover:bg-[#3E6BB5] text-white"
            >
              {editingCoupon
                ? t("admin.coupons.update")
                : t("admin.coupons.create")}
            </LoadingButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
