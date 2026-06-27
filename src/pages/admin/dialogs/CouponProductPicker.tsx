/**
 * CouponProductPicker.tsx
 * -----------------------
 * مكوّن فرعي لنموذج الكوبون. يتيح للمسؤول حصر الكوبون بمجموعة من العطور المحدّدة
 * (نطاق "specific_products"). يعرض المنتجات المختارة مسبقًا كشارات (badges) قابلة
 * للإزالة، ومربّع بحث، وقائمة منتجات قابلة للتمرير والبحث يمكن تفعيل/تعطيل كل منها.
 * تُخزَّن المعرّفات (IDs) المختارة في حالة نموذج الكوبون باسم `scope_product_ids`.
 */
import { Search, X, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Perfume, CouponFormState } from "../types";

interface CouponProductPickerProps {
  couponForm: CouponFormState;
  perfumes: Perfume[];
  productPickerSearch: string;
  setProductPickerSearch: (v: string) => void;
  filteredPickerProducts: Perfume[];
  toggleCouponScopeProduct: (id: string) => void;
}

/**
 * يعرض واجهة اختيار المنتجات للكوبونات المحصورة بمنتجات.
 * الخصائص (props) الأساسية:
 * - couponForm: حالة نموذج الكوبون الحالية (تستخدم `scope_product_ids`)
 * - perfumes: قائمة المنتجات الكاملة، تُستخدم لتحويل المعرّف (ID) إلى اسم منتج
 * - productPickerSearch / setProductPickerSearch: قيمة مربّع البحث + دالة الضبط
 * - filteredPickerProducts: المنتجات المطابقة لاستعلام البحث الحالي
 * - toggleCouponScopeProduct: يُضيف/يُزيل معرّف منتج من التحديد
 */
export function CouponProductPicker({
  couponForm,
  perfumes,
  productPickerSearch,
  setProductPickerSearch,
  filteredPickerProducts,
  toggleCouponScopeProduct,
}: CouponProductPickerProps) {
  const { t, isRTL } = useLanguage();

  return (
    <div className="space-y-2">
      <Label className="text-[#323D50] dark:text-white/80">
        {t("admin.coupons.selectProducts")} *
      </Label>
      <p className="text-xs text-[#6B7B8D] dark:text-white/50">
        {t("admin.coupons.selectProductsHint")}
      </p>
      {/* رقائق (chips) للمنتجات المختارة حاليًا؛ النقر على رقاقة يُزيلها. */}
      {couponForm.scope_product_ids.length > 0 && (
        <div className="flex flex-wrap gap-2 p-2 rounded-xl bg-[#5B8DD9]/5 border border-[#5B8DD9]/20">
          {couponForm.scope_product_ids.map((id) => {
            // تحويل المعرّف (ID) المخزَّن إلى منتج فعلي؛ يُتخطّى إن لم يعد موجودًا.
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
            // يُعدّ المنتج "مختارًا" إذا كان معرّفه (ID) موجودًا في قائمة النطاق.
            const selected = couponForm.scope_product_ids.includes(p.id);
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
  );
}
