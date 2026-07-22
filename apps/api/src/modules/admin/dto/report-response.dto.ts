import { ReportType } from '../../../../generated/prisma/enums';

export class ReportResponseDto {
  constructor(
    readonly id: string,
    readonly type: ReportType,
    readonly parameters: unknown,
    readonly result: unknown,
    readonly generatedByUserId: string | null,
    readonly createdAt: Date,
  ) {}
}
