import { google } from "googleapis";
import { Readable } from "stream";

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON no está configurado en las variables de entorno");
  let credentials: Record<string, unknown>;
  try { credentials = JSON.parse(raw); } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON tiene formato JSON inválido");
  }
  return new google.auth.GoogleAuth({ credentials, scopes: ["https://www.googleapis.com/auth/drive.file"] });
}

function getFolderId() {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) throw new Error("GOOGLE_DRIVE_FOLDER_ID no está configurado en las variables de entorno");
  return id;
}

export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ url: string; fileId: string }> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });
  const folderId = getFolderId();

  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
  });

  const fileId = res.data.id!;

  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return { fileId, url: `https://drive.google.com/file/d/${fileId}/view` };
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });
  await drive.files.delete({ fileId }).catch(() => null);
}

export function extractFileId(driveUrl: string): string | null {
  const m = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

export function isDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.GOOGLE_DRIVE_FOLDER_ID);
}
