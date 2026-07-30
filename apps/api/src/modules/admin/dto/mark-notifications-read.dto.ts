import { IsOptional, IsUUID } from 'class-validator';

// Phase 10, Module 1 (Performance) — the one genuine, safe batch-write
// candidate this module's audit found (see docs/architecture/
// performance.md's Module 1 addendum for why nothing else qualified):
// marking notifications read has no per-row business logic the way task
// creation does, so a real `updateMany()` is safe. `userId` is optional,
// matching this controller's own existing "admin-wide across all
// recipients" design (NotificationController's own list() summary) — a
// caller with `notifications:manage` can mark one user's unread
// notifications read, or every unread notification tenant-wide if
// `userId` is omitted.
export class MarkNotificationsReadDto {
  @IsOptional()
  @IsUUID()
  userId?: string;
}
