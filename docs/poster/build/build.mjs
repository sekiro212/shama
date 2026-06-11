import pptxgen from "pptxgenjs";
import QRCode from "qrcode";

// ---------- QR codes ----------
await QRCode.toFile("assets/qr-site.png", "https://shama.ly", {
  width: 600, margin: 1, color: { dark: "#1A2235", light: "#FFFFFF" },
});
await QRCode.toFile("assets/qr-github.png", "https://github.com/shamaLyfg/shama", {
  width: 600, margin: 1, color: { dark: "#1A2235", light: "#FFFFFF" },
});

// ---------- palette ----------
const NAVY = "1A2235";   // dominant dark (site dark bg)
const NAVY2 = "3E6BB5";  // brand darker blue
const ACCENT = "5B8DD9"; // brand primary
const ICE = "CADCFC";
const BAND = "DCE6F5";
const LIGHT = "F8F9FB";
const TEXT = "323D50";
const MUTED = "6B7B8D";
const GOLD = "F0C03E";   // university logo gold
const WHITE = "FFFFFF";

const AR = { fontFace: "Cairo", rtlMode: true };
// pptxgenjs only writes rtl="1" from per-run options on rich-text arrays
const rtl = (runs) => runs.map((r) => ({ ...r, options: { ...(r.options || {}), rtlMode: true } }));
const shadow = () => ({ type: "outer", color: "1A2235", blur: 10, offset: 3, angle: 90, opacity: 0.14 });

// ---------- page ----------
const W = 23.39, H = 33.11; // A1 portrait inches
const pres = new pptxgen();
pres.defineLayout({ name: "A1P", width: W, height: H });
pres.layout = "A1P";
pres.title = "Shama Graduation Poster";
pres.rtlMode = true;

const s = pres.addSlide();
s.background = { color: LIGHT };

// ---------- geometry ----------
const MARGIN = 0.7;
const COLW = 7.03;
const X_L = 0.7, X_M = 8.18, X_R = 15.66; // left, middle, right columns
const PAD = 0.4;

function card(x, y, w, h) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, fill: { color: WHITE }, rectRadius: 0.09,
    line: { color: "E3E9F2", width: 1 }, shadow: shadow(),
  });
}

function sectionHeader(x, y, w, num, title) {
  // number disc on the right (RTL), title to its left
  const d = 0.62;
  s.addShape(pres.shapes.OVAL, { x: x + w - PAD - d, y, w: d, h: d, fill: { color: NAVY2 } });
  s.addText(num, {
    x: x + w - PAD - d, y, w: d, h: d, align: "center", valign: "middle",
    fontSize: 26, bold: true, color: WHITE, fontFace: "Cairo", margin: 0,
  });
  s.addText(title, {
    x: x + PAD, y: y - 0.06, w: w - PAD * 2 - d - 0.25, h: d + 0.12,
    align: "right", valign: "middle", fontSize: 30, bold: true, color: NAVY, ...AR, margin: 0,
  });
}

// =====================================================
// HEADER BAND
// =====================================================
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 3.35, fill: { color: NAVY } });
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 3.35, w: W, h: 0.06, fill: { color: GOLD } });

// university logo on white card (top-right)
s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
  x: 19.35, y: 0.42, w: 3.45, h: 2.5, fill: { color: WHITE }, rectRadius: 0.12,
});
s.addImage({ path: "assets/alrefak-logo.png", x: 19.56, y: 0.76, w: 3.03, h: 1.89 });

// Shama brand mark (top-left)
s.addText("Shama", {
  x: 0.7, y: 0.55, w: 3.6, h: 1.0, align: "left", fontSize: 52, bold: true,
  italic: true, fontFace: "Georgia", color: WHITE, margin: 0,
});
s.addText("شمّة — عطور فاخرة", {
  x: 0.7, y: 1.6, w: 3.6, h: 0.55, align: "left", fontSize: 20, color: GOLD, ...AR, margin: 0,
});
s.addText("shama.ly", {
  x: 0.7, y: 2.2, w: 3.6, h: 0.45, align: "left", fontSize: 17, italic: true,
  fontFace: "Georgia", color: ICE, margin: 0,
});

