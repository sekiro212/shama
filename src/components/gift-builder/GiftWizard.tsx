// src/components/gift-builder/GiftWizard.tsx
/**
 * ====================================================================
 * GiftWizard — المعالج الرئيسي لبناء الهدية المخصّصة (أربع خطوات)
 * --------------------------------------------------------------------
 * يُدير الحالة الكاملة لمعالج الهدية ويُنسّق الانتقال بين خطواته الأربع:
 *   1) الوصف     → GiftStep1Describe
 *   2) العطور    → GiftStep2Products
 *   3) التخصيص   → GiftStep3Customize
 *   4) المعاينة  → GiftStep4Preview
 * كما يستدعي خدمات الذكاء الاصطناعي (AI) لاقتراح العطور وتوليد صورة الهدية،
 * ثم يُرسل الطلب النهائي عبر giftBuilderService.
 * يُعرَض داخل نافذة منبثقة (modal) تدعم اللغتين العربية والإنجليزية.
 * ====================================================================
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Product } from "@/services/productsService";
import { getGiftSuggestions, generateGiftImage } from "@/services/aiService";
import { placeCustomGiftOrder, buildGiftImagePrompt } from "@/services/giftBuilderService";
import { GiftWizardState, DEFAULT_CUSTOMIZATION } from "@/types/giftBuilder";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import GiftStep1Describe from "./GiftStep1Describe";
import GiftStep2Products from "./GiftStep2Products";
import GiftStep3Customize from "./GiftStep3Customize";
import GiftStep4Preview from "./GiftStep4Preview";

/**
 * خصائص المكوّن:
 * - onClose: دالة إغلاق النافذة المنبثقة للمعالج.
 */
interface Props {
  onClose: () => void;
}

// مفاتيح ترجمة عناوين الخطوات الأربع كما تظهر في شريط التقدّم (progress bar)
const STEP_LABEL_KEYS = [
  "giftBuilder.stepDescribe",
  "giftBuilder.stepProducts",
  "giftBuilder.stepCustomize",
  "giftBuilder.stepPreview",
] as const;

/**
 * المكوّن الرئيسي للمعالج: يحوي حالة الخطوات والدوال المنسِّقة لها.
 */
