import { Controller, Get, Post, Param, Body, Query, UseGuards, InternalServerErrorException } from '@nestjs/common';
import { PostsService, FeedResponse, CommentDto } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateReelDto } from './dto/create-reel.dto';
import { SharePostDto } from './dto/share-post.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { Post as PostEntity } from './post.entity';
import { Comment } from './comment.entity';
import { Reel } from './reel.entity';

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private postsService: PostsService) {}

  // GET /posts/feed?cursor=<ISO>&limit=10
  @Get('feed')
  getFeed(
    @CurrentUser() user: User,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = '10',
  ): Promise<FeedResponse> {
    return this.postsService.getFeed(user.id, cursor, parseInt(limit));
  }

  // Must be declared before :id routes to avoid route collision
  @Get('share-suggestions')
  getShareSuggestions(@CurrentUser() user: User): Promise<object[]> {
    return this.postsService.getShareSuggestions(user.id);
  }

  @Post()
  createPost(@CurrentUser() user: User, @Body() dto: CreatePostDto): Promise<PostEntity> {
    return this.postsService.createPost(user.id, dto);
  }

  @Post(':id/like')
  toggleLike(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ liked: boolean; count: number }> {
    return this.postsService.toggleLike(user.id, id);
  }

  @Post(':id/save')
  toggleSave(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<{ saved: boolean }> {
    return this.postsService.toggleSave(user.id, id);
  }

  @Post(':id/share')
  sharePost(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: SharePostDto,
  ): Promise<{ sent: boolean }> {
    return this.postsService.sharePost(user.id, id, dto.receiverId);
  }

  @Get(':id/comments')
  getComments(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ): Promise<CommentDto[]> {
    return this.postsService.getComments(id, user.id);
  }

  @Post(':id/comments')
  async addComment(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() dto: CreateCommentDto & { parentId?: string },
  ): Promise<Comment> {
    try {
      return await this.postsService.addComment(user.id, id, dto);
    } catch (err: unknown) {
      console.error('[PostsController] addComment error:', err);
      throw new InternalServerErrorException(
        err instanceof Error ? err.message : 'Failed to add comment',
      );
    }
  }

  @Post('comments/:commentId/like')
  toggleCommentLike(
    @Param('commentId') commentId: string,
    @CurrentUser() user: User,
  ): Promise<{ liked: boolean; count: number }> {
    return this.postsService.toggleCommentLike(user.id, commentId);
  }

  @Get('reels')
  getReels(
    @CurrentUser() user: User,
    @Query('page') page = '1',
  ): Promise<object[]> {
    return this.postsService.getReels(user.id, parseInt(page));
  }

  @Post('reels')
  createReel(@CurrentUser() user: User, @Body() dto: CreateReelDto): Promise<Reel> {
    return this.postsService.createReel(user.id, dto);
  }
}
