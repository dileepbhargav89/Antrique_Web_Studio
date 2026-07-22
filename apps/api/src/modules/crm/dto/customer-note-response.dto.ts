export class CustomerNoteResponseDto {
  constructor(
    readonly id: string,
    readonly customerId: string,
    readonly authorUserId: string | null,
    readonly body: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
