import { Global, Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingRepository } from './repositories/setting.repository';

// @Global(), same shape as StorageModule/PdfModule/EmailModule — tenant
// branding is genuinely app-wide infra from its first two real consumers:
// the Admin Settings page (this module's own controller) AND
// QuotationService (CrmModule), which needs `loadBranding()` for the PDF
// letterhead. NOT nested under AdminModule: AdminModule already imports
// CrmModule (for its own dashboard/report KPIs), so CrmModule importing
// AdminModule back for SettingsService would be circular — living here,
// at the same top-level infra tier as storage/pdf/email, avoids that
// entirely, one-directional like every other cross-cutting service.
@Global()
@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingRepository],
  exports: [SettingsService],
})
export class SettingsModule {}
