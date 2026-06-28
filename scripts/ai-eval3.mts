/** ai-eval3.mts — gift-suggestion quality. Are the AI's picks right for the brief? */
import { getGiftSuggestions } from "../src/services/aiService";
import { fetchProducts } from "../src/services/productsService";

const raws: string[] = [];
const orig = globalThis.fetch;
globalThis.fetch = (async (url: any, opts: any) => {
  const u = typeof url === "string" ? url : url?.url ?? "";
  const res = await orig(url, opts);
  if (u.includes("openrouter")) { try { const d: any = await res.clone().json(); const c = d?.choices?.[0]?.message?.content; if (typeof c === "string") raws.push(c); } catch {} }
  return res;
}) as typeof fetch;

async function main() {
  const { products } = await fetchProducts(1, 100);
  const briefs = [
    { d: "a romantic anniversary gift for my wife, she loves sweet floral scents", want: { gender: ["women", "unisex"] } },
    { d: "Eid gift for my father, he likes strong oud and woody oriental perfumes", want: { gender: ["men", "unisex"] } },
    { d: "a fresh summer gift set for my brother, light and citrusy, daily wear", want: { gender: ["men", "unisex"] } },
    { d: "a gift for my girlfriend, budget around 300 LYD, floral", want: { gender: ["women", "unisex"], maxPrice: 300 } },
    { d: "a luxury wedding gift, unisex, elegant and expensive", want: { gender: ["unisex", "men", "women"] } },
  ];
  for (const b of briefs) {
    raws.length = 0;
    const picks = await getGiftSuggestions(b.d);
    console.log("\n══════════════════════════════════════════════════════════════");
    console.log("BRIEF:", b.d);
    console.log("count:", picks.length);
    let genderOk = 0, budgetOk = 0;
    for (const p of picks) {
      const gOk = !b.want.gender || b.want.gender.includes(p.gender || "unisex");
      const bOk = !b.want.maxPrice || p.price <= b.want.maxPrice;
      if (gOk) genderOk++; if (bOk) budgetOk++;
      console.log(`  • ${p.name.padEnd(42)} ${String(p.price).padStart(4)}LYD  ${(p.gender||"unisex").padEnd(6)} ${p.stock_quantity === 0 ? "SOLD-OUT" : "in-stock"} ${gOk ? "" : "⚠️gender"} ${bOk ? "" : "⚠️over-budget"}`);
    }
    console.log(`  gender-match ${genderOk}/${picks.length}` + (b.want.maxPrice ? ` | within ${b.want.maxPrice}LYD: ${budgetOk}/${picks.length}` : ""));
  }
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
