// Response shape for GET/PATCH /settings/branding and POST
// /settings/branding/logo — all three return the same full branding
// object so the frontend never has to guess which fields survived a
// partial update. `logoStorageKey` is intentionally NOT exposed — it's
// an internal S3 key (QuotationPdfService's own re-download handle, see
// StorageService.download()), the public `logoUrl` is what the frontend
// ever needs to render a preview.
export class BrandingResponseDto {
  constructor(
    readonly companyName: string | null,
    readonly tagline: string | null,
    readonly addressLine1: string | null,
    readonly addressLine2: string | null,
    readonly city: string | null,
    readonly state: string | null,
    readonly postalCode: string | null,
    readonly country: string | null,
    readonly phone: string | null,
    readonly email: string | null,
    readonly website: string | null,
    readonly taxId: string | null,
    readonly bankDetails: string | null,
    readonly logoUrl: string | null,
  ) {}
}
