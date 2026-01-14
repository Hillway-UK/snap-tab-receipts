// Google Drive API utilities

const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const GOOGLE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
}

/**
 * Get or create the SnapTab Receipts folder in Google Drive
 */
export async function getOrCreateFolder(
  accessToken: string,
  folderName: string = "SnapTab Receipts"
): Promise<string> {
  // Search for existing folder
  const searchParams = new URLSearchParams({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
  });

  const searchResponse = await fetch(
    `${GOOGLE_DRIVE_API}/files?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchResponse.ok) {
    throw new Error("Failed to search for folder");
  }

  const searchData = await searchResponse.json();

  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create new folder
  const createResponse = await fetch(`${GOOGLE_DRIVE_API}/files`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createResponse.ok) {
    throw new Error("Failed to create folder");
  }

  const folderData = await createResponse.json();
  return folderData.id;
}

/**
 * Upload a file to Google Drive
 */
export async function uploadToDrive(
  accessToken: string,
  blob: Blob,
  fileName: string,
  folderId: string
): Promise<DriveFile> {
  // Create file metadata
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  // Create multipart upload body
  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataString = JSON.stringify(metadata);

  // Convert blob to base64
  const arrayBuffer = await blob.arrayBuffer();
  const base64Data = btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ""
    )
  );

  const requestBody =
    delimiter +
    "Content-Type: application/json\r\n\r\n" +
    metadataString +
    delimiter +
    `Content-Type: ${blob.type}\r\n` +
    "Content-Transfer-Encoding: base64\r\n\r\n" +
    base64Data +
    closeDelimiter;

  const response = await fetch(
    `${GOOGLE_UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,webViewLink`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: requestBody,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload file: ${error}`);
  }

  return response.json();
}

/**
 * Fetch an image from URL and convert to Blob
 */
export async function fetchImageAsBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("Failed to fetch image");
  }
  return response.blob();
}
