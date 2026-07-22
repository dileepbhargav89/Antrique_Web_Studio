import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import hashConfig from './config/hash.config';
import { PasswordService } from './password.service';

// Password hashing infrastructure only (Phase 1.2D.6-style capability-before-
// consumer pattern — see token.module.ts for the precedent). @Global() so
// PasswordService is available everywhere without every future module
// re-importing this one, matching ConfigModule/LoggingModule/DatabaseModule/
// TokenModule's existing precedent.
//
// Imports ConfigModule.forFeature(hashConfig) — not the frozen
// config.module.ts's forRoot() call — to register the `hash` namespace from
// within this module, the same graduation path jwt.config.ts/
// logger-options.config.ts already established.
@Global()
@Module({
  imports: [ConfigModule.forFeature(hashConfig)],
  providers: [PasswordService],
  exports: [PasswordService],
})
export class PasswordModule {}
