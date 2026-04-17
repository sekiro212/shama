import React, { ComponentType } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

interface QuizOption {
  label: string;
  Icon: ComponentType<{ className?: string }>;
  value: string;
}

interface QuizStepProps {
  question: string;
  subtitle: string;
  options: QuizOption[];
  onSelect: (value: string) => void;
  selected?: string;
}

function QuizStepComponent({
  question,
  subtitle,
  options,
  onSelect,
  selected,
}: QuizStepProps) {
  const reduce = useReducedMotion();

  const containerVariants = reduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: { staggerChildren: 0.06, delayChildren: 0.08 },
        },
      };

  const itemVariants = reduce
    ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 16, scale: 0.96 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: "spring" as const, stiffness: 280, damping: 24 },
        },
      };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Question */}
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
        animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-8 sm:mb-10 px-2"
      >
        <h2 className="font-display text-2xl sm:text-3xl md:text-[34px] font-semibold text-[#1E2A3D] dark:text-[#F5F5F5] mb-2.5 leading-[1.15] tracking-tight">
          {question}
        </h2>
        <p className="text-[#6B7B8D] dark:text-white/60 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          {subtitle}
        </p>
      </motion.div>

      {/* Options Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`grid gap-3 sm:gap-4 ${
          options.length <= 3
            ? "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-2 md:grid-cols-4"
        }`}
      >
        {options.map((option) => {
          const isSelected = selected === option.value;
          const Icon = option.Icon;

          return (
            <motion.button
              key={option.value}
              variants={itemVariants}
              whileHover={reduce ? undefined : { y: -3 }}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              onClick={() => onSelect(option.value)}
              aria-pressed={isSelected}
              className={`relative group flex flex-col items-center justify-center gap-3 sm:gap-4 p-5 sm:p-6 min-h-[140px] sm:min-h-[170px] rounded-2xl border transition-all duration-300 cursor-pointer ${
                isSelected
                  ? "bg-warm/15 border-warm shadow-[0_0_28px_-8px_rgba(212,165,116,0.45)]"
                  : "glass-card border-[#323D50]/10 dark:border-white/10 hover:border-warm/40 hover:bg-warm/5"
              }`}
            >
              {/* Icon pill */}
              <span
                className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl transition-all duration-300 ${
                  isSelected
                    ? "bg-warm/25 text-warm ring-1 ring-warm/50"
                    : "bg-warm/10 text-warm group-hover:bg-warm/20"
                }`}
              >
                <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </span>

              {/* Label */}
              <span
                className={`font-display text-sm sm:text-base font-semibold text-center leading-tight transition-colors duration-300 ${
                  isSelected
                    ? "text-warm"
                    : "text-[#1E2A3D] dark:text-white/85 group-hover:text-warm"
                }`}
              >
                {option.label}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={reduce ? { opacity: 0 } : { scale: 0 }}
                  animate={reduce ? { opacity: 1 } : { scale: 1 }}
                  className="absolute top-2.5 end-2.5 w-5 h-5 rounded-full bg-warm flex items-center justify-center shadow-[0_0_10px_rgba(212,165,116,0.6)]"
                  aria-hidden
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}

export default React.memo(QuizStepComponent);