// title (center)
s.addText("منصة تجارة إلكترونية ذكية لبيع العطور\nمدعومة بالذكاء الاصطناعي", {
  x: 4.6, y: 0.55, w: 14.4, h: 1.85, align: "center", valign: "middle",
  fontSize: 41, bold: true, color: WHITE, ...AR, lineSpacingMultiple: 1.12, margin: 0,
});
s.addText("Shama — AI-Powered Perfume E-Commerce Platform", {
  x: 4.6, y: 2.42, w: 14.4, h: 0.5, align: "center", fontSize: 22, italic: true,
  fontFace: "Georgia", color: ICE, margin: 0,
});

// info band (students + supervisor)
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 3.41, w: W, h: 0.92, fill: { color: BAND } });
s.addText(rtl([
  { text: "إعداد الطلاب:  ", options: { bold: true, color: NAVY } },
  { text: "____________________", options: { color: TEXT } },
]), { x: 12.0, y: 3.41, w: 10.6, h: 0.92, align: "right", valign: "middle", fontSize: 20, ...AR, margin: 0 });
s.addText(rtl([
  { text: "إشراف:  ", options: { bold: true, color: NAVY } },
  { text: "د. ________________", options: { color: TEXT } },
  { text: "      |      كلية تقنية المعلومات · 2025/2026", options: { color: MUTED } },
]), { x: 0.8, y: 3.41, w: 10.6, h: 0.92, align: "right", valign: "middle", fontSize: 20, ...AR, margin: 0 });

// =====================================================
// RIGHT COLUMN — sections 2 & 3
// =====================================================
// --- Card A: الملخص والمشكلة ---
card(X_R, 4.7, COLW, 9.5);
sectionHeader(X_R, 5.0, COLW, "١", "الملخص والمشكلة");
s.addText(
  "التجارة الإلكترونية في ليبيا تنمو بسرعة، لكن قطاع العطور بقي خارج هذا التحول الرقمي. شراء العطر عبر الإنترنت يصطدم بعقبة جوهرية: العميل لا يستطيع شمّ المنتج قبل الشراء. مشروع «شمّة» يعالج هذه الفجوة عبر منصة ويب ثنائية اللغة تستخدم الذكاء الاصطناعي لمساعدة العميل على اختيار العطر المناسب كأنه يتحدث مع بائع خبير.",
  { x: X_R + PAD, y: 5.95, w: COLW - PAD * 2, h: 3.3, align: "right", valign: "top",
    fontSize: 20, color: TEXT, ...AR, lineSpacingMultiple: 1.25, margin: 0 }
);
s.addText("المشكلة", {
  x: X_R + PAD, y: 9.45, w: COLW - PAD * 2, h: 0.55, align: "right",
  fontSize: 24, bold: true, color: NAVY2, ...AR, margin: 0,
});
s.addText(rtl([
  { text: "●  لا يمكن تجربة (شمّ) العطر قبل الشراء أونلاين، ما يسبب تردد العملاء.", options: { breakLine: true } },
  { text: "●  صعوبة الاختيار من بين عشرات العطور دون استشارة خبير.", options: { breakLine: true } },
  { text: "●  غياب منصات ليبية تدعم العربية بالكامل (RTL) بتجربة ذكية.", options: { breakLine: true } },
  { text: "●  إدارة المتجر يدوياً تستهلك وقت وجهد صاحب المتجر.", options: {} },
]), { x: X_R + PAD, y: 10.1, w: COLW - PAD * 2, h: 3.8, align: "right", valign: "top",
  fontSize: 20, color: TEXT, ...AR, lineSpacingMultiple: 1.2, paraSpaceAfter: 10, margin: 0 });

