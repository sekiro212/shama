// src/components/gift-builder/GiftWizard.tsx
import { useState, useCallback } from "react";
import { X } from "lucide-react";
import { Product } from "@/services/productsService";
import { getGiftSuggestions } from "@/services/aiService";
import { generateAndSaveGiftImage, placeCustomGiftOrder } from "@/services/giftBuilderService";
import { GiftWizardState, DEFAULT_CUSTOMIZATION, GiftImageStyle } from "@/types/giftBuilder";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import GiftStep1Describe from "./GiftStep1Describe";
import GiftStep2Products from "./GiftStep2Products";
import GiftStep3Customize from "./GiftStep3Customize";
import GiftStep4Preview from "./GiftStep4Preview";

interface Props {
  onClose: () => void;
}

const STEP_LABEL_KEYS = [
  "giftBuilder.stepDescribe",
  "giftBuilder.stepProducts",
  "giftBuilder.stepCustomize",
  "giftBuilder.stepPreview",
] as const;

export default function GiftWizard({ onClose }: Props) {
  const { user } = useAuth();
  const { t } = useLanguage();

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
  });

  const set = <K extends keyof GiftWizardState>(key: K, val: GiftWizardState[K]) =>
    setState((prev) => ({ ...prev, [key]: val }));

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

  const handleStep3Next = useCallback(async () => {
    setState((prev) => ({ ...prev, step: 4, isGenerating: true, generatedImageUrl: "" }));
    try {
      const url = await generateAndSaveGiftImage(
        state.selectedProducts,
        state.customization,
        state.imageStyle
      );
      setState((prev) => ({ ...prev, generatedImageUrl: url, isGenerating: false }));
    } catch {
      toast.error(t("giftBuilder.errorGenerating"));
      setState((prev) => ({ ...prev, isGenerating: false }));
    }
  }, [state.selectedProducts, state.customization, state.imageStyle, t]);

  const handleRegenerate = useCallback(async () => {
    setState((prev) => ({ ...prev, isGenerating: true, generatedImageUrl: "" }));
    try {
      const url = await generateAndSaveGiftImage(
        state.selectedProducts,
        state.customization,
        state.imageStyle
      );
      setState((prev) => ({ ...prev, generatedImageUrl: url, isGenerating: false }));
    } catch {
      toast.error(t("giftBuilder.errorGenerating"));
      setState((prev) => ({ ...prev, isGenerating: false }));
    }
  }, [state.selectedProducts, state.customization, state.imageStyle, t]);

  const handleStyleChange = useCallback(async (style: GiftImageStyle) => {
    setState((prev) => ({ ...prev, imageStyle: style, isGenerating: true, generatedImageUrl: "" }));
    try {
      const url = await generateAndSaveGiftImage(state.selectedProducts, state.customization, style);
      setState((prev) => ({ ...prev, generatedImageUrl: url, isGenerating: false }));
    } catch {
      toast.error(t("giftBuilder.errorGenerating"));
      setState((prev) => ({ ...prev, isGenerating: false }));
    }
  }, [state.selectedProducts, state.customization, t]);

  const handlePlaceOrder = useCallback(async () => {
    set("isPlacingOrder", true);
    try {
      await placeCustomGiftOrder({
        products: state.selectedProducts,
        customization: state.customization,
        generatedImageUrl: state.generatedImageUrl,
        imageStyle: state.imageStyle,
        userId: user?.id,
      });
      toast.success(t("giftBuilder.orderPlaced"));
      onClose();
    } catch {
      toast.error(t("giftBuilder.errorOrder"));
      set("isPlacingOrder", false);
    }
  }, [state, user, t, onClose]);

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
          />
        )}
        {state.step === 4 && (
          <GiftStep4Preview
            imageUrl={state.generatedImageUrl}
            imageStyle={state.imageStyle}
            onStyleChange={handleStyleChange}
            onRegenerate={handleRegenerate}
            onPlaceOrder={handlePlaceOrder}
            onBack={() => set("step", 3)}
            selectedProducts={state.selectedProducts}
            isGenerating={state.isGenerating}
            isPlacingOrder={state.isPlacingOrder}
          />
        )}
      </div>
    </div>
  );
}
