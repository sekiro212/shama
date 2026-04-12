export type Lang = "en" | "ar";

type MessageMap = Record<string, { en: string; ar: string }>;

export const messages = {
  // ─── General ───
  welcome: {
    en: "👋 <b>Welcome to Shama AI Admin Bot!</b>\n\n<b>Commands:</b>\n/lang — 🌐 Set language\n/end — 🛑 Cancel current operation\n\n<b>Or just talk to me!</b>\n• <i>\"Update Bleu de Chanel price to 200\"</i>\n• <i>\"Delete Angel Share\"</i>\n• <i>\"Create Dior Sauvage 100ml for men at 300 LYD\"</i>\n• <i>\"Show orders from last 5 hours\"</i>\n• <i>\"How many products do I have?\"</i>\n\nI handle <b>typos</b> and <b>Arabic</b> names! ✨",
    ar: "👋 <b>مرحباً بك في بوت شما الذكي!</b>\n\n<b>الأوامر:</b>\n/lang — 🌐 اختر اللغة\n/end — 🛑 إلغاء العملية الحالية\n\n<b>أو فقط تحدث معي!</b>\n• <i>\"حدّث سعر بلو دي شانيل إلى 200\"</i>\n• <i>\"احذف أنجل شير\"</i>\n• <i>\"أنشئ ديور سوفاج 100مل رجالي 300 دينار\"</i>\n• <i>\"أرني طلبات آخر 5 ساعات\"</i>\n\nأتعامل مع <b>الأخطاء الإملائية</b> والأسماء! ✨",
  },
  help: {
    en: "<b>Shama AI Bot</b>\n\nJust type what you need:\n<b>Create:</b> \"Create Dior Sauvage 100ml men 300 LYD\"\n<b>Update:</b> \"Change Bleu de Chanel price to 200\"\n<b>Delete:</b> \"Delete Angel Share\"\n<b>Orders:</b> \"Show orders from last 3 hours\"\n<b>Search:</b> \"How many products?\" or \"Show men perfumes\"\n\n/lang — Change language\n/end — Cancel\n\nHandles typos &amp; Arabic! \"بلو شانيل\" → Bleu de Chanel ✨",
    ar: "<b>بوت شما الذكي</b>\n\nفقط اكتب ما تريد:\n<b>إنشاء:</b> \"أنشئ ديور سوفاج 100مل رجالي 300 دينار\"\n<b>تحديث:</b> \"غير سعر بلو دي شانيل إلى 200\"\n<b>حذف:</b> \"احذف أنجل شير\"\n<b>طلبات:</b> \"أرني طلبات آخر 3 ساعات\"\n\n/lang — تغيير اللغة\n/end — إلغاء\n\nيتعامل مع الأخطاء الإملائية! ✨",
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
  usingTool: {
    en: "🔧 Using tool: {name}",
    ar: "🔧 استخدام الأداة: {name}",
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

  // ─── Image Collection ───
  sendProductPhotos: {
    en: "📸 Now send product photos, say 'generate image' for AI marketing photo, or 'skip' to finish without images.",
    ar: "📸 أرسل صور المنتج الآن، أو قل 'توليد صورة' لصورة تسويقية بالذكاء الاصطناعي، أو 'تخطي' للإنهاء بدون صور.",
  },
  imageSaved: {
    en: "✅ Image {n} saved for {name}. Send more, say 'generate image', or 'done'.",
    ar: "✅ تم حفظ الصورة {n} لـ {name}. أرسل المزيد، أو 'توليد صورة'، أو 'تم'.",
  },
  mediaGroupSaved: {
    en: "✅ {n} photos saved for {name} ({total} total). Send more or 'done'.",
    ar: "✅ تم حفظ {n} صور لـ {name} ({total} إجمالي). أرسل المزيد أو 'تم'.",
  },
  imageCollectionDone: {
    en: "✅ Done! {n} image(s) saved for {name}.",
    ar: "✅ تم! تم حفظ {n} صورة لـ {name}.",
  },
  generatingImage: {
    en: "🎨 Generating AI marketing image...",
    ar: "🎨 جاري توليد صورة تسويقية...",
  },
  imageGenerated: {
    en: "✅ AI image saved for {name}. Send more photos or 'done'.",
    ar: "✅ تم حفظ صورة AI لـ {name}. أرسل المزيد أو 'تم'.",
  },
  imageGenNotAvailable: {
    en: "⚠️ AI image generation not configured. Send a photo instead.",
    ar: "⚠️ توليد الصور غير مُعد. أرسل صورة بدلاً من ذلك.",
  },
  errorImageGeneration: {
    en: "❌ Failed to generate image. Try again or send a photo.",
    ar: "❌ فشل توليد الصورة. حاول مرة أخرى أو أرسل صورة.",
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
