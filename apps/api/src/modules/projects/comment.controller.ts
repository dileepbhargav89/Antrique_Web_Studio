import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { COMMENT_ROUTE } from './constants/projects.constant';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentListQueryDto } from './dto/comment-list-query.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Tenant } from '../../common/decorators/tenant.decorator';
import { TenantContext } from '../../types/tenant-context.type';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';
import { PERMISSION } from '../auth/constants/permission.constant';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ApiStandardAuthErrors,
  ApiValidationError,
} from '../../common/decorators/api-standard-responses.decorator';
import { ApiPaginatedResponse } from '../../common/decorators/api-paginated-response.decorator';

@ApiTags('Comment')
@ApiBearerAuth('bearer')
@Controller(COMMENT_ROUTE)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.COMMENTS_WRITE)
  @ApiOperation({
    summary: 'Create a comment on a task or milestone (exactly one of taskId/milestoneId)',
  })
  @ApiCreatedResponse({ type: CommentResponseDto })
  @ApiStandardAuthErrors()
  @ApiValidationError()
  create(
    @Body() dto: CreateCommentDto,
    @Tenant() tenant: TenantContext,
  ): Promise<CommentResponseDto> {
    return this.commentService.create(dto, tenant.tenantId);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSION.COMMENTS_READ)
  @ApiOperation({ summary: 'List comments for a task or milestone (paginated)' })
  @ApiPaginatedResponse(CommentResponseDto)
  @ApiStandardAuthErrors()
  @ApiValidationError()
  list(
    @Query() query: CommentListQueryDto,
    @Tenant() tenant: TenantContext,
  ): Promise<PaginatedResponseDto<CommentResponseDto>> {
    return this.commentService.list(query, tenant.tenantId);
  }
}
