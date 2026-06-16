import { S3Client, PutObjectCommand, CreateBucketCommand, HeadBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';

const ENDPOINT  = process.env.S3_ENDPOINT  || 'http://localhost:9000';
const ACCESS    = process.env.S3_ACCESS_KEY || 'minioadmin';
const SECRET    = process.env.S3_SECRET_KEY || 'minio_default_pass';
const BUCKET    = process.env.S3_BUCKET     || 'net-imobiliaria';
const REGION    = process.env.S3_REGION     || 'us-east-1';
const CDN_URL   = process.env.CDN_URL       || `${ENDPOINT}/${BUCKET}`;

export const s3 = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: { accessKeyId: ACCESS, secretAccessKey: SECRET },
  forcePathStyle: true,
});

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    // Public read policy
    await s3.send(new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [{ Effect: 'Allow', Principal: '*', Action: 's3:GetObject', Resource: `arn:aws:s3:::${BUCKET}/*` }],
      }),
    }));
  }
}

let bucketReady = false;

export async function uploadToStorage(
  buffer: Buffer,
  key: string,
  contentType: string,
): Promise<string> {
  if (!bucketReady) { await ensureBucket(); bucketReady = true; }

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));

  return `${CDN_URL}/${key}`;
}
