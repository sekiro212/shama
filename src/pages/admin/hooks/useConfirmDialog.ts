/**
 * useConfirmDialog.ts
 *
 * متحكّم قابل لإعادة الاستخدام لنافذة التأكيد في لوحة الإدارة.
 * يحوّل الاستدعاء الأمري `await confirm({...})` إلى promise يُحَلّ
 * إلى true/false بمجرّد أن ينقر المستخدم على تأكيد أو إلغاء — مما يتيح
 * لمعالجات التعديل التدميرية (حذف، قبول، إرجاع، إلخ) أن تشترط موافقة المستخدم
 * دون إدارة حالة النافذة المنبثقة (modal) داخل الكود مباشرةً.
 */
import { useState, useCallback } from "react";

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "default";
}

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "warning" | "default";
}

/**
 * hook يوفّر نافذة تأكيد بأسلوب أمري (imperative).
 * @returns `confirm(opts)` — يفتح النافذة ويُحَلّ إلى Promise<boolean>
 *          (true = تم التأكيد، false = تم الإلغاء) — إضافةً إلى `confirmDialogProps`
 *          لتمريرها (spread) إلى مكوّن `<ConfirmDialog>`.
 */
export function useConfirmDialog() {
  // الحالة المرئية للنافذة (راية الفتح + النص/النوع المراد عرضه).
  const [state, setState] = useState<ConfirmDialogState>({
    open: false,
    title: "",
    description: "",
  });
  // يحتفظ بدالة resolve الخاصة بالـ promise المعلّق ليتمكّن نقر لاحق من إتمامه.
  const [resolveRef, setResolveRef] = useState<{
    resolve: (value: boolean) => void;
  } | null>(null);

  // فتح النافذة وإرجاع promise يبقى معلّقًا حتى يتفاعل المستخدم.
  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: opts.title,
        description: opts.description,
        confirmLabel: opts.confirmLabel,
        variant: opts.variant,
      });
      // تخزين دالة الحلّ (resolver) ليتمكّن handleConfirm/handleCancel من إتمام الـ promise.
      setResolveRef({ resolve });
    });
  }, []);

  // نقر التأكيد: حلّ الـ promise بقيمة true وإغلاق النافذة.
  const handleConfirm = useCallback(() => {
    resolveRef?.resolve(true);
    setResolveRef(null);
    setState((prev) => ({ ...prev, open: false }));
  }, [resolveRef]);

  // الإلغاء/الإغلاق: حلّ الـ promise بقيمة false وإغلاق النافذة.
  const handleCancel = useCallback(() => {
    resolveRef?.resolve(false);
    setResolveRef(null);
    setState((prev) => ({ ...prev, open: false }));
  }, [resolveRef]);

  return {
    confirm,
    confirmDialogProps: {
      ...state,
      onConfirm: handleConfirm,
      onCancel: handleCancel,
    },
  };
}
