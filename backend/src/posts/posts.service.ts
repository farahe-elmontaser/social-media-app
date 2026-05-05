import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Not, Repository } from 'typeorm';
import { Post } from './post.entity';
import { Like } from './like.entity';
import { Comment } from './comment.entity';
import { CommentLike } from './comment-like.entity';
import { SavedPost } from './saved-post.entity';
import { Reel } from './reel.entity';
import { Follow } from '../users/follow.entity';
import { Message } from '../chat/message.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CreateReelDto } from './dto/create-reel.dto';
import { UsersService } from '../users/users.service';

// ─── Simple in-memory cache (drop-in replacement for Redis) ──────────────────
// Key format: feed:{userId}:{cursor}  TTL: 2 min
interface CacheEntry { data: unknown; expiresAt: number }
const feedCache = new Map<string, CacheEntry>();

function cacheGet<T>(key: string): T | null {
  const entry = feedCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { feedCache.delete(key); return null; }
  return entry.data as T;
}

function cacheSet(key: string, data: unknown, ttlMs = 120_000): void {
  feedCache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function cacheInvalidateUser(userId: string): void {
  for (const key of feedCache.keys()) {
    if (key.startsWith(`feed:${userId}:`)) feedCache.delete(key);
  }
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface FeedPost {
  id: string;
  username: string;
  avatar: string;
  location: string;
  image: string;
  likes: number;
  caption: string;
  comments: number;
  timeAgo: string;
  isLiked: boolean;
  isSaved: boolean;
}

export interface FeedResponse {
  posts: FeedPost[];
  nextCursor: string | null;
  feedType: 'following' | 'discover';
}

export interface CommentDto {
  id: string;
  username: string;
  avatar: string;
  content: string;
  likes: number;
  isLiked: boolean;
  timeAgo: string;
  parentId: string | null;
  replies: CommentDto[];
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PostsService {
  constructor(
    @InjectRepository(Post) private postRepo: Repository<Post>,
    @InjectRepository(Like) private likeRepo: Repository<Like>,
    @InjectRepository(Comment) private commentRepo: Repository<Comment>,
    @InjectRepository(CommentLike) private commentLikeRepo: Repository<CommentLike>,
    @InjectRepository(SavedPost) private savedPostRepo: Repository<SavedPost>,
    @InjectRepository(Reel) private reelRepo: Repository<Reel>,
    @InjectRepository(Follow) private followRepo: Repository<Follow>,
    @InjectRepository(Message) private messageRepo: Repository<Message>,
    private usersService: UsersService,
  ) {}

  // ── Feed (cursor-based) ────────────────────────────────────────────────────

  async getFeed(userId: string, cursor?: string, limit = 10): Promise<FeedResponse> {
    const cacheKey = `feed:${userId}:${cursor ?? 'first'}`;
    const cached = cacheGet<FeedResponse>(cacheKey);
    if (cached) return cached;

    // Determine feed mode based on whether the user follows anyone
    const followRows = await this.followRepo.find({
      where: { followerId: userId },
      select: ['followingId'],
    });
    const followingIds = followRows.map((f) => f.followingId);
    const isDiscoverMode = followingIds.length === 0;

    const cursorWhere = cursor ? { createdAt: LessThan(new Date(cursor)) } : {};

    let posts: Post[];

    if (isDiscoverMode) {
      // No follows → show all posts sorted by popularity (most liked first)
      posts = await this.postRepo.find({
        where: cursorWhere,
        order: { likesCount: 'DESC', createdAt: 'DESC' },
        take: limit + 1,
      });
    } else {
      // Has follows → show followed users' posts (chronological)
      const includedIds = [...followingIds, userId];
      posts = await this.postRepo.find({
        where: { ...cursorWhere, userId: In(includedIds) },
        order: { createdAt: 'DESC' },
        take: limit + 1,
      });

      // Backfill remaining slots with popular posts from non-followed users
      if (posts.length < limit + 1) {
        const seenIds = posts.map((p) => p.id);
        const needed = limit + 1 - posts.length;
        const fill = await this.postRepo.find({
          where: { ...cursorWhere, userId: Not(In(includedIds)) },
          order: { likesCount: 'DESC', createdAt: 'DESC' },
          take: needed,
        });
        const newFill = fill.filter((p) => !seenIds.includes(p.id));
        posts = [...posts, ...newFill];
      }
    }

    const hasMore = posts.length > limit;
    if (hasMore) posts.pop();

    const result: FeedResponse = {
      posts: await Promise.all(
        posts.map(async (post) => {
          const [isLiked, isSaved] = await Promise.all([
            this.likeRepo.findOne({ where: { userId, postId: post.id } }),
            this.savedPostRepo.findOne({ where: { userId, postId: post.id } }),
          ]);
          return {
            id: post.id,
            username: post.user.username,
            avatar: post.user.avatar,
            location: post.location ?? '',
            image: post.imageUrl,
            likes: post.likesCount,
            caption: post.caption ?? '',
            comments: post.commentsCount,
            timeAgo: this.timeAgo(post.createdAt),
            isLiked: !!isLiked,
            isSaved: !!isSaved,
          };
        }),
      ),
      nextCursor: hasMore ? posts[posts.length - 1].createdAt.toISOString() : null,
      feedType: isDiscoverMode ? 'discover' : 'following',
    };

    cacheSet(cacheKey, result);
    return result;
  }

  // ── Create post ────────────────────────────────────────────────────────────

  async createPost(userId: string, dto: CreatePostDto): Promise<Post> {
    const post = this.postRepo.create({ ...dto, userId });
    const saved = await this.postRepo.save(post);
    await (this.usersService as unknown as { userRepo: Repository<{ id: string }> })
      .userRepo.increment({ id: userId }, 'postsCount', 1);
    return saved;
  }

  // ── Like / unlike post ─────────────────────────────────────────────────────

  async toggleLike(userId: string, postId: string): Promise<{ liked: boolean; count: number }> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.likeRepo.findOne({ where: { userId, postId } });
    if (existing) {
      await this.likeRepo.remove(existing);
      await this.postRepo.decrement({ id: postId }, 'likesCount', 1);
      cacheInvalidateUser(userId);
      return { liked: false, count: post.likesCount - 1 };
    }

    await this.likeRepo.save(this.likeRepo.create({ userId, postId }));
    await this.postRepo.increment({ id: postId }, 'likesCount', 1);
    cacheInvalidateUser(userId);
    return { liked: true, count: post.likesCount + 1 };
  }

  // ── Save / unsave post ─────────────────────────────────────────────────────

  async toggleSave(userId: string, postId: string): Promise<{ saved: boolean }> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const existing = await this.savedPostRepo.findOne({ where: { userId, postId } });
    if (existing) {
      await this.savedPostRepo.remove(existing);
      cacheInvalidateUser(userId);
      return { saved: false };
    }

    await this.savedPostRepo.save(this.savedPostRepo.create({ userId, postId }));
    cacheInvalidateUser(userId);
    return { saved: true };
  }

  // ── Comments ───────────────────────────────────────────────────────────────

  async addComment(
    userId: string,
    postId: string,
    dto: CreateCommentDto & { parentId?: string },
  ): Promise<Comment> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const comment = this.commentRepo.create({
      userId,
      postId,
      content: dto.content,
      // Only set parentId when it has a real value — never pass null explicitly
      // to avoid TypeORM FK constraint issues on the nullable uuid column.
      ...(dto.parentId ? { parentId: dto.parentId } : { parentId: null }),
    });
    const inserted = await this.commentRepo.save(comment);

    // Reload with eager user relation (save() doesn't trigger eager loading).
    // Without this, user is undefined and ClassSerializerInterceptor throws 500.
    const saved = await this.commentRepo.findOne({ where: { id: inserted.id } });
    if (!saved) throw new NotFoundException('Comment not found after save');

    if (!dto.parentId) {
      await this.postRepo.increment({ id: postId }, 'commentsCount', 1);
    }
    cacheInvalidateUser(userId);
    return saved;
  }

  async getComments(postId: string, userId: string): Promise<CommentDto[]> {
    const all = await this.commentRepo.find({
      where: { postId },
      order: { createdAt: 'ASC' },
    });

    const likedSet = new Set(
      (await this.commentLikeRepo.find({ where: { userId } })).map((l) => l.commentId),
    );

    const toDto = (c: Comment, replies: Comment[]): CommentDto => ({
      id: c.id,
      username: c.user.username,
      avatar: c.user.avatar,
      content: c.content,
      likes: c.likesCount,
      isLiked: likedSet.has(c.id),
      timeAgo: this.timeAgo(c.createdAt),
      parentId: c.parentId,
      replies: replies.filter((r) => r.parentId === c.id).map((r) => toDto(r, [])),
    });

    const roots = all.filter((c) => !c.parentId);
    const replies = all.filter((c) => !!c.parentId);
    return roots.map((root) => toDto(root, replies));
  }

  // ── Like / unlike comment ──────────────────────────────────────────────────

  async toggleCommentLike(userId: string, commentId: string): Promise<{ liked: boolean; count: number }> {
    const comment = await this.commentRepo.findOne({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    const existing = await this.commentLikeRepo.findOne({ where: { userId, commentId } });
    if (existing) {
      await this.commentLikeRepo.remove(existing);
      await this.commentRepo.decrement({ id: commentId }, 'likesCount', 1);
      return { liked: false, count: comment.likesCount - 1 };
    }

    await this.commentLikeRepo.save(this.commentLikeRepo.create({ userId, commentId }));
    await this.commentRepo.increment({ id: commentId }, 'likesCount', 1);
    return { liked: true, count: comment.likesCount + 1 };
  }

  // ── Reels ──────────────────────────────────────────────────────────────────

  async getReels(userId: string, page = 1): Promise<object[]> {
    const reels = await this.reelRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
      skip: (page - 1) * 10,
    });

    return reels.map((reel) => ({
      id: reel.id,
      username: reel.user.username,
      avatar: reel.user.avatar,
      caption: reel.caption,
      audio: reel.audioTitle ?? '🎵 Original Audio',
      thumbnail: reel.thumbnailUrl,
      likes: reel.likesCount,
      comments: reel.commentsCount,
      shares: reel.sharesCount,
      isLiked: false,
      isSaved: false,
    }));
  }

  async createReel(userId: string, dto: CreateReelDto): Promise<Reel> {
    const reel = this.reelRepo.create({ ...dto, userId });
    return this.reelRepo.save(reel);
  }

  // ── Share post ─────────────────────────────────────────────────────────────

  async sharePost(senderId: string, postId: string, receiverId: string): Promise<{ sent: boolean }> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    // Build a rich-text message that renders as an interactive card in the chat
    const caption = post.caption ? `"${post.caption.slice(0, 80)}${post.caption.length > 80 ? '…' : ''}"` : '';
    const content = `__SHARED_POST__${JSON.stringify({
      postId,
      imageUrl: post.imageUrl,
      username: post.user?.username ?? '',
      caption,
    })}`;

    await this.messageRepo.save(this.messageRepo.create({ senderId, receiverId, content }));
    await this.postRepo.increment({ id: postId }, 'sharesCount', 1);
    cacheInvalidateUser(senderId);

    return { sent: true };
  }

  // ── Share suggestions (interaction-scored following list) ──────────────────

  async getShareSuggestions(userId: string): Promise<object[]> {
    const follows = await this.followRepo.find({
      where: { followerId: userId },
      relations: ['following'],
    });

    const scored = await Promise.all(
      follows.map(async (f) => {
        // Count messages exchanged — primary interaction signal
        const msgCount = await this.messageRepo
          .createQueryBuilder('m')
          .where(
            '(m.senderId = :a AND m.receiverId = :b) OR (m.senderId = :b AND m.receiverId = :a)',
            { a: userId, b: f.followingId },
          )
          .getCount();

        // Mutual follow bonus
        const mutualFollow = await this.followRepo.findOne({
          where: { followerId: f.followingId, followingId: userId },
        });

        const score = msgCount * 2 + (mutualFollow ? 3 : 0);

        return {
          id: f.following.id,
          username: f.following.username,
          avatar: f.following.avatar,
          score,
        };
      }),
    );

    return scored.sort((a, b) => b.score - a.score);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private timeAgo(date: Date): string {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
}
