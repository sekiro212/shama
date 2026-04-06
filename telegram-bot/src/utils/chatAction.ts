import type { Context } from "telegraf";

/**
 * Keeps the "typing…" indicator visible in Telegram while async work runs.
 *
 * Telegram clears the chat action after ~5s, so we re-send every 4s. The
 * returned function stops the loop — call it in a `finally` block.
 *
 * Errors from sendChatAction are swallowed: a transient network blip on the
 * indicator must never break the actual request the user is waiting on.
 */
export function startTypingLoop(ctx: Context): () => void {
  const send = () => {
    ctx.sendChatAction("typing").catch(() => {});
  };
  send();
  const id = setInterval(send, 4000);
  return () => clearInterval(id);
}
