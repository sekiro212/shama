import Groq from "groq-sdk";
import { config } from "../config";

const groq = new Groq({ apiKey: config.groqApiKey });

export async function transcribeVoice(buffer: Buffer, mimeType: string): Promise<string> {
  // Groq Whisper expects a File-like object
  const ext = mimeType.includes("ogg") ? "ogg" : "m4a";
  const uint8 = new Uint8Array(buffer);
  const file = new File([uint8], `voice.${ext}`, { type: mimeType });

  const transcription = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3-turbo",
    temperature: 0,
    response_format: "verbose_json",
  });

  return transcription.text || "";
}
