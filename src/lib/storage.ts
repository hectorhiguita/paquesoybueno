/**
 * Cloudflare R2 storage client (S3-compatible).
 * Falls back to a mock URL in dev/test when env vars are absent.
 *
 * Requirements: 3.4
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
} = process.env;

const isConfigured =
  R2_ACCOUNT_ID &&
  R2_ACCESS_KEY_ID &&
  R2_SECRET_ACCESS_KEY &&
  R2_BUCKET_NAME &&
  R2_PUBLIC_URL;

let s3Client: S3Client | null = null;

if (isConfigured) {
  s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Upload a file buffer to Cloudflare R2.
 * In dev/test mode (env vars absent) returns a mock localhost URL.
 */
export async function uploadImage(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{ url: string }> {
  if (!isConfigured || !s3Client) {
    // Dev/test fallback
    return { url: `http://localhost:3000/uploads/${filename}` };
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME!,
      Key: filename,
      Body: file,
      ContentType: mimeType,
    })
  );

  return { url: `${R2_PUBLIC_URL}/${filename}` };
}
