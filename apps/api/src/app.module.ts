import { Module } from '@nestjs/common';
import { ConfigModule } from './config';

@Module({
  imports: [
    ConfigModule,
    // Business modules attach here as they're built (Phase 1.2B+), each
    // owning its own controllers/services/repositories per
    // apps/api/src/modules/*/README.md:
    //   AuthModule, ProjectsModule, BillingModule, CrmModule,
    //   NotificationsModule, ContentModule
    // DatabaseModule (PrismaModule/PrismaService, apps/api/src/database/)
    // will be imported here too, ahead of any module that depends on it.
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
