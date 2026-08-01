import { SettingsService } from './settings.service';
import { SettingRepository } from './repositories/setting.repository';
import { StorageService } from '../storage';
import { UpdateBrandingDto } from './dto/update-branding.dto';
import * as malwareScanUtil from '../utils/malware-scan.util';

const TENANT_ID = '00000000-0000-7000-8000-000000000001';

// Same Jest-only virtual mock as product-image.service.spec.ts — `file-type`
// ships ESM-only, see that file's own comment.
const fileTypeFromBuffer = jest.fn(async () => undefined as { mime: string } | undefined);
jest.mock('file-type', () => ({ fileTypeFromBuffer }), { virtual: true });

const LOGO_BUFFER = Buffer.from('stand-in logo bytes — file-type is mocked in this spec');

function createFakeSettingRepository(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    findByKey: jest.fn(async () => null),
    upsertByKey: jest.fn(async (tenantId: string, key: string, value: unknown) => ({
      id: 'setting-1',
      tenantId,
      key,
      value,
    })),
    ...overrides,
  } as unknown as SettingRepository;
}

function createFakeStorageService(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    upload: jest.fn(async () => 'https://storage.example.com/branding/logo.png'),
    ...overrides,
  } as unknown as StorageService;
}

describe('SettingsService', () => {
  beforeEach(() => {
    fileTypeFromBuffer.mockClear();
    fileTypeFromBuffer.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function createService(
    overrides: {
      settingRepository?: SettingRepository;
      storageService?: StorageService;
    } = {},
  ) {
    return new SettingsService(
      overrides.settingRepository ?? createFakeSettingRepository(),
      overrides.storageService ?? createFakeStorageService(),
    );
  }

  describe('getBranding()', () => {
    it('returns an all-null branding object when nothing has been saved yet', async () => {
      const service = createService();

      const result = await service.getBranding(TENANT_ID);

      expect(result.companyName).toBeNull();
      expect(result.logoUrl).toBeNull();
    });

    it('returns the stored branding fields when a row exists', async () => {
      const settingRepository = createFakeSettingRepository({
        findByKey: jest.fn(async () => ({
          id: 'setting-1',
          tenantId: TENANT_ID,
          key: 'branding',
          value: { companyName: 'Antrique Web Studio', logoUrl: 'https://cdn/logo.png' },
        })),
      });
      const service = createService({ settingRepository });

      const result = await service.getBranding(TENANT_ID);

      expect(result.companyName).toBe('Antrique Web Studio');
      expect(result.logoUrl).toBe('https://cdn/logo.png');
    });
  });

  describe('updateBranding()', () => {
    it('shallow-merges new fields on top of the existing branding row', async () => {
      const settingRepository = createFakeSettingRepository({
        findByKey: jest.fn(async () => ({
          id: 'setting-1',
          tenantId: TENANT_ID,
          key: 'branding',
          value: { companyName: 'Old Name', email: 'old@antrique.dev' },
        })),
      });
      const service = createService({ settingRepository });
      const dto: UpdateBrandingDto = { companyName: 'Antrique Web Studio' };

      const result = await service.updateBranding(dto, TENANT_ID);

      expect(result.companyName).toBe('Antrique Web Studio');
      expect(result.email).toBe('old@antrique.dev');
      expect(settingRepository.upsertByKey).toHaveBeenCalledWith(
        TENANT_ID,
        'branding',
        expect.objectContaining({ companyName: 'Antrique Web Studio', email: 'old@antrique.dev' }),
        expect.any(String),
      );
    });
  });

  describe('uploadLogo()', () => {
    it('uploads to storage and persists both the URL and storage key', async () => {
      const settingRepository = createFakeSettingRepository();
      const storageService = createFakeStorageService();
      const service = createService({ settingRepository, storageService });

      const result = await service.uploadLogo(
        { buffer: LOGO_BUFFER, mimeType: 'image/png', originalName: 'logo.png' },
        TENANT_ID,
      );

      expect(storageService.upload).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'image/png' }),
      );
      expect(settingRepository.upsertByKey).toHaveBeenCalledWith(
        TENANT_ID,
        'branding',
        expect.objectContaining({
          logoUrl: 'https://storage.example.com/branding/logo.png',
          logoStorageKey: expect.stringContaining(`branding/${TENANT_ID}/logo-`),
        }),
        expect.any(String),
      );
      expect(result.logoUrl).toBe('https://storage.example.com/branding/logo.png');
    });

    it('uses the sniffed magic-byte MIME type for storage, not the client-claimed header', async () => {
      fileTypeFromBuffer.mockResolvedValueOnce({ mime: 'image/webp' });
      const storageService = createFakeStorageService();
      const service = createService({ storageService });

      await service.uploadLogo(
        { buffer: LOGO_BUFFER, mimeType: 'image/png', originalName: 'logo.png' },
        TENANT_ID,
      );

      expect(storageService.upload).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'image/webp' }),
      );
    });

    it('calls the malware-scan extension point before uploading to storage', async () => {
      const scanSpy = jest.spyOn(malwareScanUtil, 'scanBufferForMalware');
      const storageService = createFakeStorageService();
      const service = createService({ storageService });

      await service.uploadLogo(
        { buffer: LOGO_BUFFER, mimeType: 'image/png', originalName: 'logo.png' },
        TENANT_ID,
      );

      expect(scanSpy).toHaveBeenCalledWith(LOGO_BUFFER);
      const scanOrder = scanSpy.mock.invocationCallOrder[0];
      const uploadOrder = (storageService.upload as jest.Mock).mock.invocationCallOrder[0];
      expect(scanOrder).toBeDefined();
      expect(uploadOrder).toBeDefined();
      expect(scanOrder as number).toBeLessThan(uploadOrder as number);
    });
  });
});
