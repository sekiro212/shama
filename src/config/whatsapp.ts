/**
 * whatsapp.ts
 * -------------------------------------------------------------------------
 * إعداد الطلب عبر واتساب.
 *
 * الرقم يُقرأ من متغيّر البيئة `VITE_WHATSAPP_NUMBER` بصيغة دولية بلا رموز
 * (مثال ليبيا: 218911234567). إن لم يُضبط، يختفي خيار واتساب من صفحة الدفع
 * تلقائيًا — أفضل من عرض زر يفتح محادثة مع رقم فارغ.
 *
 * ملاحظة: الطلب يُسجَّل في جدول orders أولًا ثم تُفتح المحادثة، فلا نفقد
 * سجلّ الطلب ولا تتبّع فانكس لمجرّد أن العميل يفضّل الواتساب.
 * -------------------------------------------------------------------------
 */

/** رقم واتساب المتجر بصيغة دولية بلا "+" أو مسافات، أو "" إن لم يُضبط. */
export const WHATSAPP_NUMBER = (
  import.meta.env.VITE_WHATSAPP_NUMBER ?? ""
).replace(/[^\d]/g, "");

/** هل خيار الطلب عبر واتساب متاح؟ */
export const isWhatsAppEnabled = () => WHATSAPP_NUMBER.length > 0;

interface WhatsAppOrderLine {
  name: string;
  quantity: number;
  price: number;
  size?: string;
}

interface WhatsAppOrderPayload {
  orderId: string;
  items: WhatsAppOrderLine[];
  total: number;
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  placeName: string;
  isRTL: boolean;
}

/**
 * تبني رسالة واتساب مقروءة تحتوي رقم الطلب والأصناف والإجمالي والعنوان،
 * وتُعيد رابط wa.me جاهزًا للفتح.
 *
 * الرسالة تُكتب بلغة الواجهة الحالية حتى يقرأها العميل والبائع بنفس اللغة.
 */
export function buildWhatsAppOrderUrl(o: WhatsAppOrderPayload): string {
  const ref = o.orderId.slice(0, 8).toUpperCase();
  const money = (n: number) => `${Math.round(n)} LYD`;
  const lines = o.items.map(
    (i) =>
      `• ${i.name}${i.size ? ` (${i.size})` : ""} ×${i.quantity} — ${money(
        i.price * i.quantity,
      )}`,
  );

  const body = o.isRTL
    ? [
        `طلب جديد من shama.ly`,
        `رقم الطلب: #${ref}`,
        ``,
        ...lines,
        ``,
        `الإجمالي: ${money(o.total)}`,
        ``,
        `الاسم: ${o.firstName} ${o.lastName}`,
        `الهاتف: ${o.phone}`,
        `العنوان: ${o.city} — ${o.placeName}`,
      ]
    : [
        `New order from shama.ly`,
        `Order: #${ref}`,
        ``,
        ...lines,
        ``,
        `Total: ${money(o.total)}`,
        ``,
        `Name: ${o.firstName} ${o.lastName}`,
        `Phone: ${o.phone}`,
        `Address: ${o.city} — ${o.placeName}`,
      ];

  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    body.join("\n"),
  )}`;
}
