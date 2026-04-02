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
  currentStatus: string;
}

const OrderTimeline = ({ currentStatus }: OrderTimelineProps) => {
  const { t, isRTL } = useLanguage();

  const steps = [
    { key: "pending", label: t("timeline.pending"), icon: Clock },
    { key: "confirmed", label: t("timeline.confirmed"), icon: ClipboardCheck },
    { key: "processing", label: t("timeline.processing"), icon: Package },
    { key: "shipped", label: t("timeline.shipped"), icon: Truck },
    { key: "delivered", label: t("timeline.delivered"), icon: Home },
  ];
  const currentIndex = steps.findIndex((step) => step.key === currentStatus);

  return (
    <>
      {/* Desktop: Horizontal Timeline */}
      <div className="hidden md:flex items-center justify-between w-full">
        {steps.map((step, index) => {
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
