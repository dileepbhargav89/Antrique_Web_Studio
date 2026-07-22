import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { appConfig } from '../../config';
import { PrismaService } from '../../database/prisma.service';
import { RuntimeInfoResponseDto } from './dto/runtime-info-response.dto';

@Injectable()
export class RuntimeService {
  constructor(
    @Inject(appConfig.KEY) private readonly config: ConfigType<typeof appConfig>,
    private readonly prisma: PrismaService,
  ) {}

  async getRuntimeInfo(): Promise<RuntimeInfoResponseDto> {
    const databaseHealthy = await this.prisma.isHealthy();
    return new RuntimeInfoResponseDto(
      this.config.version,
      this.config.gitCommitSha,
      this.config.nodeEnv,
      process.uptime(),
      new Date().toISOString(),
      databaseHealthy ? 'ok' : 'error',
    );
  }
}
