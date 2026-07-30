import { Vendor } from '../../../../generated/prisma/client';
import { VendorResponseDto } from '../dto/vendor-response.dto';

export function toVendorResponseDto(vendor: Vendor): VendorResponseDto {
  return new VendorResponseDto(
    vendor.id,
    vendor.name,
    vendor.slug,
    vendor.contactName,
    vendor.contactEmail,
    vendor.contactPhone,
    vendor.gstin,
    vendor.paymentTerms,
    vendor.notes,
    vendor.status,
    vendor.createdAt,
    vendor.updatedAt,
  );
}
