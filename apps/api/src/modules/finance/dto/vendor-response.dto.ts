import { VendorStatus } from '../../../../generated/prisma/enums';

export class VendorResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly slug: string,
    readonly contactName: string | null,
    readonly contactEmail: string | null,
    readonly contactPhone: string | null,
    readonly gstin: string | null,
    readonly paymentTerms: string | null,
    readonly notes: string | null,
    readonly status: VendorStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
