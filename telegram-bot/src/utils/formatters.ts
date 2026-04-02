import type { ProductDraft, BotLanguage } from "../types";

export function formatIdentificationResult(draft: Partial<ProductDraft>, lang: BotLanguage = "en"): string {
  const isAr = lang === "ar";
  const name = isAr ? (draft.name_ar || draft.name) : draft.name;
  const desc = isAr ? (draft.description_ar || draft.description) : draft.description;
  const notes = isAr ? (draft.fragrance_notes_ar || draft.fragrance_notes) : draft.fragrance_notes;

  const lines = [
    `🔍 <b>${isAr ? "العطر المحدد" : "Identified Perfume"}</b>`,
    ``,
    `<b>${isAr ? "الاسم" : "Name"}:</b> ${name ?? "Unknown"}`,
    `<b>${isAr ? "الاسم (EN)" : "Name (AR)"}:</b> ${isAr ? (draft.name ?? "—") : (draft.name_ar ?? "—")}`,
    `<b>${isAr ? "العلامة" : "Brand"}:</b> ${draft.brand ?? "Unknown"}`,
    ``,
    `<b>${isAr ? "الوصف" : "Description"}:</b>`,
    desc ?? "—",
  ];

  if (notes) {
    lines.push(``);
    lines.push(`<b>${isAr ? "النوتات العطرية" : "Fragrance Notes"}:</b>`);
    if (notes.top?.length) lines.push(`  🌿 ${isAr ? "المقدمة" : "Top"}: ${notes.top.join(", ")}`);
    if (notes.middle?.length) lines.push(`  🌸 ${isAr ? "القلب" : "Heart"}: ${notes.middle.join(", ")}`);
    if (notes.base?.length) lines.push(`  🌰 ${isAr ? "القاعدة" : "Base"}: ${notes.base.join(", ")}`);
  }

  lines.push(``);
  lines.push(isAr ? "هل هذا صحيح؟" : "Is this correct?");
  return lines.join("\n");
}

export function formatProductSummary(draft: ProductDraft, lang: BotLanguage = "en"): string {
  const isAr = lang === "ar";
  const lines = [
    `✅ <b>${isAr ? "تم إنشاء المنتج بنجاح!" : "Product Created Successfully!"}</b>`,
    ``,
    `<b>${isAr ? "الاسم (AR)" : "Name (EN)"}:</b> ${isAr ? draft.name_ar : draft.name}`,
    `<b>${isAr ? "الاسم (EN)" : "Name (AR)"}:</b> ${isAr ? draft.name : draft.name_ar}`,
    `<b>${isAr ? "العلامة" : "Brand"}:</b> ${draft.brand}`,
    `<b>${isAr ? "السعر" : "Price"}:</b> ${draft.price} LYD`,
    `<b>${isAr ? "الجنس" : "Gender"}:</b> ${draft.gender}`,
    `<b>${isAr ? "الحجم" : "Size"}:</b> ${draft.size}`,
    `<b>${isAr ? "المخزون" : "Stock"}:</b> ${draft.stock_quantity}`,
    ``,
    `<b>${isAr ? "النوتات العطرية" : "Fragrance Notes"}:</b>`,
    `  🌿 ${isAr ? "المقدمة" : "Top"}: ${draft.fragrance_notes.top.join(", ")}`,
    `  🌸 ${isAr ? "القلب" : "Heart"}: ${draft.fragrance_notes.middle.join(", ")}`,
    `  🌰 ${isAr ? "القاعدة" : "Base"}: ${draft.fragrance_notes.base.join(", ")}`,
  ];

  if (draft.has_samples && draft.samples.length > 0) {
    lines.push(`\n<b>${isAr ? "العينات" : "Samples"}:</b>`);
    draft.samples.forEach((s) => lines.push(`  • ${s.size}: ${s.price} LYD`));
  }

  return lines.join("\n");
}
