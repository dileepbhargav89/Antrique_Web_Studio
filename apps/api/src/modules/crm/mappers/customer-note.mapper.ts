import { CustomerNote } from '../../../../generated/prisma/client';
import { CustomerNoteResponseDto } from '../dto/customer-note-response.dto';

export function toCustomerNoteResponseDto(note: CustomerNote): CustomerNoteResponseDto {
  return new CustomerNoteResponseDto(
    note.id,
    note.customerId,
    note.authorUserId,
    note.body,
    note.createdAt,
    note.updatedAt,
  );
}
