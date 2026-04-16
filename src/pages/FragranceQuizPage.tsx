import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import QuizStep from "@/components/quiz/QuizStep";
import QuizResults from "@/components/quiz/QuizResults";
import { getQuizRecommendations, getScentDNACard, ScentDNACard } from "@/services/aiService";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackEvent } from "@/services/trackingService";

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
  const { t } = useLanguage();

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<
    { name: string; matchScore: number; reason: string }[]
  >([]);
  const [dnaCard, setDnaCard] = useState<ScentDNACard | null>(null);

  // Quiz configuration (inside component so t() and answers are available)
  const budgetOptions = (() => {
    const fmt = answers.format;
    if (fmt === "sample") return [
      { label: t("quiz.budget.sample_under50"),   icon: "💧", value: "sample_under_50" },
      { label: t("quiz.budget.sample_50_150"),    icon: "🧪", value: "sample_50_150" },
      { label: t("quiz.budget.sample_150_350"),   icon: "💎", value: "sample_150_350" },
      { label: t("quiz.budget.sample_350plus"),   icon: "👑", value: "sample_350plus" },
    ];
    if (fmt === "full_bottle") return [
      { label: t("quiz.budget.bottle_370_700"),   icon: "💰", value: "bottle_370_700" },
      { label: t("quiz.budget.bottle_700_1100"),  icon: "💎", value: "bottle_700_1100" },
      { label: t("quiz.budget.bottle_1100_2000"), icon: "🏆", value: "bottle_1100_2000" },
      { label: t("quiz.budget.bottle_2000plus"),  icon: "👑", value: "bottle_2000plus" },
    ];
    return [
      { label: t("quiz.budget.both_under200"),    icon: "💧", value: "both_under_200" },
      { label: t("quiz.budget.both_200_700"),     icon: "💰", value: "both_200_700" },
      { label: t("quiz.budget.both_700_1500"),    icon: "💎", value: "both_700_1500" },
      { label: t("quiz.budget.both_1500plus"),    icon: "👑", value: "both_1500plus" },
    ];
  })();

  const quizSteps = [
    {
      id: "occasion",
      question: t("quiz.occasion.question"),
      subtitle: t("quiz.occasion.subtitle"),
      options: [
        { label: t("quiz.occasion.dailyWear"),    icon: "☀️",  value: "daily" },
        { label: t("quiz.occasion.dateNight"),    icon: "🌙",  value: "date_night" },
        { label: t("quiz.occasion.office"),       icon: "💼",  value: "office" },
        { label: t("quiz.occasion.specialEvent"), icon: "🎉",  value: "special_event" },
      ],
    },
    {
      id: "format",
      question: t("quiz.format.question"),
      subtitle: t("quiz.format.subtitle"),
      options: [
        { label: t("quiz.format.sample"),     icon: "🧪", value: "sample" },
        { label: t("quiz.format.fullBottle"), icon: "🍾", value: "full_bottle" },
        { label: t("quiz.format.both"),       icon: "✨", value: "both" },
      ],
    },
    {
      id: "scentFamily",
      question: t("quiz.scentFamily.question"),
      subtitle: t("quiz.scentFamily.subtitle"),
      options: [
        { label: t("quiz.scentFamily.freshClean"),    icon: "💧", value: "fresh" },
        { label: t("quiz.scentFamily.floral"),        icon: "🌹", value: "floral" },
        { label: t("quiz.scentFamily.woody"),         icon: "🌲", value: "woody" },
        { label: t("quiz.scentFamily.orientalSweet"), icon: "🍯", value: "oriental" },
      ],
    },
    {
      id: "intensity",
      question: t("quiz.intensity.question"),
      subtitle: t("quiz.intensity.subtitle"),
      options: [
        { label: t("quiz.intensity.lightSubtle"),  icon: "🌬️", value: "light" },
        { label: t("quiz.intensity.moderate"),     icon: "💨",  value: "moderate" },
        { label: t("quiz.intensity.boldPowerful"), icon: "🔥",  value: "bold" },
      ],
    },
    {
      id: "gender",
      question: t("quiz.gender.question"),
      subtitle: t("quiz.gender.subtitle"),
      options: [
        { label: t("quiz.gender.forMen"),   icon: "👨", value: "men" },
        { label: t("quiz.gender.forWomen"), icon: "👩", value: "women" },
        { label: t("quiz.gender.unisex"),   icon: "✨", value: "unisex" },
      ],
    },
    {
      id: "budget",
      question: t("quiz.budget.question"),
      subtitle: t("quiz.budget.subtitle"),
      options: budgetOptions,
    },
  ];

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
          const month = new Date().getMonth();
          const inferredSeason =
            month >= 2 && month <= 4 ? "spring" :
            month >= 5 && month <= 7 ? "summer" :
            month >= 8 && month <= 10 ? "autumn" : "winter";

          const [results, dna] = await Promise.all([
            getQuizRecommendations(newAnswers),
            getScentDNACard({ ...newAnswers, season: inferredSeason }),
          ]);
          setRecommendations(results);
          setDnaCard(dna);
          trackEvent("quiz_completion", {
            answers: newAnswers,
            recommendation_names: results.map((r) => r.name),
            recommendation_scores: results.map((r) => r.matchScore),
          });
          if (dna) {
            trackEvent("scent_dna_generated", {
              archetype: dna.archetype,
              families: dna.families,
              signatureNotes: dna.signatureNotes,
            });
          }
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
    <div className="min-h-screen pt-20 md:pt-24 pb-16 px-3 sm:px-4 relative">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-[#5B8DD9]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-[#3E6BB5]/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Page Header — hidden when showing results (QuizResults has its own header) */}
        {!showResults && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-6 sm:mb-10"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#5B8DD9] flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold gradient-text leading-tight">
                {t("quiz.title")}
              </h1>
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[#5B8DD9] flex-shrink-0" />
            </div>
            <p className="text-[#6B7B8D] dark:text-white/50 text-xs sm:text-sm md:text-base max-w-md mx-auto px-2">
              {t("quiz.description")}
            </p>
          </motion.div>
        )}

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
            <div className="relative overflow-hidden min-h-[320px] sm:min-h-[400px]">
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
              className="flex items-center justify-between gap-2 mt-6 sm:mt-8"
            >
              {/* Back Button */}
              <Button
                onClick={handleBack}
                disabled={currentStep === 0}
                variant="ghost"
                className={`glass border border-[#323D50]/10 dark:border-white/10 text-[#6B7B8D] dark:text-white/70 hover:text-[#323D50] dark:hover:text-white hover:bg-[#5B8DD9]/10 dark:hover:bg-white/10 rounded-xl px-4 sm:px-5 py-3 min-h-[48px] font-medium transition-all duration-300 ${
                  currentStep === 0
                    ? "opacity-0 pointer-events-none"
                    : "opacity-100"
                }`}
              >
                <ArrowLeft className="w-4 h-4 me-1 sm:me-2" />
                <span className="text-sm sm:text-base">{t("quiz.back")}</span>
              </Button>

              {/* Step dots */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                {quizSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? "w-5 sm:w-6 bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5]"
                        : index < currentStep
                        ? "w-2 bg-[#5B8DD9]/60"
                        : "w-2 bg-[#323D50]/20 dark:bg-white/20"
                    }`}
                  />
                ))}
              </div>

              {/* Next indicator - hidden on mobile (no horizontal room) */}
              <div
                className={`hidden sm:flex items-center gap-2 text-[#6B7B8D] dark:text-white/40 text-sm ${
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