// --- Card B: الحل المقترح ---
card(X_R, 14.65, COLW, 8.6);
sectionHeader(X_R, 14.95, COLW, "٢", "الحل المقترح");
const solutions = [
  ["مساعد ذكاء اصطناعي", "شات بوت يعرف كامل الكتالوج + اختبار شخصية عطرية + بحث ذكي بالوصف الطبيعي."],
  ["نظام العينات", "تجربة العطر بحجم من 3 إلى 30 مل بسعر رمزي قبل شراء الزجاجة — حل مشكلة الشمّ."],
  ["تجارة إلكترونية كاملة", "سلة، كوبونات، أطقم هدايا، قائمة أمنيات، وتتبع لحظي عبر تكامل Vanex."],
  ["إدارة ذكية", "لوحة تحكم + بوت تيليجرام لإدارة المتجر من الهاتف + فلترة المراجعات بالذكاء الاصطناعي."],
  ["تسويق آلي", "تحليل ليلي لاهتمامات كل مستخدم وإرسال إيميلات مخصصة عند وصول عطور تناسبه."],
];
let sy = 15.85;
for (const [t, d] of solutions) {
  s.addShape(pres.shapes.OVAL, { x: X_R + COLW - PAD - 0.18, y: sy + 0.16, w: 0.18, h: 0.18, fill: { color: GOLD } });
  s.addText(rtl([
    { text: t + "  —  ", options: { bold: true, color: NAVY2 } },
    { text: d, options: { color: TEXT } },
  ]), { x: X_R + PAD, y: sy, w: COLW - PAD * 2 - 0.35, h: 1.35, align: "right", valign: "top",
    fontSize: 19, ...AR, lineSpacingMultiple: 1.18, margin: 0 });
  sy += 1.45;
}

// --- Card C: الأهداف ---
card(X_R, 23.7, COLW, 7.4);
sectionHeader(X_R, 24.0, COLW, "٣", "الأهداف");
s.addText(rtl([
  { text: "●  رفع ثقة العميل في شراء العطور أونلاين عبر العينات والمراجعات الموثوقة.", options: { breakLine: true } },
  { text: "●  تقديم توصيات شخصية دقيقة باستخدام نماذج لغوية حديثة LLMs.", options: { breakLine: true } },
  { text: "●  دعم كامل للغة العربية (RTL) والإنجليزية في كل شاشة.", options: { breakLine: true } },
  { text: "●  أتمتة إدارة المتجر والتسويق لتقليل الجهد اليدوي.", options: { breakLine: true } },
  { text: "●  بنية قابلة للتوسع بتكلفة تشغيل منخفضة عبر استضافة ثابتة وخدمات Serverless.", options: {} },
]), { x: X_R + PAD, y: 25.0, w: COLW - PAD * 2, h: 4.6, align: "right", valign: "top",
  fontSize: 20, color: TEXT, ...AR, lineSpacingMultiple: 1.22, paraSpaceAfter: 14, margin: 0 });
// closing takeaway strip fills card bottom
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: X_R + PAD, y: 29.85, w: COLW - PAD * 2, h: 0.95, fill: { color: BAND }, rectRadius: 0.09 });
s.addText("المحصلة: العميل يجرّب قبل أن يشتري، والذكاء الاصطناعي يرشده بلغته.", {
  x: X_R + PAD + 0.15, y: 29.85, w: COLW - PAD * 2 - 0.3, h: 0.95, align: "center", valign: "middle",
  fontSize: 17.5, bold: true, color: NAVY2, ...AR, margin: 0,
});

// =====================================================
// MIDDLE COLUMN — section 4 + screenshots
// =====================================================
// --- Card D: المعمارية والتقنيات ---
card(X_M, 4.7, COLW, 12.4);
sectionHeader(X_M, 5.0, COLW, "٤", "معمارية النظام");

const BOXW = 5.2, BOXX = X_M + (COLW - BOXW) / 2, CX = X_M + COLW / 2;
function diagBox(y, h, lines, fillColor, textColor, x = BOXX, w = BOXW) {
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fillColor }, rectRadius: 0.07 });
  s.addText(rtl(lines), { x, y, w, h, align: "center", valign: "middle", ...AR, margin: 0, color: textColor });
}
function vArrow(x, y1, y2) {
  s.addShape(pres.shapes.LINE, { x, y: y1, w: 0, h: y2 - y1, line: { color: MUTED, width: 2.5, endArrowType: "triangle" } });
}

