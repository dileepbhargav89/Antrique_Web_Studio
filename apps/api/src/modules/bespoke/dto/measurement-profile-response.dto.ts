import { MeasurementResponseDto } from './measurement-response.dto';

// `measurements` optional — same detail-vs-list convention as catalog's
// own ProductResponseDto.
export class MeasurementProfileResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly userId: string | null,
    readonly notes: string | null,
    readonly createdAt: Date,
    readonly updatedAt: Date,
    readonly measurements?: MeasurementResponseDto[],
  ) {}
}
