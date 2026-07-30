export class CommentResponseDto {
  constructor(
    readonly id: string,
    readonly taskId: string | null,
    readonly milestoneId: string | null,
    readonly authorId: string | null,
    readonly body: string,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}
}
