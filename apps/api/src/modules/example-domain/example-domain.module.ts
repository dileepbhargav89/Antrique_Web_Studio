import { Module } from '@nestjs/common';
import { ExampleDomainController } from './example-domain.controller';
import { ExampleDomainService } from './example-domain.service';
import { ExampleRepository } from './repositories/example.repository';

// Phase 1.2D.1 reference/template module — copy this file's shape for
// every real future domain module; don't import this module itself into
// anything besides AppModule's own wiring below. Not @Global(): domain
// modules are scoped by default, unlike ConfigModule/LoggingModule, which
// exist to be available everywhere. Neither provider is exported —
// nothing outside this module needs either; a real domain module exports
// a provider only when another module genuinely needs to inject it (see
// docs/architecture/domain-module-guide.md "Export rules").
//
// ExampleRepository (Phase 1.2D.3) is registered here, alongside
// ExampleDomainService, but the two are NOT wired to each other —
// ExampleDomainService has no data-access need today (a ping endpoint
// has nothing to persist), so forcing an unused repository dependency
// into it would be exactly the speculative wiring this project's
// standing discipline avoids. Registering ExampleRepository here proves
// it resolves via DI at boot (see docs/architecture/domain-module-guide.md
// "Repository layer"); a real future service that needs persistence
// injects its module's repository the same way, never PrismaService
// directly.
@Module({
  controllers: [ExampleDomainController],
  providers: [ExampleDomainService, ExampleRepository],
})
export class ExampleDomainModule {}
