import { motion } from "framer-motion";

interface QuizStepProps {
  question: string;
  subtitle: string;
  options: { label: string; icon: string; value: string }[];
  onSelect: (value: string) => void;
  selected?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
};

export default function QuizStep({
  question,
  subtitle,
  options,
  onSelect,
  selected,
}: QuizStepProps) {
  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Question */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center mb-6 sm:mb-8 px-2"
      >
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold gradient-text mb-2 leading-tight">
          {question}
        </h2>
        <p className="text-[#6B7B8D] dark:text-white/50 text-xs sm:text-sm md:text-base">{subtitle}</p>
      </motion.div>

      {/* Options Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={`grid gap-3 sm:gap-4 ${
          options.length <= 3
            ? "grid-cols-1 sm:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
        }`}
      >
        {options.map((option) => {
          const isSelected = selected === option.value;

          return (
            <motion.button
              key={option.value}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(option.value)}
              className={`relative group flex flex-col items-center justify-center gap-2 sm:gap-3 p-4 sm:p-6 min-h-[100px] sm:min-h-[140px] rounded-2xl backdrop-blur-md border transition-all duration-300 cursor-pointer ${
                isSelected
                  ? "bg-gradient-to-br from-[#5B8DD9]/30 to-[#3E6BB5]/20 border-[#5B8DD9] shadow-lg shadow-[#5B8DD9]/25"
                  : "glass-card border-[#323D50]/10 dark:border-white/10 hover:border-[#5B8DD9]/50 hover:shadow-lg hover:shadow-[#5B8DD9]/10"
              }`}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-[#5B8DD9]/10 to-[#3E6BB5]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />

              {/* Icon */}
              <span className="text-3xl sm:text-4xl md:text-5xl transition-transform duration-300 group-hover:scale-110">
                {option.icon}
              </span>

              {/* Label */}
              <span
                className={`text-xs sm:text-sm md:text-base font-semibold text-center leading-tight transition-colors duration-300 ${
                  isSelected ? "text-white" : "text-[#323D50] dark:text-white/80 group-hover:text-[#5B8DD9] dark:group-hover:text-white"
                }`}
              >
                {option.label}
              </span>

              {/* Selected indicator */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 end-2 sm:top-3 sm:end-3 w-5 h-5 rounded-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] flex items-center justify-center"
                >
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
}
