// Phase 10, Module 1 (Performance) — the batch counterpart to
// NotificationResponseDto: a bulk write has no single row to return, so
// this reports how many were actually affected instead.
export class MarkNotificationsReadResponseDto {
  constructor(readonly count: number) {}
}
