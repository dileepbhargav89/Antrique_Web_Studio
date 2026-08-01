import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import storageConfig from '../config/storage/storage.config';

export interface UploadFileInput {
  key: string;
  body: Buffer;
  contentType: string;
}

// Phase 7 (Product Image Upload) — the one place this app talks to S3 (or
// an S3-API-compatible provider — see storage.config.ts's own comment on
// `endpoint`). Unlike EmailService, `upload()` genuinely THROWS
// (ServiceUnavailableException, 503) when storage isn't configured — an
// upload has no meaningful "silently skip" behavior (the whole point of
// the request is the file), so an honest failure at the one call site
// that needs real credentials is correct, not a design gap.
@Injectable()
export class StorageService {
  private readonly client: S3Client | null;

  constructor(
    @Inject(storageConfig.KEY) private readonly config: ConfigType<typeof storageConfig>,
  ) {
    this.client = this.isConfigured()
      ? new S3Client({
          region: this.config.region,
          endpoint: this.config.endpoint,
          // Required for most non-AWS S3-compatible endpoints (MinIO,
          // some self-hosted setups) — real AWS S3 accepts either style,
          // so this is safe unconditionally when an endpoint override is
          // set, and irrelevant (ignored) when it isn't.
          forcePathStyle: Boolean(this.config.endpoint),
          credentials: {
            accessKeyId: this.config.accessKeyId as string,
            secretAccessKey: this.config.secretAccessKey as string,
          },
        })
      : null;
  }

  private isConfigured(): boolean {
    return Boolean(
      this.config.bucket &&
      this.config.region &&
      this.config.accessKeyId &&
      this.config.secretAccessKey,
    );
  }

  async upload(input: UploadFileInput): Promise<string> {
    if (!this.client || !this.config.bucket) {
      throw new ServiceUnavailableException(
        'File storage is not configured — set STORAGE_BUCKET/STORAGE_REGION/' +
          'STORAGE_ACCESS_KEY_ID/STORAGE_SECRET_ACCESS_KEY (see apps/api/.env.example).',
      );
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );

    return this.buildPublicUrl(input.key);
  }

  // New (Quotation PDF letterhead) — the one caller that needs bytes
  // BACK, not just a URL: QuotationPdfService embeds the tenant's logo
  // via pdfkit's `doc.image()`, which needs a real Buffer, and a public
  // bucket URL isn't guaranteed fetchable from inside the render call
  // (private bucket, no `publicUrlBase`, etc.) — going through the same
  // authenticated S3 client `upload()` already uses is the reliable path.
  async download(key: string): Promise<Buffer> {
    if (!this.client || !this.config.bucket) {
      throw new ServiceUnavailableException(
        'File storage is not configured — set STORAGE_BUCKET/STORAGE_REGION/' +
          'STORAGE_ACCESS_KEY_ID/STORAGE_SECRET_ACCESS_KEY (see apps/api/.env.example).',
      );
    }

    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.bucket, Key: key }),
    );
    const bytes = await response.Body?.transformToByteArray();
    return Buffer.from(bytes ?? new Uint8Array());
  }

  // Public (Phase 7, Project/Task/Milestone) — `upload()` returns a URL at
  // upload time, but a stored `Document` row only persists `storageKey`
  // (not the derived URL) — this lets document.service.ts reconstruct the
  // same URL when listing already-uploaded documents, without duplicating
  // buildPublicUrl's logic.
  getPublicUrl(key: string): string {
    return this.buildPublicUrl(key);
  }

  private buildPublicUrl(key: string): string {
    if (this.config.publicUrlBase) {
      return `${this.config.publicUrlBase.replace(/\/$/, '')}/${key}`;
    }
    // Real AWS S3's own virtual-hosted-style URL — the fallback when no
    // publicUrlBase/endpoint override is configured (i.e. real AWS S3
    // with a public bucket policy, not a CDN/custom domain in front).
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}
