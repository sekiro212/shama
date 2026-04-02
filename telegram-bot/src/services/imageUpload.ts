import { config } from "../config";
import { savePerfumeImage } from "./supabase";

export async function downloadTelegramPhoto(fileId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // Step 1: Get file path from Telegram API
  const fileInfoRes = await fetch(
    `https://api.telegram.org/bot${config.telegramToken}/getFile?file_id=${fileId}`
  );
  const fileInfo = (await fileInfoRes.json()) as { ok: boolean; result?: { file_path?: string } };

  if (!fileInfo.ok || !fileInfo.result?.file_path) {
    throw new Error("Failed to get file info from Telegram");
  }

  const filePath = fileInfo.result.file_path;
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";

  // Step 2: Download the file bytes
  const downloadRes = await fetch(
    `https://api.telegram.org/file/bot${config.telegramToken}/${filePath}`
  );

  if (!downloadRes.ok) throw new Error("Failed to download file from Telegram");

  const arrayBuffer = await downloadRes.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return { buffer, mimeType };
}

export async function uploadTelegramPhotoToSupabase(
  fileId: string,
  perfumeId: string,
  isPrimary: boolean,
  displayOrder: number
): Promise<string> {
  const { buffer, mimeType } = await downloadTelegramPhoto(fileId);
  return savePerfumeImage(perfumeId, buffer, mimeType, isPrimary, displayOrder);
}
