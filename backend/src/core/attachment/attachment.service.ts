import { randomUUID } from 'crypto';
import * as Minio from 'minio';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/response.js';

export interface AttachmentMeta {
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024;

let minioClient: Minio.Client | null = null;
let bucketReady = false;

function getClient(): Minio.Client {
  if (!minioClient) {
    minioClient = new Minio.Client({
      endPoint: env.MINIO_ENDPOINT,
      port: env.MINIO_PORT,
      useSSL: env.MINIO_USE_SSL,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }
  return minioClient;
}

async function ensureBucket(): Promise<void> {
  if (bucketReady) return;

  const client = getClient();
  const exists = await client.bucketExists(env.MINIO_BUCKET);
  if (!exists) {
    await client.makeBucket(env.MINIO_BUCKET);
  }
  bucketReady = true;
}

export function buildAttachmentUrl(key: string): string {
  return `${env.API_PREFIX}/attachment/file/${encodeURIComponent(key)}`;
}

export async function uploadAttachment(
  tenantId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<AttachmentMeta> {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new AppError(400, 'INVALID_FILE_TYPE', 'Only image files are allowed (JPEG, PNG, WebP, GIF)');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new AppError(400, 'FILE_TOO_LARGE', 'Maximum file size is 5 MB');
  }

  await ensureBucket();

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const key = `${tenantId}/${randomUUID()}/${safeName}`;

  const client = getClient();
  await client.putObject(env.MINIO_BUCKET, key, buffer, buffer.length, {
    'Content-Type': mimeType,
  });

  return {
    key,
    filename: safeName,
    mimeType,
    size: buffer.length,
    url: buildAttachmentUrl(key),
  };
}

export async function getAttachmentStream(key: string, tenantId: string) {
  if (!key.startsWith(`${tenantId}/`)) {
    throw new AppError(403, 'ATTACHMENT_FORBIDDEN', 'Access denied');
  }

  const client = getClient();
  try {
    const stat = await client.statObject(env.MINIO_BUCKET, key);
    const stream = await client.getObject(env.MINIO_BUCKET, key);
    return {
      stream,
      mimeType: stat.metaData?.['content-type'] ?? 'application/octet-stream',
      size: stat.size,
      filename: key.split('/').pop() ?? 'file',
    };
  } catch {
    throw new AppError(404, 'ATTACHMENT_NOT_FOUND', 'File not found');
  }
}
