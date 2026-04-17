import { useState, ComponentType } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sun,
  Moon,
  Briefcase,
  PartyPopper,
  TestTube,
  PillBottle,
  Layers,
  Droplet,
  Flower,
  Trees,
  Flame,
  Feather,
  Waves,
  Zap,
  User,
  Users,
  Crown,
  Gem,
  Coins,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import QuizStep from "@/components/quiz/QuizStep";
import QuizResults from "@/components/quiz/QuizResults";
import { getQuizRecommendations, getScentDNACard, ScentDNACard } from "@/services/aiService";
import { useLanguage } from "@/contexts/LanguageContext";
import { trackEvent } from "@/services/trackingService";

type Icon = ComponentType<{ className?: string }>;

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 200 : -200, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -200 : 200, opacity: 0 }),
};

export default function FragranceQuizPage() {
  const { t } = useLanguage();
  const reduce = useReducedMotion();

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [direction, setDirection] = useState(1);
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<
    { name: string; matchScore: number; reason: string }[]
  >([]);
  const [dnaCard, setDnaCard] = useState<ScentDNACard | null>(null);

  // Budget options depend on the chosen format
  const budgetOptions: { label: string; Icon: Icon; value: string }[] = (() => {
    const fmt = answers.format;
    if (fmt === "sample") return [
      { label: t("quiz.budget.sample_under50"),   Icon: Droplet, value: "sample_under_50" },
      { label: t("quiz.budget.sample_50_150"),    Icon: Coins,   value: "sample_50_150" },
      { label: t("quiz.budget.sample_150_350"),   Icon: Gem,     value: "sample_150_350" },
      { label: t("quiz.budget.sample_350plus"),   Icon: Crown,   value: "sample_350plus" },
    ];
    if (fmt === "full_bottle") return [
      { label: t("quiz.budget.bottle_370_700"),   Icon: Coins,   value: "bottle_370_700" },
      { label: t("quiz.budget.bottle_700_1100"),  Icon: Gem,     value: "bottle_700_1100" },
      { label: t("quiz.budget.bottle_1100_2000"), Icon: Trophy,  value: "bottle_1100_2000" },
      { label: t("quiz.budget.bottle_2000plus"),  Icon: Crown,   value: "bottle_2000plus" },
    ];
    return [
      { label: t("quiz.budget.both_under200"),    Icon: Droplet, value: "both_under_200" },
      { label: t("quiz.budget.both_200_700"),     Icon: Coins,   value: "both_200_700" },
      { label: t("quiz.budget.both_700_1500"),    Icon: Gem,     value: "both_700_1500" },
      { label: t("quiz.budget.both_1500plus"),    Icon: Crown,   value: "both_1500plus" },
    ];
  })();

  const quizSteps = [
    {
      id: "occasion",
      question: t("quiz.occasion.question"),
      subtitle: t("quiz.occasion.subtitle"),
      options: [
        { label: t("quiz.occasion.dailyWear"),    Icon: Sun as Icon,          value: "daily" },
        { label: t("quiz.occasion.dateNight"),    Icon: Moon as Icon,         value: "date_night" },
        { label: t("quiz.occasion.office"),       Icon: Briefcase as Icon,    value: "office" },
        { label: t("quiz.occasion.specialEvent"), Icon: PartyPopper as Icon,  value: "special_event" },
      ],
    },
    {
      id: "format",
      question: t("quiz.format.question"),
      subtitle: t("quiz.format.subtitle"),
      options: [
        { label: t("quiz.format.sample"),     Icon: TestTube as Icon,   value: "sample" },
        { label: t("quiz.format.fullBottle"), Icon: PillBottle as Icon, value: "full_bottle" },
        { label: t("quiz.format.both"),       Icon: Layers as Icon,     value: "both" },
      ],
    },
    {
      id: "scentFamily",
      question: t("quiz.scentFamily.question"),
      subtitle: t("quiz.scentFamily.subtitle"),
      options: [
        { label: t("quiz.scentFamily.freshClean"),    Icon: Droplet as Icon, value: "fresh" },
        { label: t("quiz.scentFamily.floral"),        Icon: Flower as Icon,  value: "floral" },
        { label: t("quiz.scentFamily.woody"),         Icon: Trees as Icon,   value: "woody" },
        { label: t("quiz.scentFamily.orientalSweet"), Icon: Flame as Icon,   value: "oriental" },
      ],
    },
    {
      id: "intensity",
      question: t("quiz.intensity.question"),
      subtitle: t("quiz.intensity.subtitle"),
      options: [
        { label: t("quiz.intensity.lightSubtle"),  Icon: Feather as Icon, value: "light" },
        { label: t("quiz.intensity.moderate"),     Icon: Waves as Icon,   value: "moderate" },
        { label: t("quiz.intensity.boldPowerful"), Icon: Zap as Icon,     value: "bold" },
      ],
    },
    {
      id: "gender",
      question: t("quiz.gender.question"),
      subtitle: t("quiz.gender.subtitle"),
      options: [
        { label: t("quiz.gender.forMen"),   Icon: User as Icon,     value: "men" },
        { label: t("quiz.gender.forWomen"), Icon: User as Icon,     value: "women" },
        { label: t("quiz.gender.unisex"),   Icon: Users as Icon,    value: "unisex" },
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

    setTimeout(async () => {
      if (currentStep < totalSteps - 1) {
        setDirection(1);
        setCurrentStep((prev) => prev + 1);
      } else {
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
    <div className="min-h-screen pt-24 md:pt-28 pb-16 px-3 sm:px-4 relative">
      {/* Candlelit background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-warm/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-[#5B8DD9]/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-warm-glow/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Page Header — hidden on results (QuizResults has its own) */}
        {!showResults && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -14 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10 sm:mb-12"
          >
            <div className="inline-flex items-center justify-center gap-2 glass bg-warm/10 border border-warm/40 rounded-full px-4 py-2 mb-4">
              <Sparkles className="w-4 h-4 text-warm" />
              <span className="font-display text-[11px] tracking-[0.28em] uppercase text-warm">
                {t("quiz.eyebrow")}
              </span>
            </div>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight text-[#1E2A3D] dark:text-[#F5F5F5] leading-[1.05] mb-3">
              {t("quiz.title")}
            </h1>
            <p className="text-[#6B7B8D] dark:text-white/65 text-sm sm:text-base md:text-lg max-w-xl mx-auto leading-relaxed">
              {t("quiz.description")}
            </p>
          </motion.div>
        )}

        {/* Quiz Container */}
        {!showResults && (
          <>
            {/* Progress Section */}
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18 }}
              className="mb-8 sm:mb-10"
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="font-display text-[11px] tracking-[0.22em] uppercase text-warm tabular-nums">
                  {t("quiz.stepOf").replace("{current}", String(currentStep + 1)).replace("{total}", String(totalSteps))}
                </span>
                <span className="font-display text-[11px] tracking-[0.22em] uppercase text-warm/70 tabular-nums">
                  {Math.round(progress)}%
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[#323D50]/10 dark:bg-white/10 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-warm to-warm-glow shadow-[0_0_12px_rgba(212,165,116,0.4)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </motion.div>

            {/* Quiz Steps */}
            <div className="relative overflow-hidden min-h-[360px] sm:min-h-[440px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={reduce ? undefined : slideVariants}
                  initial={reduce ? { opacity: 0 } : "enter"}
                  animate={reduce ? { opacity: 1 } : "center"}
                  exit={reduce ? { opacity: 0 } : "exit"}
                  transition={reduce
                    ? { duration: 0.25 }
                    : { x: { type: "spring", stiffness: 260, damping: 28 }, opacity: { duration: 0.2 } }}
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
              initial={reduce ? { opacity: 0 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex items-center justify-between gap-2 mt-8 sm:mt-10"
            >
              <Button
                onClick={handleBack}
                disabled={currentStep === 0}
                variant="ghost"
                className={`glass border border-warm/20 text-[#6B7B8D] dark:text-white/70 hover:text-warm dark:hover:text-warm hover:bg-warm/10 hover:border-warm/40 rounded-xl px-4 sm:px-5 py-3 min-h-[44px] font-medium transition-all duration-300 ${
                  currentStep === 0 ? "invisible pointer-events-none" : ""
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
                        ? "w-7 bg-gradient-to-r from-warm to-warm-glow"
                        : index < currentStep
                          ? "w-2 bg-warm/50"
                          : "w-2 bg-[#323D50]/20 dark:bg-white/20"
                    }`}
                  />
                ))}
              </div>

              <div
                className={`hidden sm:flex items-center gap-2 text-warm/70 font-display text-xs tracking-[0.22em] uppercase ${
                  currentStep === totalSteps - 1 ? "invisible" : ""
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
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <QuizResults
              recommendations={recommendations}
              isLoading={isLoading}
              dnaCard={dnaCard}
              quizAnswers={answers}
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12"
            >
              <Button
                onClick={handleBack}
                variant="ghost"
                className="glass border border-warm/20 text-[#6B7B8D] dark:text-white/70 hover:text-warm hover:bg-warm/10 hover:border-warm/40 rounded-xl px-6 py-3 min-h-[44px] font-medium transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 me-2" />
                {t("quiz.changeLastAnswer")}
              </Button>

              <Button
                onClick={handleRestart}
                className="bg-gradient-to-r from-[#5B8DD9] to-[#3E6BB5] hover:from-[#3E6BB5] hover:to-[#5B8DD9] text-white rounded-xl px-6 py-3 min-h-[44px] font-semibold transition-all duration-300 glow-warm-hover"
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
