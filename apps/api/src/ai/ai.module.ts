import { Global, Module } from '@nestjs/common';
import { AiProviderFactory } from './ai-provider.factory';
import { AiService } from './ai.service';

// @Global(), same precedent as EmailModule/StorageModule — infrastructure
// framed app-wide from its first real consumer (PromptsModule's
// render-and-test action) onward, the same way every prior cross-cutting
// service in this app started.
@Global()
@Module({
  providers: [AiProviderFactory, AiService],
  exports: [AiService, AiProviderFactory],
})
export class AiModule {}
