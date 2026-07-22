import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { JwtModule as NestJwtModule } from '@nestjs/jwt';
import jwtConfig from './config/jwt.config';
import { TokenService } from './token.service';

// JWT infrastructure only (Phase 1.2D.6) — see token.service.ts and this
// module's own README for what "infrastructure only" means here. Named
// TokenModule, not JwtModule: @nestjs/jwt's own JwtModule (imported
// below) already has that name, and giving this module the identical
// name produced two identical "JwtModule dependencies initialized" log
// lines at boot — confirmed live, then fixed, the same reasoning
// TokenService (not JwtService) was already named for. @Global() so
// TokenService is available everywhere without every future module
// re-importing this one, matching ConfigModule/LoggingModule/
// DatabaseModule's existing precedent.
//
// Imports ConfigModule.forFeature(jwtConfig) — not the frozen
// config.module.ts's forRoot() call — to register the `jwt` namespace
// from within this module, the same reasoning logging.module.ts already
// established for `loggerOptions`. @nestjs/jwt's own JwtModule is
// configured via registerAsync() (needs the validated config, not
// available synchronously at import time) with the ACCESS token's
// secret/expiration as its default signOptions — TokenService overrides
// secret/expiresIn per call for refresh tokens, @nestjs/jwt's standard
// pattern for handling two token types with different secrets from one
// JwtService instance.
@Global()
@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    NestJwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [jwtConfig.KEY],
      useFactory: (config: ConfigType<typeof jwtConfig>) => ({
        secret: config.accessSecret,
        signOptions: { expiresIn: config.accessTokenTtl },
      }),
    }),
  ],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
