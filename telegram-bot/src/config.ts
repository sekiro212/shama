import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  telegramToken: requireEnv("TELEGRAM_BOT_TOKEN"),
  adminChatIds: requireEnv("ADMIN_CHAT_IDS")
    .split(",")
    .map((id) => parseInt(id.trim(), 10)),
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseServiceKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  openRouterApiKey: requireEnv("OPENROUTER_API_KEY"),
  groqApiKey: requireEnv("GROQ_API_KEY"),
} as const;