diagBox(5.95, 0.7, [{ text: "المستخدم (متصفح / هاتف)", options: { fontSize: 17, bold: true } }], BAND, NAVY);
vArrow(CX, 6.65, 6.98);
diagBox(7.0, 1.0, [
  { text: "الواجهة الأمامية — shama.ly", options: { fontSize: 17, bold: true, breakLine: true } },
  { text: "React 18 · TypeScript · Vite · Tailwind", options: { fontSize: 14 } },
], NAVY2, WHITE);
vArrow(CX, 8.02, 8.35);
diagBox(8.37, 1.25, [
  { text: "Supabase — Backend as a Service", options: { fontSize: 17, bold: true, breakLine: true } },
  { text: "PostgreSQL · Auth · Storage · 7 Edge Functions", options: { fontSize: 14 } },
], NAVY, WHITE);
// split arrows
s.addShape(pres.shapes.LINE, { x: CX - 1.55, y: 9.64, w: 1.55, h: 0.32, flipH: true, line: { color: MUTED, width: 2.5, endArrowType: "triangle" } });
s.addShape(pres.shapes.LINE, { x: CX, y: 9.64, w: 1.55, h: 0.32, line: { color: MUTED, width: 2.5, endArrowType: "triangle" } });
diagBox(9.98, 1.2, [
  { text: "OpenRouter AI", options: { fontSize: 16, bold: true, breakLine: true } },
  { text: "GPT-5.2 · Claude 4.6 · Gemini", options: { fontSize: 12.5 } },
], ACCENT, WHITE, X_M + PAD, 3.25);
diagBox(9.98, 1.2, [
  { text: "Vanex API", options: { fontSize: 16, bold: true, breakLine: true } },
  { text: "إنشاء وتتبع الشحنات", options: { fontSize: 12.5 } },
], ACCENT, WHITE, X_M + PAD + 3.55, 2.68);
// telegram bot — dashed link up to Supabase through the gap between the two API boxes
s.addShape(pres.shapes.LINE, { x: 12.0, y: 9.66, w: 0, h: 2.26, flipV: true, line: { color: MUTED, width: 2.5, dashType: "dash", endArrowType: "triangle" } });
diagBox(11.95, 0.95, [
  { text: "بوت تيليجرام (Telegraf) — إدارة المتجر من الهاتف", options: { fontSize: 15, bold: true } },
], GOLD, NAVY, BOXX, BOXW);

// tech chips
s.addText("التقنيات المستخدمة", {
  x: X_M + PAD, y: 13.15, w: COLW - PAD * 2, h: 0.5, align: "right",
  fontSize: 22, bold: true, color: NAVY2, ...AR, margin: 0,
});
const chips = [
  "React 18", "TypeScript", "Vite", "Tailwind CSS", "shadcn/ui", "Supabase",
  "PostgreSQL", "Edge Functions", "OpenRouter AI", "GPT-5.2", "Claude Sonnet 4.6",
  "Telegraf", "Remotion", "Playwright", "Framer Motion",
];
const CHW = 1.98, CHH = 0.52, CHG = 0.14;
chips.forEach((c, i) => {
  const row = Math.floor(i / 3), col = i % 3;
  const cx = X_M + PAD + col * (CHW + CHG), cy = 13.78 + row * (CHH + CHG);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: cx, y: cy, w: CHW, h: CHH, fill: { color: "EEF3FA" }, rectRadius: 0.12, line: { color: ACCENT, width: 1 } });
  s.addText(c, { x: cx, y: cy, w: CHW, h: CHH, align: "center", valign: "middle", fontSize: 13.5, bold: true, color: NAVY2, fontFace: "Calibri", margin: 0 });
});

// --- Card E: screenshots ---
card(X_M, 17.55, COLW, 10.6);
s.addText("لقطات من المنصة", {
  x: X_M + PAD, y: 17.85, w: COLW - PAD * 2, h: 0.55, align: "right",
  fontSize: 28, bold: true, color: NAVY, ...AR, margin: 0,
});
const SHW = 6.23, SHH = 3.89, SHX = X_M + PAD;
s.addImage({ path: "assets/shot-home-ar.png", x: SHX, y: 18.55, w: SHW, h: SHH });
s.addText("الصفحة الرئيسية — واجهة عربية كاملة (RTL)", {
  x: SHX, y: 22.48, w: SHW, h: 0.4, align: "center", fontSize: 15, color: MUTED, ...AR, margin: 0,
});
s.addImage({ path: "assets/shot-ai-en.png", x: SHX, y: 23.1, w: SHW, h: SHH });
s.addText("AI Finder — وصف العطر بلغة طبيعية والذكاء الاصطناعي يرشّح", {
  x: SHX, y: 27.03, w: SHW, h: 0.4, align: "center", fontSize: 15, color: MUTED, ...AR, margin: 0,
});

