import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SettingRepository } from './repositories/setting.repository';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import { BrandingResponseDto } from './dto/branding-response.dto';
import { BRANDING_SETTING_KEY } from './settings.constant';
import { StorageService } from '../storage';
import { scanBufferForMalware } from '../utils/malware-scan.util';
import { Prisma } from '../../generated/prisma/client';

export interface UploadLogoInput {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

// Shape persisted in `Setting.value` — a superset of `BrandingResponseDto`:
// `logoStorageKey` is the S3 key `QuotationPdfService` re-downloads at
// render time (StorageService has no way to derive bytes back from a bare
// public URL), never exposed to the frontend (see BrandingResponseDto's
// own comment). Exported — `loadBranding()` (below) is this module's one
// cross-module surface, consumed directly by QuotationService for PDF
// rendering, not just internally by this service.
export interface TenantBranding {
  companyName: string | null;
  tagline: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  taxId: string | null;
  bankDetails: string | null;
  logoUrl: string | null;
  logoStorageKey: string | null;
}

const EMPTY_BRANDING: TenantBranding = {
  companyName: null,
  tagline: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  country: null,
  phone: null,
  email: null,
  website: null,
  taxId: null,
  bankDetails: null,
  logoUrl: null,
  logoStorageKey: null,
};

// New (this phase) — Tenant branding, backing both the Admin Settings
// page and QuotationPdfService's letterhead. Reuses the generic
// `Setting{key:'branding'}` row (see SettingRepository's own comment)
// rather than a dedicated model — one JSON blob per tenant is all a
// single-page settings form needs, no relations, no per-field query
// requirement that would justify real columns.
@Injectable()
export class SettingsService {
  constructor(
    private readonly settingRepository: SettingRepository,
    private readonly storageService: StorageService,
  ) {}

  async getBranding(tenantId: string): Promise<BrandingResponseDto> {
    const data = await this.loadBranding(tenantId);
    return this.toResponseDto(data);
  }

  async updateBranding(dto: UpdateBrandingDto, tenantId: string): Promise<BrandingResponseDto> {
    const existing = await this.loadBranding(tenantId);
    const merged: TenantBranding = {
      ...existing,
      ...Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined)),
    };
    await this.settingRepository.upsertByKey(
      tenantId,
      BRANDING_SETTING_KEY,
      merged as unknown as Prisma.InputJsonValue,
      'Tenant branding (company info + logo) for quotation letterheads',
    );
    return this.toResponseDto(merged);
  }

  // Also used by QuotationPdfService — returns the internal shape
  // (including `logoStorageKey`) rather than the sanitized response DTO,
  // since the PDF renderer needs the storage key to re-download logo
  // bytes, not just the public URL.
  async loadBranding(tenantId: string): Promise<TenantBranding> {
    const row = await this.settingRepository.findByKey(tenantId, BRANDING_SETTING_KEY);
    if (!row) return { ...EMPTY_BRANDING };
    return { ...EMPTY_BRANDING, ...(row.value as Partial<TenantBranding>) };
  }

  async uploadLogo(input: UploadLogoInput, tenantId: string): Promise<BrandingResponseDto> {
    // Same real-bytes-not-claimed-header discipline as
    // ProductImageService.upload() — see that file's own comment.
    const { fileTypeFromBuffer } = await import('file-type');
    const sniffed = await fileTypeFromBuffer(input.buffer);
    const contentType = sniffed?.mime ?? input.mimeType;

    await scanBufferForMalware(input.buffer);

    const extension = input.originalName.includes('.')
      ? input.originalName.split('.').pop()
      : undefined;
    const key = `branding/${tenantId}/logo-${randomUUID()}${extension ? `.${extension}` : ''}`;

    const logoUrl = await this.storageService.upload({ key, body: input.buffer, contentType });

    const existing = await this.loadBranding(tenantId);
    const merged: TenantBranding = { ...existing, logoUrl, logoStorageKey: key };
    await this.settingRepository.upsertByKey(
      tenantId,
      BRANDING_SETTING_KEY,
      merged as unknown as Prisma.InputJsonValue,
      'Tenant branding (company info + logo) for quotation letterheads',
    );
    return this.toResponseDto(merged);
  }

  private toResponseDto(data: TenantBranding): BrandingResponseDto {
    return new BrandingResponseDto(
      data.companyName,
      data.tagline,
      data.addressLine1,
      data.addressLine2,
      data.city,
      data.state,
      data.postalCode,
      data.country,
      data.phone,
      data.email,
      data.website,
      data.taxId,
      data.bankDetails,
      data.logoUrl,
    );
  }
}
