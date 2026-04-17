import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  fetchAllPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCode,
  isPromoExpired,
  PromoCode,
  PromoCodePayload,
} from "@/services/promoCodesService";
import { useLanguage } from "@/contexts/LanguageContext";
import type { CouponFormState, Perfume } from "../types";
import { initialCouponForm } from "../constants";
import { useConfirmDialog } from "./useConfirmDialog";

interface UseCouponsOptions {
  perfumes: Perfume[];
}

export function useCoupons({ perfumes }: UseCouponsOptions) {
  const { t } = useLanguage();
  const { confirm, confirmDialogProps } = useConfirmDialog();
  const [coupons, setCoupons] = useState<PromoCode[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PromoCode | null>(null);
  const [couponForm, setCouponForm] = useState<CouponFormState>(
    () => initialCouponForm
  );
  const [couponFormError, setCouponFormError] = useState<string | null>(null);
  const [couponSubmitLoading, setCouponSubmitLoading] = useState(false);
  const [togglingCoupon, setTogglingCoupon] = useState<string | null>(null);
  const [deletingCoupon, setDeletingCoupon] = useState<string | null>(null);
  const [productPickerSearch, setProductPickerSearch] = useState("");

  const loadCoupons = async () => {
    setCouponsLoading(true);
    try {
      const data = await fetchAllPromoCodes();
      setCoupons(data);
    } catch {
      toast.error(t("admin.coupons.toast.loadFailed"));
    } finally {
      setCouponsLoading(false);
    }
  };

  const openCreateCoupon = () => {
    setEditingCoupon(null);
    setCouponForm(initialCouponForm);
    setCouponFormError(null);
    setProductPickerSearch("");
    setIsCouponDialogOpen(true);
  };

  const openEditCoupon = (coupon: PromoCode) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      max_discount:
        coupon.max_discount !== null ? String(coupon.max_discount) : "",
      min_order_total: String(coupon.min_order_total ?? 0),
      scope: coupon.scope,
      scope_product_ids: coupon.scope_product_ids,
      is_active: coupon.is_active,
      expires_at: coupon.expires_at
        ? coupon.expires_at.slice(0, 10)
        : "",
      usage_limit:
        coupon.usage_limit !== null ? String(coupon.usage_limit) : "",
      usage_limit_per_user:
        coupon.usage_limit_per_user !== null
          ? String(coupon.usage_limit_per_user)
          : "",
    });
    setCouponFormError(null);
    setProductPickerSearch("");
    setIsCouponDialogOpen(true);
  };

  const buildCouponPayload = (): PromoCodePayload | null => {
    const code = couponForm.code.trim();
    if (!code) {
      setCouponFormError(t("admin.coupons.validation.codeRequired"));
      return null;
    }
    const value = Number(couponForm.discount_value);
    if (!Number.isFinite(value) || value <= 0) {
      setCouponFormError(t("admin.coupons.validation.valueRequired"));
      return null;
    }
    if (
      couponForm.discount_type === "percentage" &&
      (value > 100 || value < 1)
    ) {
      setCouponFormError(t("admin.coupons.validation.percentageRange"));
      return null;
    }
    if (
      couponForm.scope === "specific_products" &&
      couponForm.scope_product_ids.length === 0
    ) {
      setCouponFormError(t("admin.coupons.validation.scopeProductsRequired"));
      return null;
    }
    const maxDiscount =
      couponForm.discount_type === "percentage" && couponForm.max_discount
        ? Number(couponForm.max_discount)
        : null;
    const minOrder = Number(couponForm.min_order_total || 0);
    const usageLimit = couponForm.usage_limit
      ? Number(couponForm.usage_limit)
      : null;
    const perUserLimit = couponForm.usage_limit_per_user
      ? Number(couponForm.usage_limit_per_user)
      : null;
    const expiresAt = couponForm.expires_at
      ? new Date(couponForm.expires_at + "T23:59:59").toISOString()
      : null;

    return {
      code,
      discount_type: couponForm.discount_type,
      discount_value: value,
      max_discount: maxDiscount,
      min_order_total: Number.isFinite(minOrder) ? minOrder : 0,
      scope: couponForm.scope,
      scope_product_ids:
        couponForm.scope === "specific_products"
          ? couponForm.scope_product_ids
          : [],
      is_active: couponForm.is_active,
      expires_at: expiresAt,
      usage_limit: usageLimit,
      usage_limit_per_user: perUserLimit,
    };
  };

  const handleCouponSubmit = async () => {
    const payload = buildCouponPayload();
    if (!payload) return;
    setCouponSubmitLoading(true);
    try {
      if (editingCoupon) {
        await updatePromoCode(editingCoupon.id, payload);
        toast.success(t("admin.coupons.toast.updated"));
      } else {
        await createPromoCode(payload);
        toast.success(t("admin.coupons.toast.created"));
      }
      setIsCouponDialogOpen(false);
      setEditingCoupon(null);
      setCouponForm(initialCouponForm);
      setCouponFormError(null);
      await loadCoupons();
    } catch (err) {
      if (err instanceof Error && err.message === "DUPLICATE_CODE") {
        setCouponFormError(t("admin.coupons.toast.duplicateCode"));
        toast.error(t("admin.coupons.toast.duplicateCode"));
      } else {
        console.error("Error saving coupon:", err);
        toast.error(t("admin.coupons.toast.saveFailed"));
      }
    } finally {
      setCouponSubmitLoading(false);
    }
  };

  const handleToggleCoupon = async (coupon: PromoCode) => {
    setTogglingCoupon(coupon.id);
    try {
      await togglePromoCode(coupon.id, !coupon.is_active);
      toast.success(
        !coupon.is_active
          ? t("admin.coupons.toast.activated")
          : t("admin.coupons.toast.deactivated")
      );
      await loadCoupons();
    } catch {
      toast.error(t("admin.coupons.toast.toggleFailed"));
    } finally {
      setTogglingCoupon(null);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    const confirmed = await confirm({
      title: t("admin.confirmDialog.deleteCoupon.title"),
      description: t("admin.coupons.confirm.delete"),
      confirmLabel: t("admin.confirmDialog.delete"),
      variant: "danger",
    });
    if (!confirmed) return;
    setDeletingCoupon(id);
    try {
      await deletePromoCode(id);
      toast.success(t("admin.coupons.toast.deleted"));
      await loadCoupons();
    } catch {
      toast.error(t("admin.coupons.toast.deleteFailed"));
    } finally {
      setDeletingCoupon(null);
    }
  };

  const toggleCouponScopeProduct = (perfumeId: string) => {
    setCouponForm((prev) => {
      const has = prev.scope_product_ids.includes(perfumeId);
      return {
        ...prev,
        scope_product_ids: has
          ? prev.scope_product_ids.filter((id) => id !== perfumeId)
          : [...prev.scope_product_ids, perfumeId],
      };
    });
  };

  const activeCouponCount = useMemo(
    () => coupons.filter((c) => c.is_active && !isPromoExpired(c)).length,
    [coupons]
  );
  const totalCouponRedemptions = useMemo(
    () => coupons.reduce((sum, c) => sum + (c.usage_count ?? 0), 0),
    [coupons]
  );
  const filteredPickerProducts = useMemo(() => {
    const q = productPickerSearch.trim().toLowerCase();
    const base = q
      ? perfumes.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.name_ar || "").toLowerCase().includes(q)
        )
      : perfumes;
    return base.slice(0, 60);
  }, [perfumes, productPickerSearch]);

  return {
    coupons,
    couponsLoading,
    isCouponDialogOpen,
    setIsCouponDialogOpen,
    editingCoupon,
    setEditingCoupon,
    couponForm,
    setCouponForm,
    couponFormError,
    setCouponFormError,
    couponSubmitLoading,
    togglingCoupon,
    deletingCoupon,
    productPickerSearch,
    setProductPickerSearch,
    activeCouponCount,
    totalCouponRedemptions,
    filteredPickerProducts,
    loadCoupons,
    openCreateCoupon,
    openEditCoupon,
    handleCouponSubmit,
    handleToggleCoupon,
    handleDeleteCoupon,
    toggleCouponScopeProduct,
    confirmDialogProps,
  };
}
