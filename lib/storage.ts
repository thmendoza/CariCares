import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: process.env.STORAGE_REGION ?? "auto",
  endpoint: process.env.STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.STORAGE_BUCKET_NAME ?? "care-iep-files";

export async function uploadFile(key: string, buffer: Buffer, contentType: string) {
  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return key;
}

export async function getDownloadUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn }
  );
}

export async function deleteFile(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export function buildStorageKey(studentId: string, schoolYear: string, quarter: number, version: number, filename: string) {
  return `ieps/${studentId}/${schoolYear}/Q${quarter}/v${version}/${filename}`;
}
