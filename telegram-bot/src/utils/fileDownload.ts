import { Telegraf } from "telegraf";

/**
 * Downloads any Telegram file (photo, voice, document, etc.) to a Buffer.
 * Uses native fetch (Node 18+).
 */
export async function downloadTelegramFile(
  bot: Telegraf,
  fileId: string
): Promise<{ buffer: Buffer; mimeType: string }> {
  const file = await bot.telegram.getFile(fileId);

  if (!file.file_path) {
    throw new Error(`No file_path returned for fileId: ${fileId}`);
  }

  const token = bot.telegram.token;
  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download Telegram file: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const mimeType = detectMimeType(file.file_path);

  return { buffer, mimeType };
}

function detectMimeType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "oga":
    case "ogg":
      return "audio/ogg";
    case "m4a":
      return "audio/mp4";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "mp4":
      return "video/mp4";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}