// --- Card F: methodology steps ---
card(X_M, 28.6, COLW, 2.5);
s.addText("منهجية التطوير — تكرارية (Agile)", {
  x: X_M + PAD, y: 28.85, w: COLW - PAD * 2, h: 0.5, align: "right",
  fontSize: 20, bold: true, color: NAVY, ...AR, margin: 0,
});
const steps = ["النشر", "الاختبار", "التنفيذ", "التصميم", "التحليل"]; // drawn L→R, read R→L
const STW = 1.12, STG = 0.16;
steps.forEach((st, i) => {
  const sx = X_M + PAD + i * (STW + STG);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: sx, y: 29.55, w: STW, h: 0.85, fill: { color: i === 4 ? NAVY2 : "EEF3FA" }, rectRadius: 0.1, line: { color: NAVY2, width: 1 } });
  s.addText(st, { x: sx, y: 29.55, w: STW, h: 0.85, align: "center", valign: "middle", fontSize: 15, bold: true, color: i === 4 ? WHITE : NAVY2, ...AR, margin: 0 });
  if (i < 4) s.addShape(pres.shapes.LINE, { x: sx + STW + 0.02, y: 29.975, w: STG - 0.04, h: 0, flipH: true, line: { color: MUTED, width: 2, endArrowType: "triangle" } });
});

// =====================================================
// LEFT COLUMN — sections 5, 6, 7
// =====================================================
// --- Card G: النتائج والأرقام ---
card(X_L, 4.7, COLW, 9.3);
sectionHeader(X_L, 5.0, COLW, "٥", "النتائج والأرقام");
const stats = [
  ["+25", "صفحة كاملة الوظائف بلغتين"],
  ["+1,400", "مفتاح ترجمة عربي/إنجليزي"],
  ["3", "نماذج ذكاء اصطناعي متخصصة"],
  ["7", "وظائف سحابية Serverless"],
  ["8", "حِزم اختبارات E2E آلية"],
  ["−50%", "حجم JavaScript على الهاتف"],
];
const TW = 2.99, TH = 2.0, TG = 0.25;
stats.forEach(([num, label], i) => {
  const row = Math.floor(i / 2), col = i % 2;
  const tx = X_L + PAD + (1 - col) * 0 + col * (TW + TG); // RTL: first item right
  const txr = X_L + PAD + (1 - col) * (TW + TG); // right-first ordering
  const x = X_L + PAD + ((i % 2 === 0) ? TW + TG : 0); // even index → right tile
  const y = 6.05 + row * (TH + TG + 0.05);
  const dark = i % 2 === 0;
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: TW, h: TH, fill: { color: dark ? NAVY : "EEF3FA" }, rectRadius: 0.09 });
  s.addText(num, { x, y: y + 0.18, w: TW, h: 1.0, align: "center", fontSize: 46, bold: true, color: dark ? GOLD : NAVY2, fontFace: "Calibri", margin: 0 });
  s.addText(label, { x: x + 0.15, y: y + 1.2, w: TW - 0.3, h: 0.72, align: "center", valign: "top", fontSize: 14.5, color: dark ? ICE : TEXT, ...AR, margin: 0 });
});
s.addText("فلترة المراجعات تعمل تلقائياً، والمنصة تعمل فعلياً على نطاق shama.ly مع توصيل حقيقي يغطي المدن الليبية.", {
  x: X_L + PAD, y: 12.95, w: COLW - PAD * 2, h: 0.9, align: "right", valign: "top",
  fontSize: 16.5, italic: true, color: MUTED, ...AR, lineSpacingMultiple: 1.15, margin: 0,
});

// --- Card H: collection screenshot ---
card(X_L, 14.45, COLW, 5.0);
s.addImage({ path: "assets/shot-collection-ar.png", x: X_L + PAD, y: 14.75, w: SHW, h: SHH });
s.addText("صفحة المجموعة — تصفية وبحث ذكي بالعربية", {
  x: X_L + PAD, y: 18.7, w: SHW, h: 0.4, align: "center", fontSize: 15, color: MUTED, ...AR, margin: 0,
});

