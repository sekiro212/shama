/** ai-eval2.mts — root-cause the empty quiz/gift results. Prints RAW model text. */
import { getQuizRecommendations, getGiftSuggestions } from "../src/services/aiService";

const raws: string[] = [];
const orig = globalThis.fetch;
globalThis.fetch = (async (url: any, opts: any) => {
  const u = typeof url === "string" ? url : url?.url ?? "";
  const res = await orig(url, opts);
  if (u.includes("openrouter")) {
    try { const d: any = await res.clone().json(); const c = d?.choices?.[0]?.message?.content; if (typeof c === "string") raws.push(c); } catch {}
  }
  return res;
}) as typeof fetch;
const last = () => raws[raws.length - 1] ?? "(none)";
const log = (...a: any[]) => console.log(...a);

async function main() {
  log("══ QUIZ A: men / oriental-woody / strong / SAMPLES / 20_40 (orig failing case)");
  raws.length = 0;
  const q1 = await getQuizRecommendations({ occasion: "evening", scentFamily: "oriental / woody", intensity: "strong", gender: "men", format: "sample", budget: "20_40" });
  log("RAW:", JSON.stringify(last()));
  log("returned:", q1.length, q1.map((x) => x.name));

  log("\n══ QUIZ B: same but budget 40_60");
  raws.length = 0;
  const q2 = await getQuizRecommendations({ occasion: "evening", scentFamily: "oriental / woody", intensity: "strong", gender: "men", format: "sample", budget: "40_60" });
  log("RAW:", JSON.stringify(last()));
  log("returned:", q2.length, q2.map((x) => x.name));

  log("\n══ QUIZ C: full bottle / no tight budget (open)");
  raws.length = 0;
  const q3 = await getQuizRecommendations({ occasion: "evening", scentFamily: "oriental / woody", intensity: "strong", gender: "men", format: "full_bottle", budget: "any" });
  log("RAW:", JSON.stringify(last()));
  log("returned:", q3.length, q3.map((x) => x.name));

  log("\n══ GIFT A: her / floral / ~300 LYD (orig failing case)");
  raws.length = 0;
  const g1 = await getGiftSuggestions("a romantic gift set for my girlfriend, she likes sweet floral scents, budget around 300 LYD");
  log("RAW:", JSON.stringify(last()));
  log("returned:", g1.length, g1.map((x) => x.name));

  log("\n══ GIFT B: her / floral / NO budget mentioned");
  raws.length = 0;
  const g2 = await getGiftSuggestions("a romantic gift set for my girlfriend, she likes sweet floral scents");
  log("RAW:", JSON.stringify(last()));
  log("returned:", g2.length, g2.map((x) => x.name));

  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
