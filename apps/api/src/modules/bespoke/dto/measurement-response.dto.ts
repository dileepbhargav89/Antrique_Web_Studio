import { MeasurementUnit } from '../../../../generated/prisma/enums';

export class MeasurementResponseDto {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly value: string,
    readonly unit: MeasurementUnit,
    readonly notes: string | null,
  ) {}
}
