import { google } from "googleapis";
import { Readable } from "stream";

function getFolderId() {
  const raw = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!raw) throw new Error("GOOGLE_DRIVE_FOLDER_ID no está configurado");
  const trimmed = raw.trim();
  const match = trimmed.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1]! : trimmed;
}

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Credenciales OAuth2 de Drive no configuradas. Se requieren: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_DRIVE_REFRESH_TOKEN"
    );
  }
  const client = new google.auth.OAuth2(clientId, clientSecret);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

export async function uploadFileToDrive(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<{ url: string; fileId: string }> {
  const auth = getOAuthClient();
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
  const auth = getOAuthClient();
  const drive = google.drive({ version: "v3", auth });
  await drive.files.delete({ fileId }).catch(() => null);
}

export function extractFileId(driveUrl: string): string | null {
  const m = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m?.[1] ?? null;
}

export function isDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN &&
    process.env.GOOGLE_DRIVE_FOLDER_ID
  );
}