export default function GiftWizard({ onClose }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();

  // مرجع يتتبّع ما إذا كان المكوّن لا يزال مُركَّبًا (mounted)؛ يمنع تحديث الحالة
  // بعد إزالة المكوّن (مثلًا إذا أُغلقت النافذة أثناء انتظار استجابة AI)
  const isMounted = useRef(true);
  useEffect(() => () => { isMounted.current = false; }, []);

  // الحالة المركزية للمعالج: رقم الخطوة الحالية + كل بيانات الهدية ومؤشّرات الانشغال
  const [state, setState] = useState<GiftWizardState>({
    step: 1,
    description: "",
    suggestedProducts: [],
    selectedProducts: [],
    customization: DEFAULT_CUSTOMIZATION,
    generatedImageUrl: "",
    imageStyle: "realistic",
    isGenerating: false,
    isPlacingOrder: false,
    publishToGiftPage: false,
  });

  // دالة مساعدة مُعمَّمة لتحديث حقل واحد من حالة المعالج مع الحفاظ على بقية الحقول
  const set = <K extends keyof GiftWizardState>(key: K, val: GiftWizardState[K]) =>
    setState((prev) => ({ ...prev, [key]: val }));

  /**
   * معالج الانتقال من الخطوة 1 إلى 2:
   * يرسل وصف المستخدم إلى الذكاء الاصطناعي للحصول على قائمة عطور مقترحة،
   * ثم ينتقل إلى خطوة اختيار العطور. عند الفشل يظهر إشعار خطأ ويُلغى التحميل.
   */
  const handleStep1Next = useCallback(async () => {
    set("isGenerating", true);
    try {
      const suggestions = await getGiftSuggestions(state.description);
      setState((prev) => ({
        ...prev,
        suggestedProducts: suggestions,
        step: 2,
        isGenerating: false,
      }));
    } catch {
      toast.error(t("giftBuilder.errorSuggestions"));
      set("isGenerating", false);
    }
  }, [state.description, t]);

  /**
   * معالج الانتقال من الخطوة 3 إلى 4:
   * يبني وصفًا نصيًّا (prompt) من العطور المختارة وخيارات التخصيص، ثم يولّد
   * صورة الهدية عبر الذكاء الاصطناعي، وأخيرًا ينتقل إلى خطوة المعاينة.
   * عند فشل التوليد ينتقل المستخدم للمعاينة دون صورة مولَّدة.
   */
  const handleStep3Next = useCallback(async () => {
    set("isGenerating", true);
    try {
      // بناء نص الوصف الموجَّه للذكاء الاصطناعي من اختيارات المستخدم
      const prompt = buildGiftImagePrompt(
        state.selectedProducts,
        state.customization,
        state.imageStyle
      );
      // تجميع روابط صور العطور المختارة لتمريرها كمرجع بصري لمولّد الصور
      const imageUrls = state.selectedProducts
        .flatMap((p) => p.images?.map((i) => i.image_url) ?? [])
        .filter((url): url is string => Boolean(url));

      const imageUrl = await generateGiftImage(prompt, imageUrls);
      setState((prev) => ({
        ...prev,
        step: 4,
        isGenerating: false,
        generatedImageUrl: imageUrl ?? "",
      }));
    } catch {
      // عند فشل التوليد: ننتقل للمعاينة مع ترك رابط الصورة فارغًا
      toast.error(t("giftBuilder.errorGenerating"));
      setState((prev) => ({ ...prev, step: 4, isGenerating: false, generatedImageUrl: "" }));
    }
  }, [state.selectedProducts, state.customization, state.imageStyle, t]);

  /**
   * يرسل طلب الهدية المخصّصة النهائي إلى الخادم عبر placeCustomGiftOrder.
   * في حال غياب الصورة المولَّدة يستخدم صورة أول عطر مختار كصورة احتياطية.
   * عند النجاح يُغلق المعالج؛ وعند الفشل يُظهر إشعارًا فقط إن بقي المكوّن مُركَّبًا.
   */
  const handlePlaceOrder = useCallback(async () => {
    set("isPlacingOrder", true);
    try {
      await placeCustomGiftOrder({
        products: state.selectedProducts,
        customization: state.customization,
        // الصورة المولَّدة أولًا، وإلا أول صورة عطر، وإلا سلسلة فارغة كحل أخير
        generatedImageUrl: state.generatedImageUrl || state.selectedProducts[0]?.images?.[0]?.image_url || "",
        imageStyle: state.imageStyle,
        userId: user?.id,
        publishToGiftPage: state.publishToGiftPage,
      });
      toast.success(t("giftBuilder.orderPlaced"));
      onClose();
    } catch {
      // نتجنّب تحديث الحالة إذا أُزيل المكوّن لتفادي تحذيرات React
      if (isMounted.current) {
        toast.error(t("giftBuilder.errorOrder"));
        set("isPlacingOrder", false);
      }
    }
  }, [state.selectedProducts, state.customization, state.generatedImageUrl, state.imageStyle, state.publishToGiftPage, user, t, onClose]);

  /**
   * تبديل اختيار عطر: إزالته إن كان مختارًا مسبقًا، أو إضافته ما لم يبلغ
   * الاختيار الحد الأقصى (4 عطور)؛ وإلا تبقى القائمة كما هي دون تغيير.
   */
  const toggleProduct = useCallback((product: Product) => {
    setState((prev) => {
      const exists = prev.selectedProducts.some((p) => p.id === product.id);
      return {
        ...prev,
        selectedProducts: exists
          ? prev.selectedProducts.filter((p) => p.id !== product.id)
          : prev.selectedProducts.length < 4
          ? [...prev.selectedProducts, product]
          : prev.selectedProducts,
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-card rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative dark:bg-[#1a2235] bg-[#F8F9FB]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold dark:text-[#F5F5F5] text-[#323D50]">
            {t("giftBuilder.title")}
          </h1>
          <button
            onClick={onClose}
            className="glass p-2 rounded-xl dark:text-white/60 text-[#6B7B8D] hover:scale-110 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        {/* شريط التقدّم: يُلوَّن كل قسم بلون العلامة التجارية إذا بلغته الخطوة الحالية أو تجاوزتها */}
        <div className="flex gap-2 mb-8">
          {([1, 2, 3, 4] as const).map((n) => (
            <div key={n} className="flex-1">
              <div
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  n <= state.step ? "bg-[#5B8DD9]" : "bg-[#323D50]/10 dark:bg-white/10"
                }`}
              />
              <p
                className={`text-xs mt-1 text-center truncate ${
                  n === state.step
                    ? "text-[#5B8DD9] font-medium"
                    : "dark:text-white/40 text-[#6B7B8D]"
                }`}
              >
                {t(STEP_LABEL_KEYS[n - 1])}
              </p>
            </div>
          ))}
        </div>

        {/* Steps */}
        {/* عرض الخطوة المطابقة لقيمة state.step؛ كل خطوة مكوّن مستقل يتلقّى ما يلزمه من الحالة والدوال */}
        {state.step === 1 && (
          <GiftStep1Describe
            value={state.description}
            onChange={(v) => set("description", v)}
            onNext={handleStep1Next}
            isLoading={state.isGenerating}
          />
        )}
        {state.step === 2 && (
          <GiftStep2Products
            products={state.suggestedProducts}
            selected={state.selectedProducts}
            onToggle={toggleProduct}
            onNext={() => set("step", 3)}
            onBack={() => set("step", 1)}
          />
        )}
        {state.step === 3 && (
          <GiftStep3Customize
            value={state.customization}
            onChange={(v) => set("customization", v)}
            onNext={handleStep3Next}
            onBack={() => set("step", 2)}
            isLoading={state.isGenerating}
          />
        )}
        {state.step === 4 && (
          <GiftStep4Preview
            onPlaceOrder={handlePlaceOrder}
            onBack={() => set("step", 3)}
            selectedProducts={state.selectedProducts}
            isPlacingOrder={state.isPlacingOrder}
            generatedImageUrl={state.generatedImageUrl}
            publishToGiftPage={state.publishToGiftPage}
            onTogglePublish={(v) => set("publishToGiftPage", v)}
          />
        )}
      </div>
    </div>
  );
}
