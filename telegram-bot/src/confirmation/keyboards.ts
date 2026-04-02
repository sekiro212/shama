import { Markup } from "telegraf";

// Returns an inline keyboard with Confirm and Cancel buttons.
// callbackData is ≤ 20 bytes — well within the 64-byte Telegram limit.
export function confirmKeyboard(type: "create" | "update" | "delete") {
  return Markup.inlineKeyboard([
    Markup.button.callback("✅ Confirm", `confirm_${type}`),
    Markup.button.callback("❌ Cancel", `cancel_${type}`),
  ]);
}
