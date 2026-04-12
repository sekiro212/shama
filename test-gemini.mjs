import genai from "@google/genai";
const { GoogleGenerativeAI } = genai;

const key = "AIzaSyAwpS3yLQicT4b4XPtRO6u8ATWG0XiN3bo";
const ai = new GoogleGenerativeAI(key);

const models = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash",
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-pro-preview-05-06",
  "gemini-3.0-flash",
  "gemini-3.1-flash-lite-preview",
];

for (const m of models) {
  try {
    const res = await ai.models.generateContent({
      model: m,
      contents: "Say ok",
      config: { maxOutputTokens: 10 },
    });
    console.log("OK " + m);
  } catch (e) {
    console.log("FAIL " + m + " -- " + (e.message||"").slice(0,120));
  }
}
