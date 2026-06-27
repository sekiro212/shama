/**
 * OrderTimeline.tsx
 * ---------------------------------------------------------------------------
 * متتبِّع مرئي لدورة حياة تنفيذ الطلب. بناءً على نص الحالة الحالية، يُبرز مدى
 * تقدّم الطلب عبر خمس مراحل ثابتة (pending ← delivered). يُستخدم داخل
 * OrderDetailView في صفحة حساب المستخدم وصفحة تتبّع الطلب العامة معاً.
 *
 * يعرض تخطيطين من البيانات نفسها: خط زمني أفقي على الحاسوب، وآخر عمودي على
 * الهاتف. التسميات ثنائية اللغة تأتي من مفاتيح الترجمة.
 */
import {
  Clock,
  CheckCircle,
  Package,
  Truck,
  Home,
  ClipboardCheck,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface OrderTimelineProps {
  /** مفتاح الحالة الحالية للطلب (مثل "pending" أو "shipped"). */
  currentStatus: string;
}

/**
 * يعرض خط تقدّم الطلب، فيُعلّم المراحل التي قبل الحالية كمكتملة، والحالية كنشطة،
 * واللاحقة كقادمة.
 */
const OrderTimeline = ({ currentStatus }: OrderTimelineProps) => {
  const { t, isRTL } = useLanguage();

  // قائمة ثابتة ومرتّبة بمراحل التنفيذ مع أيقونة وتسمية مترجمة لكل مرحلة.
  const steps = [
    { key: "pending", label: t("timeline.pending"), icon: Clock },
    { key: "confirmed", label: t("timeline.confirmed"), icon: ClipboardCheck },
    { key: "processing", label: t("timeline.processing"), icon: Package },
    { key: "shipped", label: t("timeline.shipped"), icon: Truck },
    { key: "delivered", label: t("timeline.delivered"), icon: Home },
  ];
  // ترتيب الحالة الحالية داخل `steps`؛ كل ما قبلها "مكتمل" وكل ما بعدها "قادم".
  // يكون -1 إذا كانت الحالة غير معروفة.
  const currentIndex = steps.findIndex((step) => step.key === currentStatus);

  return (
    <>
      {/* Desktop: Horizontal Timeline */}
      <div className="hidden md:flex items-center justify-between w-full">
        {steps.map((step, index) => {
          // استنتج الحالة المرئية لكل مرحلة من موضعها مقارنةً بـ currentIndex.
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step */}
              <div className="flex flex-col items-center relative">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                    isCompleted
                      ? "bg-green-500/20 border-2 border-green-500 shadow-lg shadow-green-500/20"
                      : isCurrent
                      ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] shadow-lg shadow-[#5B8DD9]/30"
                      : "bg-white dark:bg-white/5 border-2 border-[#323D50]/10 dark:border-white/10"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <StepIcon
                      className={`w-6 h-6 ${
                        isCurrent ? "text-white" : "text-[#323D50]/30 dark:text-white/30"
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`mt-3 text-sm font-medium whitespace-nowrap ${
                    isCompleted
                      ? "text-green-400"
                      : isCurrent
                      ? "text-[#323D50] dark:text-white"
                      : "text-[#323D50]/30 dark:text-white/30"
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-3 mt-[-24px]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      index < currentIndex
                        ? "bg-green-500"
                        : index === currentIndex
                        ? "bg-gradient-to-r from-[#5B8DD9] to-white/10"
                        : "bg-[#323D50]/10 dark:bg-white/10"
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile: Vertical Timeline */}
      <div className="flex md:hidden flex-col gap-0">
        {steps.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const StepIcon = step.icon;

          return (
            <div key={step.key} className="flex items-start gap-4">
              {/* Icon + Line Column */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                    isCompleted
                      ? "bg-green-500/20 border-2 border-green-500 shadow-lg shadow-green-500/20"
                      : isCurrent
                      ? "bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] shadow-lg shadow-[#5B8DD9]/30"
                      : "bg-white dark:bg-white/5 border-2 border-[#323D50]/10 dark:border-white/10"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <StepIcon
                      className={`w-5 h-5 ${
                        isCurrent ? "text-white" : "text-[#323D50]/30 dark:text-white/30"
                      }`}
                    />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-0.5 h-8 transition-all duration-500 ${
                      index < currentIndex
                        ? "bg-green-500"
                        : index === currentIndex
                        ? "bg-gradient-to-b from-[#5B8DD9] to-white/10"
                        : "bg-[#323D50]/10 dark:bg-white/10"
                    }`}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pt-2 pb-4">
                <span
                  className={`text-sm font-medium ${
                    isCompleted
                      ? "text-green-400"
                      : isCurrent
                      ? "text-[#323D50] dark:text-white"
                      : "text-[#323D50]/30 dark:text-white/30"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export default OrderTimeline;
