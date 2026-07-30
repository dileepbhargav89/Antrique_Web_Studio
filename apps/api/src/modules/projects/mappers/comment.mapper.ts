import { Comment } from '../../../../generated/prisma/client';
import { CommentResponseDto } from '../dto/comment-response.dto';

export function toCommentResponseDto(comment: Comment): CommentResponseDto {
  return new CommentResponseDto(
    comment.id,
    comment.taskId,
    comment.milestoneId,
    comment.authorId,
    comment.body,
    comment.createdAt,
    comment.updatedAt,
  );
}
