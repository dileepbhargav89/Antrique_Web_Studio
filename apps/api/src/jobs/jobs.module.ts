import { Global, Module } from '@nestjs/common';
import { JobRunner } from './job-runner.service';
import { InMemoryDeadLetterStore } from './in-memory-dead-letter.store';
import { DEAD_LETTER_STORE } from './jobs.tokens';

// @Global(), same precedent as TokenModule/PasswordModule/CacheModule —
// infrastructure with no current real consumer (see this directory's own
// README), built ahead of the first real job the same way those were
// built ahead of their first real callers.
@Global()
@Module({
  providers: [JobRunner, { provide: DEAD_LETTER_STORE, useClass: InMemoryDeadLetterStore }],
  exports: [JobRunner],
})
export class JobsModule {}
