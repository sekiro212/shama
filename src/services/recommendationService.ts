/**
 * recommendationService.ts
 * ------------------------
 * وحدة رقيقة لإعادة التصدير (barrel/re-export). منطق التوصيات الفعلي موجود في
 * `aiService.ts` (يستدعي OpenRouter لتحويل إجابات الاختبار إلى منتجات مختارة).
 * يكتفي هذا الملف بإعادة تصدير `getQuizRecommendations` باسم موجّه نحو المجال
 * بحيث يمكن للمكوّنات استيراد "التوصيات" دون الاعتماد على تفاصيل وحدة الـ AI.
 */
// يعيد هذا الملف التصدير من aiService من أجل استيرادات نظيفة
export { getQuizRecommendations } from "./aiService";
