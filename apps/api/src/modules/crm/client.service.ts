import { Injectable, NotFoundException } from '@nestjs/common';
import { ClientRepository } from './repositories/client.repository';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { ClientListQueryDto } from './dto/client-list-query.dto';
import { ClientResponseDto } from './dto/client-response.dto';
import { toClientResponseDto } from './mappers/client.mapper';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { Prisma } from '../../../generated/prisma/client';
import { ClientStatus } from '../../../generated/prisma/enums';

// Business logic + repository orchestration + mapping — see
// modules/catalog/category.service.ts's own header comment for the
// shared reasoning. No dedicated archive action route (no `clients:delete`
// permission is seeded) — moving to INACTIVE/ARCHIVED happens through the
// same general-purpose `update()` every other field goes through.
@Injectable()
export class ClientService {
  constructor(private readonly clientRepository: ClientRepository) {}

  async create(dto: CreateClientDto, tenantId: string): Promise<ClientResponseDto> {
    const client = await this.clientRepository.create({
      data: {
        tenantId,
        name: dto.name,
        industry: dto.industry,
        website: dto.website,
        primaryEmail: dto.primaryEmail,
        primaryPhone: dto.primaryPhone,
        status: ClientStatus.ACTIVE,
      },
    });
    return toClientResponseDto(client);
  }

  async findById(id: string, tenantId: string): Promise<ClientResponseDto> {
    const client = await this.clientRepository.findActiveById(id, tenantId);
    if (!client) {
      throw new NotFoundException(`Client ${id} not found`);
    }
    return toClientResponseDto(client);
  }

  async list(
    query: ClientListQueryDto,
    tenantId: string,
  ): Promise<PaginatedResponseDto<ClientResponseDto>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortDirection = query.sortDirection ?? 'desc';

    const where: Prisma.ClientWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { industry: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const { items, total } = await this.clientRepository.findManyPaginated(
      tenantId,
      where,
      { [sortBy]: sortDirection },
      (page - 1) * limit,
      limit,
    );

    return new PaginatedResponseDto(items.map(toClientResponseDto), total, page, limit);
  }

  async update(id: string, dto: UpdateClientDto, tenantId: string): Promise<ClientResponseDto> {
    const existing = await this.clientRepository.findActiveById(id, tenantId);
    if (!existing) {
      throw new NotFoundException(`Client ${id} not found`);
    }
    const updated = await this.clientRepository.update({
      where: { id },
      data: {
        name: dto.name,
        industry: dto.industry,
        website: dto.website,
        primaryEmail: dto.primaryEmail,
        primaryPhone: dto.primaryPhone,
        status: dto.status,
      },
    });
    return toClientResponseDto(updated);
  }
}
