import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuizStep from "@/components/quiz/QuizStep";
import QuizResults from "@/components/quiz/QuizResults";
import { getQuizRecommendations, getScentDNACard, ScentDNACard } from "@/services/aiService";
import { useLanguage } from "@/contexts/LanguageContext";

// Animation variants for slide transitions
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

export default function FragranceQuizPage() {
  const { t, isRTL } = useLanguage();

  // Quiz configuration (inside component so t() is available)
  const quizSteps = [
    {
      id: "occasion",
      question: t("quiz.occasion.question"),
      subtitle: t("quiz.occasion.subtitle"),
      options: [
        { label: t("quiz.occasion.dailyWear"), icon: "\u2600\uFE0F", value: "daily" },
        { label: t("quiz.occasion.dateNight"), icon: "\uD83C\uDF19", value: "date_night" },
        { label: t("quiz.occasion.office"), icon: "\uD83D\uDCBC", value: "office" },
        { label: t("quiz.occasion.specialEvent"), icon: "\uD83C\uDF89", value: "special_event" },
      ],
    },
    {
      id: "season",
      question: t("quiz.season.question"),
      subtitle: t("quiz.season.subtitle"),
      options: [
        { label: t("quiz.season.spring"), icon: "\uD83C\uDF38", value: "spring" },
        { label: t("quiz.season.summer"), icon: "\uD83C\uDF1E", value: "summer" },
        { label: t("quiz.season.autumn"), icon: "\uD83C\uDF42", value: "autumn" },
        { label: t("quiz.season.winter"), icon: "\u2744\uFE0F", value: "winter" },
      ],
    },
    {
      id: "scentFamily",
      question: t("quiz.scentFamily.question"),
      subtitle: t("quiz.scentFamily.subtitle"),
      options: [
        { label: t("quiz.scentFamily.freshClean"), icon: "\uD83D\uDCA7", value: "fresh" },
        { label: t("quiz.scentFamily.floral"), icon: "\uD83C\uDF39", value: "floral" },
        { label: t("quiz.scentFamily.woody"), icon: "\uD83C\uDF32", value: "woody" },
        { label: t("quiz.scentFamily.orientalSweet"), icon: "\uD83C\uDF6F", value: "oriental" },
      ],
    },
    {
      id: "intensity",
      question: t("quiz.intensity.question"),
      subtitle: t("quiz.intensity.subtitle"),
      options: [
        { label: t("quiz.intensity.lightSubtle"), icon: "\uD83C\uDF2C\uFE0F", value: "light" },
        { label: t("quiz.intensity.moderate"), icon: "\uD83D\uDCA8", value: "moderate" },
        { label: t("quiz.intensity.boldPowerful"), icon: "\uD83D\uDD25", value: "bold" },
      ],
    },
    {
      id: "gender",
      question: t("quiz.gender.question"),
      subtitle: t("quiz.gender.subtitle"),
      options: [
        { label: t("quiz.gender.forMen"), icon: "\uD83D\uDC68", value: "men" },
        { label: t("quiz.gender.forWomen"), icon: "\uD83D\uDC69", value: "women" },
        { label: t("quiz.gender.unisex"), icon: "\u2728", value: "unisex" },
      ],
    },
    {
      id: "budget",
      question: t("quiz.budget.question"),
      subtitle: t("quiz.budget.subtitle"),
      options: [
        { label: t("quiz.budget.under50"), icon: "\uD83D\uDCB0", value: "under_50" },
        { label: t("quiz.budget.range50_150"), icon: "\uD83D\uDC8E", value: "50_150" },
        { label: t("quiz.budget.range150_200"), icon: "\uD83D\uDC51", value: "150_200" },
        { label: t("quiz.budget.over200"), icon: "\uD83C\uDFC6", value: "200_plus" },
      ],
    },
  ];

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<
    { name: string; matchScore: number; reason: string }[]
  >([]);
  const [dnaCard, setDnaCard] = useState<ScentDNACard | null>(null);

  const totalSteps = quizSteps.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const handleSelect = async (value: string) => {
    const stepId = quizSteps[currentStep].id;
    const newAnswers = { ...answers, [stepId]: value };
    setAnswers(newAnswers);

    // Auto-advance after a brief delay for visual feedback
    setTimeout(async () => {
      if (currentStep < totalSteps - 1) {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      } else {
        // Final step - fetch AI recommendations
        setShowResults(true);
        setIsLoading(true);
        try {
          const [results, dna] = await Promise.all([
            getQuizRecommendations(newAnswers),
            getScentDNACard(newAnswers),
          ]);
          setRecommendations(results);
          setDnaCard(dna);
        } catch (error) {
          console.error("Error getting recommendations:", error);
          setRecommendations([]);
          setDnaCard(null);
        } finally {
          setIsLoading(false);
        }
      }
    }, 300);
  };

  const handleBack = () => {
    if (showResults) {
      setShowResults(false);
      setRecommendations([]);
      return;
    }
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers({});
    setDirection(-1);
    setShowResults(false);
    setRecommendations([]);
    setDnaCard(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen pt-[80px] md:pt-24 pb-16 px-4 relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-[#5B8DD9]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-[#3E6BB5]/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-[#5B8DD9]" />
            <h1 className="text-3xl md:text-4xl font-bold gradient-text">
              {t("quiz.title")}
            </h1>
            <Sparkles className="w-6 h-6 text-[#5B8DD9]" />
          </div>
          <p className="text-[#6B7B8D] dark:text-white/50 text-sm md:text-base max-w-md mx-auto">
            {t("quiz.description")}
          </p>
        </motion.div>

        {/* Quiz Container */}
        {!showResults && (
          <>
            {/* Progress Section */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mb-8"
            >
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[#6B7B8D] dark:text-white/50 text-sm font-medium">
                  {t("quiz.stepOf").replace("{current}", String(currentStep + 1)).replace("{total}", String(totalSteps))}
                </span>
                <span className="text-[#6B7B8D] dark:text-white/50 text-sm font-medium">
                  {Math.round(progress)}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-[#323D50]/10 dark:bg-white/10 overflow-hidden backdrop-blur-sm">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </motion.div>

            {/* Quiz Steps with Animations */}
            <div className="relative overflow-hidden min-h-[400px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  <QuizStep
                    question={quizSteps[currentStep].question}
                    subtitle={quizSteps[currentStep].subtitle}
                    options={quizSteps[currentStep].options}
                    onSelect={handleSelect}
                    selected={answers[quizSteps[currentStep].id]}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Navigation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between mt-8"
            >
              {/* Back Button */}
              <Button
                onClick={handleBack}
                disabled={currentStep === 0}
                variant="ghost"
                className={`glass border border-[#323D50]/10 dark:border-white/10 text-[#6B7B8D] dark:text-white/70 hover:text-[#323D50] dark:hover:text-white hover:bg-[#5B8DD9]/10 dark:hover:bg-white/10 rounded-xl px-5 py-3 font-medium transition-all duration-300 ${
                  currentStep === 0
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100"
                }`}
              >
                <ArrowLeft className="w-4 h-4 me-2" />
                {t("quiz.back")}
              </Button>

              {/* Step dots */}
              <div className="flex items-center gap-2">
                {quizSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? "w-6 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5]"
                        : index < currentStep
                        ? "w-2 bg-[#5B8DD9]/60"
                        : "w-2 bg-[#323D50]/20 dark:bg-white/20"
                    }`}
                  />
                ))}
              </div>

              {/* Next indicator */}
              <div
                className={`flex items-center gap-2 text-[#6B7B8D] dark:text-white/40 text-sm ${
                  currentStep === totalSteps - 1 ? "opacity-0" : "opacity-100"
                }`}
              >
                {t("quiz.selectToContinue")}
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          </>
        )}

        {/* Results Section */}
        {showResults && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <QuizResults
              recommendations={recommendations}
              isLoading={isLoading}
              dnaCard={dnaCard}
              quizAnswers={answers}
            />

            {/* Action buttons below results */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10"
            >
              <Button
                onClick={handleBack}
                variant="ghost"
                className="glass border border-[#323D50]/10 dark:border-white/10 text-[#6B7B8D] dark:text-white/70 hover:text-[#323D50] dark:hover:text-white hover:bg-[#5B8DD9]/10 dark:hover:bg-white/10 rounded-xl px-6 py-3 font-medium transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 me-2" />
                {t("quiz.changeLastAnswer")}
              </Button>

              <Button
                onClick={handleRestart}
                className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white rounded-xl px-6 py-3 font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#5B8DD9]/25"
              >
                <RotateCcw className="w-4 h-4 me-2" />
                {t("quiz.startOver")}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
