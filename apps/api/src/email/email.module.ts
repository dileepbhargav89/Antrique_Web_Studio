import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SendEmailJob } from './jobs/send-email.job';

// @Global(), same precedent as TokenModule/PasswordModule/CacheModule/
// JobsModule — infrastructure consumed by more than one future domain
// module (ContactModule, NewsletterModule), so each shouldn't need to
// re-import this one individually.
@Global()
@Module({
  providers: [EmailService, SendEmailJob],
  exports: [EmailService, SendEmailJob],
})
export class EmailModule {}
