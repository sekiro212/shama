export type Lang = "en" | "ar";

type MessageMap = Record<string, { en: string; ar: string }>;

export const messages = {
  // ─── General ───
  welcome: {
    en: "👋 Welcome to Shama Admin Bot! How can I help you today?",
    ar: "👋 مرحباً بك في بوت إدارة شمّة! كيف يمكنني مساعدتك اليوم؟",
  },
  help: {
    en: "I can help you manage products and orders. Just describe what you need — for example: \"Add a new perfume\", \"Update the price of Oud Rose\", \"Show today's orders\".",
    ar: "يمكنني مساعدتك في إدارة المنتجات والطلبات. صف ما تحتاجه — مثلاً: \"أضف عطراً جديداً\"، \"حدّث سعر عود الورد\"، \"أظهر طلبات اليوم\".",
  },

  // ─── Confirmation prompts ───
  confirmCreate: {
    en: "Create this product?",
    ar: "إنشاء هذا المنتج؟",
  },
  confirmUpdate: {
    en: "Apply these changes?",
    ar: "تطبيق هذه التغييرات؟",
  },
  confirmDelete: {
    en: "Delete this product? This cannot be undone.",
    ar: "حذف هذا المنتج؟ لا يمكن التراجع عن هذا.",
  },
  confirmYes: {
    en: "✅ Yes",
    ar: "✅ نعم",
  },
  confirmNo: {
    en: "❌ No",
    ar: "❌ لا",
  },

  // ─── Outcomes ───
  confirmed: {
    en: "✅ Done!",
    ar: "✅ تم!",
  },
  cancelled: {
    en: "❌ Cancelled.",
    ar: "❌ تم الإلغاء.",
  },

  // ─── Status ───
  thinking: {
    en: "⏳ Thinking...",
    ar: "⏳ جاري التفكير...",
  },
  processing: {
    en: "⚙️ Processing...",
    ar: "⚙️ جاري المعالجة...",
  },
  uploading: {
    en: "📤 Uploading image...",
    ar: "📤 جاري رفع الصورة...",
  },

  // ─── Errors ───
  errorGeneral: {
    en: "Something went wrong. Please try again.",
    ar: "حدث خطأ. يرجى المحاولة مرة أخرى.",
  },
  errorTimeout: {
    en: "Request timed out. Please try again.",
    ar: "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى.",
  },
  errorInvalidInput: {
    en: "Invalid input. Please check the data and try again.",
    ar: "مدخلات غير صالحة. يرجى التحقق من البيانات والمحاولة مرة أخرى.",
  },
  errorImageDownload: {
    en: "Failed to download image. Please try again.",
    ar: "فشل تنزيل الصورة. يرجى المحاولة مرة أخرى.",
  },
  errorImageUpload: {
    en: "Failed to upload image. Please try again.",
    ar: "فشل رفع الصورة. يرجى المحاولة مرة أخرى.",
  },

  // ─── Auth ───
  unauthorized: {
    en: "⛔ Unauthorized.",
    ar: "⛔ غير مصرح.",
  },

  // ─── Voice ───
  voiceTranscribed: {
    en: "🎤 Voice: ",
    ar: "🎤 صوت: ",
  },
  voiceTranscribing: {
    en: "🎤 Transcribing voice message...",
    ar: "🎤 جاري تحويل الرسالة الصوتية...",
  },

  // ─── Product CRUD ───
  productCreated: {
    en: "✅ Product created!",
    ar: "✅ تم إنشاء المنتج!",
  },
  productUpdated: {
    en: "✅ Product updated!",
    ar: "✅ تم تحديث المنتج!",
  },
  productDeleted: {
    en: "✅ Product deleted!",
    ar: "✅ تم حذف المنتج!",
  },
  noProductFound: {
    en: "No product found.",
    ar: "لم يتم العثور على منتج.",
  },
  multipleProductsFound: {
    en: "Multiple products found. Please be more specific.",
    ar: "تم العثور على منتجات متعددة. يرجى التحديد أكثر.",
  },

  // ─── Orders ───
  noOrdersFound: {
    en: "No orders found for the selected period.",
    ar: "لم يتم العثور على طلبات للفترة المحددة.",
  },
  orderStatusUpdated: {
    en: "✅ Order status updated.",
    ar: "✅ تم تحديث حالة الطلب.",
  },
} satisfies MessageMap;

/**
 * Returns the translated string for `key` in `lang`.
 * Falls back to English if the Arabic value is missing.
 */
export function t(lang: Lang, key: keyof typeof messages): string {
  const entry = messages[key];
  if (!entry) {
    return key;
  }
  return (lang === "ar" && entry.ar) ? entry.ar : entry.en;
}