// --- Card I: الخاتمة والمستقبل ---
card(X_L, 19.9, COLW, 5.5);
sectionHeader(X_L, 20.2, COLW, "٦", "الخاتمة والمستقبل");
s.addText(
  "نجح المشروع في بناء منصة عربية متكاملة تعالج مشكلة شراء العطور أونلاين عبر الذكاء الاصطناعي ونظام العينات، وهي تعمل فعلياً على shama.ly.",
  { x: X_L + PAD, y: 21.15, w: COLW - PAD * 2, h: 1.5, align: "right", valign: "top",
    fontSize: 18.5, color: TEXT, ...AR, lineSpacingMultiple: 1.2, margin: 0 }
);
s.addText(rtl([
  { text: "●  تطبيق هاتف أصلي عبر React Native / Expo.", options: { breakLine: true } },
  { text: "●  بوابة دفع إلكتروني محلية ومحافظ رقمية.", options: { breakLine: true } },
  { text: "●  برنامج ولاء ونقاط مكافآت.", options: { breakLine: true } },
  { text: "●  التحول لمنصة متعددة البائعين Marketplace.", options: {} },
]), { x: X_L + PAD, y: 22.75, w: COLW - PAD * 2, h: 2.5, align: "right", valign: "top",
  fontSize: 18, color: TEXT, ...AR, lineSpacingMultiple: 1.15, paraSpaceAfter: 11, margin: 0 });

// --- Card J: المراجع والتواصل ---
card(X_L, 25.85, COLW, 5.25);
sectionHeader(X_L, 26.15, COLW, "٧", "المراجع والتواصل");
s.addText(
  "React (react.dev) · Supabase (supabase.com/docs) · OpenRouter (openrouter.ai/docs) · Vanex Delivery API · Remotion (remotion.dev)",
  { x: X_L + PAD, y: 27.1, w: COLW - PAD * 2, h: 0.95, align: "right", valign: "top",
    fontSize: 14.5, color: MUTED, ...AR, lineSpacingMultiple: 1.15, margin: 0 }
);
// QR codes
const QS = 1.7;
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: X_L + COLW - PAD - QS - 0.15, y: 28.15, w: QS + 0.3, h: QS + 0.3, fill: { color: WHITE }, rectRadius: 0.08, line: { color: NAVY2, width: 1.5 } });
s.addImage({ path: "assets/qr-site.png", x: X_L + COLW - PAD - QS, y: 28.3, w: QS, h: QS });
s.addText("الموقع الحي — shama.ly", {
  x: X_L + COLW - PAD - QS - 0.45, y: 30.18, w: QS + 0.9, h: 0.38, align: "center", fontSize: 14, bold: true, color: NAVY, ...AR, margin: 0,
});
s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: X_L + COLW - PAD - 2 * QS - 1.0, y: 28.15, w: QS + 0.3, h: QS + 0.3, fill: { color: WHITE }, rectRadius: 0.08, line: { color: NAVY2, width: 1.5 } });
s.addImage({ path: "assets/qr-github.png", x: X_L + COLW - PAD - 2 * QS - 0.85, y: 28.3, w: QS, h: QS });
s.addText("الكود المصدري — GitHub", {
  x: X_L + COLW - PAD - 2 * QS - 1.3, y: 30.18, w: QS + 0.9, h: 0.38, align: "center", fontSize: 14, bold: true, color: NAVY, ...AR, margin: 0,
});
// contact — keep clear of the GitHub QR box (starts x≈3.08)
s.addText(rtl([
  { text: "للتواصل", options: { bold: true, fontSize: 16, color: NAVY2, breakLine: true } },
  { text: "البريد: ________", options: { fontSize: 14, color: TEXT, breakLine: true } },
  { text: "هاتف: ________", options: { fontSize: 14, color: TEXT } },
]), { x: 0.95, y: 28.25, w: 1.8, h: 2.0, align: "right", valign: "top", ...AR, lineSpacingMultiple: 1.35, margin: 0 });

// =====================================================
// FOOTER
// =====================================================
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 31.55, w: W, h: 0.06, fill: { color: GOLD } });
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 31.61, w: W, h: H - 31.61, fill: { color: NAVY } });
s.addText("مشروع تخرج — جامعة الرفاق · كلية تقنية المعلومات · 2025/2026          |          shama.ly", {
  x: 0, y: 31.61, w: W, h: H - 31.61, align: "center", valign: "middle",
  fontSize: 19, color: ICE, ...AR, margin: 0,
});

await pres.writeFile({ fileName: "../Shama-Poster-A1.pptx" });
console.log("written: docs/poster/Shama-Poster-A1.pptx");
