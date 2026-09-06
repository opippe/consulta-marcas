import { S3Client } from "bun";

export function r2Client() {
  return new S3Client({
    endpoint: process.env.R2_ENDPOINT!.trim(),
    bucket: process.env.R2_BUCKET!.trim(),
    accessKeyId: process.env.R2_ACCESS_KEY_ID!.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!.trim(),
    region: "auto",
  });
}
