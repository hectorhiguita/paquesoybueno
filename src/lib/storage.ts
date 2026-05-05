/**
 * AWS S3 storage client.
 * Uses IAM task role credentials automatically when running on ECS.
 * Falls back to a mock URL in dev/test when S3_BUCKET_NAME is absent.
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.S3_BUCKET_NAME;
const REGION = process.env.AWS_REGION ?? "us-east-1";
const PUBLIC_URL = process.env.S3_PUBLIC_URL; // optional CloudFront / custom domain

let s3: S3Client | null = null;
if (BUCKET) {
  s3 = new S3Client({ region: REGION });
}

export async function uploadImage(
  file: Buffer,
  filename: string,
  mimeType: string
): Promise<{ url: string }> {
  if (!BUCKET || !s3) {
    return { url: `http://localhost:3000/uploads/${filename}` };
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: filename,
      Body: file,
      ContentType: mimeType,
    })
  );

  const url = PUBLIC_URL
    ? `${PUBLIC_URL}/${filename}`
    : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${filename}`;

  return { url };
}
