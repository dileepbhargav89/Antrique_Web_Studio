import { registerAs } from '@nestjs/config';
import { validateEnv } from '../env.validation';

// Phase 7 (Product Image Upload) — S3-API-compatible object storage
// config. Every field is optional (see env.validation.ts's own comment)
// — StorageService throws a clear ServiceUnavailableException at the one
// call site that needs real credentials (the upload route) rather than
// this factory throwing at boot; every other route in this app has
// nothing to do with storage and must keep working with none of this
// configured. `endpoint` unset means "real AWS S3" (the SDK resolves its
// own regional endpoint); set, it targets any S3-compatible provider
// (Cloudflare R2, DigitalOcean Spaces, MinIO).
export default registerAs('storage', () => {
  const env = validateEnv();
  return {
    bucket: env.STORAGE_BUCKET,
    region: env.STORAGE_REGION,
    accessKeyId: env.STORAGE_ACCESS_KEY_ID,
    secretAccessKey: env.STORAGE_SECRET_ACCESS_KEY,
    endpoint: env.STORAGE_ENDPOINT,
    publicUrlBase: env.STORAGE_PUBLIC_URL_BASE,
  };
});
