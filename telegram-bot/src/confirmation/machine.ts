import type { Context } from "telegraf";
import type { BotSession, BotLanguage } from "../types";
import { createProduct, updateProduct, deleteProduct } from "../services/products";
import { savePerfumeImage } from "../services/supabase";
import { t } from "../i18n/messages";

type ConfirmContext = Context & { session: BotSession };

/**
 * Called when the user taps ✅ Confirm.
 * Executes the pending operation stored in ctx.session.confirmation,
 * then clears it regardless of success or failure.
 */
export async function executeConfirmation(
  ctx: ConfirmContext,
  lang: BotLanguage
): Promise<void> {
  const confirmation = ctx.session.confirmation;

  if (!confirmation) {
    await ctx.reply("Nothing to confirm.");
    return;
  }

  try {
    switch (confirmation.type) {
      case "create": {
        const productId = await createProduct(confirmation.payload);

        if (confirmation.payload.imageBuffer && confirmation.payload.imageMimeType) {
          await savePerfumeImage(
            productId,
            confirmation.payload.imageBuffer,
            confirmation.payload.imageMimeType,
            true,
            1
          );
        }

        await ctx.reply(`${t(lang, "productCreated")}\nID: ${productId}`);
        break;
      }

      case "update": {
        await updateProduct(confirmation.payload.id, confirmation.payload.changes);
        await ctx.reply(t(lang, "productUpdated"));
        break;
      }

      case "delete": {
        await deleteProduct(confirmation.payload.id);
        await ctx.reply(t(lang, "productDeleted"));
        break;
      }
    }
  } catch (err) {
    console.error(`[Confirm Error] ${confirmation.type}:`, err);
    await ctx.reply(t(lang, "errorGeneral"));
  } finally {
    ctx.session.confirmation = null;
  }
}

/**
 * Called when the user taps ❌ Cancel.
 * Clears the pending confirmation and notifies the user.
 */
export async function cancelConfirmation(
  ctx: ConfirmContext,
  lang: BotLanguage
): Promise<void> {
  ctx.session.confirmation = null;
  await ctx.reply(t(lang, "cancelled"));
}
