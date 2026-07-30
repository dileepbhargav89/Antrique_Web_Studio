import { Client } from '../../../../generated/prisma/client';
import { ClientResponseDto } from '../dto/client-response.dto';

export function toClientResponseDto(client: Client): ClientResponseDto {
  return new ClientResponseDto(
    client.id,
    client.name,
    client.industry,
    client.website,
    client.primaryEmail,
    client.primaryPhone,
    client.status,
    client.createdAt,
    client.updatedAt,
  );
}
