import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { customAlphabet } from 'nanoid';

const BUCKET = process.env.AWS_S3_BUCKET ?? '';
const REGION = process.env.AWS_S3_REGION ?? '';
const ACCESS_KEY_ID = process.env.AWS_S3_ACCESS_KEY_ID ?? '';
const SECRET_ACCESS_KEY = process.env.AWS_S3_SECRET_ACCESS_KEY ?? '';
// An S3-compatible endpoint such as Cloudflare R2
// (https://<account-id>.r2.cloudflarestorage.com). Leave unset for Amazon S3.
const ENDPOINT = process.env.AWS_S3_ENDPOINT?.replace(/\/+$/, '') ?? '';

/**
 * Prefix of every stored object URL. Amazon uses a virtual-hosted bucket
 * hostname; other endpoints address the bucket by path.
 */
export const S3_BASE_URL = ENDPOINT && BUCKET
  ? `${ENDPOINT}/${BUCKET}`
  : BUCKET && REGION
    ? `https://${BUCKET}.s3.${REGION}.amazonaws.com`
    : undefined;

let _client: S3Client | undefined;
const client = () => {
  if (!_client) {
    _client = new S3Client({
      region: REGION || 'auto',
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
      ...(ENDPOINT && {
        endpoint: ENDPOINT,
        forcePathStyle: true,
        // R2 rejects the flexible checksums newer SDKs attach by default.
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      }),
    });
  }
  return _client;
};

const urlForKey = (key: string) => `${S3_BASE_URL}/${key}`;

export const isS3Url = (url?: string) =>
  Boolean(S3_BASE_URL && url?.startsWith(S3_BASE_URL));

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 16);
export const generateStorageId = () => nanoid();

export const s3Put = async (
  body: Buffer | Uint8Array | Blob | string,
  key: string,
  contentType?: string,
): Promise<string> => {
  await client().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return urlForKey(key);
};

export const s3Delete = (key: string) =>
  client().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));

/** Size of a stored object, read from its headers without downloading it; undefined when it does not exist. */
export const s3Size = async (key: string): Promise<number | undefined> => {
  try {
    const head = await client().send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return head.ContentLength;
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (status === 404 || (error as Error).name === 'NotFound') return undefined;
    throw error;
  }
};

export const s3SignedUrl = (
  key: string,
  method: 'GET' | 'PUT',
  expiresIn = 3600,
  contentType?: string,
) => {
  const command =
    method === 'GET'
      ? new GetObjectCommand({ Bucket: BUCKET, Key: key })
      : new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      });
  return getSignedUrl(client(), command, { expiresIn });
};

export const s3FetchBuffer = async (key: string): Promise<Buffer> => {
  const url = await s3SignedUrl(key, 'GET', 60);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`failed to fetch S3 object (${res.status})`);
  }
  return Buffer.from(await res.arrayBuffer());
};
