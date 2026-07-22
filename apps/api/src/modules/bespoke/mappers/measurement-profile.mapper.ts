import { Measurement, MeasurementProfile } from '../../../../generated/prisma/client';
import { MeasurementProfileResponseDto } from '../dto/measurement-profile-response.dto';
import { MeasurementResponseDto } from '../dto/measurement-response.dto';

function toMeasurementResponseDto(measurement: Measurement): MeasurementResponseDto {
  return new MeasurementResponseDto(
    measurement.id,
    measurement.name,
    measurement.value.toString(),
    measurement.unit,
    measurement.notes,
  );
}

export function toMeasurementProfileResponseDto(
  profile: MeasurementProfile,
  measurements?: Measurement[],
): MeasurementProfileResponseDto {
  return new MeasurementProfileResponseDto(
    profile.id,
    profile.name,
    profile.userId,
    profile.notes,
    profile.createdAt,
    profile.updatedAt,
    measurements?.map(toMeasurementResponseDto),
  );
}
