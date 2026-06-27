/**
 * ===========================================================================
 * الملف: i18n.ts
 * الدور: إعداد الترجمة وتعدّد اللغات (configuration).
 * يحتوي قاموس النصوص (dict) للنسختين الإنجليزية والعربية، ودوال مساعدة لجلب
 * النصّ حسب المفتاح واللغة، ولتحديد اتجاه الكتابة (RTL/LTR) وتنسيق الأرقام
 * بالأرقام العربية. كل النصوص الظاهرة في الفيديو تُسحب من هنا.
 * ===========================================================================
 */
// نوع اللغة المدعومة: إنجليزي أو عربي.
export type Lang = "en" | "ar";

/** قاموس كل النصوص الظاهرة في الفيديو، مفهرَس باللغة ثم بمفتاح النص. */
export const dict = {
  // النصوص الإنجليزية (اللغة الافتراضية)
  en: {
    problem_hook: "Buying perfume blind?",
    problem_sub_prefix: "",
    problem_sub_suffix: "LYD. One guess. No returns.",
    solution_title: "Try first. From 3ml.",
    solution_sub: "Samples for the price of a coffee.",
    ai_typed: "something warm for winter nights",
    ai_label: "AI Finder",
    ai_caption: "Just type what you want. We find it.",
    quiz_title: "Take the quiz. Get your scent.",
    quiz_q: "Pick your mood",
    quiz_opt_fresh: "Fresh",
    quiz_opt_warm: "Warm",
    quiz_opt_oud: "Oud",
    quiz_opt_floral: "Floral",
    product_title: "Real perfumes. Fair prices.",
    sample_from_prefix: "Sample from",
    sample_from_suffix: "LYD",
    add_sample: "Add sample",
    full_bottle: "Full bottle",
    delivery_title: "Vanex to your door.",
    delivery_sub: "Tripoli. Benghazi. Misrata. 24–48h.",
    cta_url: "shama.ly",
    cta_tag: "Find your scent.",
  },
  // النصوص العربية (يجب أن تطابق مفاتيحها مفاتيح en تماماً)
  ar: {
    problem_hook: "تشتري عطرك على العمياني؟",
    problem_sub_prefix: "",
    problem_sub_suffix: "دينار. تخمينة واحدة. بدون إرجاع.",
    solution_title: "جرّب الأول. من ٣ مل.",
    solution_sub: "عيّنات بسعر فنجان قهوة.",
    ai_typed: "شي دافي لليالي الشتا",
    ai_label: "البحث الذكي",
    ai_caption: "اكتب اللي تبيه. نلقاه لك.",
    quiz_title: "خذ الاختبار. اكتشف عطرك.",
    quiz_q: "اختار مزاجك",
    quiz_opt_fresh: "منعش",
    quiz_opt_warm: "دافي",
    quiz_opt_oud: "عود",
    quiz_opt_floral: "زهري",
    product_title: "عطور حقيقية. أسعار عادلة.",
    sample_from_prefix: "عيّنة من",
    sample_from_suffix: "دينار",
    add_sample: "أضف العيّنة",
    full_bottle: "قارورة كاملة",
    delivery_title: "فانكس لباب بيتك.",
    delivery_sub: "طرابلس. بنغازي. مصراتة. ٢٤–٤٨ ساعة.",
    cta_url: "shama.ly",
    cta_tag: "اكتشف عطرك.",
  },
} as const;

// نوع مفاتيح النصوص، مشتقّ تلقائياً من مفاتيح القاموس الإنجليزي.
export type Key = keyof typeof dict.en;

/** يجلب النصّ المترجم لمفتاح معيّن حسب اللغة. */
export const t = (key: Key, lang: Lang): string => dict[lang][key];
/** يحدّد ما إذا كانت اللغة من اليمين إلى اليسار (العربية). */
export const isRtl = (lang: Lang): boolean => lang === "ar";
/** يعيد اتجاه الكتابة المناسب للّغة لاستخدامه في خاصية direction. */
export const dir = (lang: Lang): "rtl" | "ltr" => (lang === "ar" ? "rtl" : "ltr");
/** يعيد سهماً موجّهاً حسب اتجاه القراءة (يسار للعربية، يمين للإنجليزية). */
export const arrow = (lang: Lang): "←" | "→" => (lang === "ar" ? "←" : "→");

/** يحوّل الرقم إلى أرقام عربية (٠-٩) في النسخة العربية، ويتركه كما هو في الإنجليزية. */
export const formatPrice = (n: number, lang: Lang): string => {
  if (lang !== "ar") return String(n);
  // جدول تحويل من الأرقام اللاتينية إلى نظيرتها العربية، حرفاً بحرف.
  const map = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  return String(n).replace(/\d/g, (d) => map[Number(d)]);
};
