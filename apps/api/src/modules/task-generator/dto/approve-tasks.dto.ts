import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority } from '../../../../generated/prisma/enums';

// One approved suggestion, ready to become a real Task — the human
// reviews `GenerateTasksDto`'s output and resubmits exactly the
// title/description they want kept (possibly edited), not the original
// AI suggestion object verbatim. `acceptanceCriteria`/`type` from the
// generation step are NOT accepted back here — Task has no field for
// either; a reviewer who wants acceptance criteria preserved folds them
// into `description` themselves (this module doesn't do it silently, so
// what ends up in the real Task is exactly what the human submitted).
export class ApprovedTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;
}

export class ApproveTasksDto {
  @IsUUID()
  projectId!: string;

  @IsOptional()
  @IsUUID()
  milestoneId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ApprovedTaskDto)
  tasks!: ApprovedTaskDto[];
}
