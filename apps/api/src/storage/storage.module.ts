import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';

// @Global(), same precedent as EmailModule — infrastructure with exactly
// one real consumer today (CatalogModule's ProductImageService) but
// framed as app-wide the same way TokenModule/PasswordModule/CacheModule
// were before their own first real consumers arrived.
@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
