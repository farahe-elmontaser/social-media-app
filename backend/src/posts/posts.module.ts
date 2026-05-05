import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
import { Like } from './like.entity';
import { Comment } from './comment.entity';
import { CommentLike } from './comment-like.entity';
import { SavedPost } from './saved-post.entity';
import { Reel } from './reel.entity';
import { Follow } from '../users/follow.entity';
import { Message } from '../chat/message.entity';
import { PostsService } from './posts.service';
import { PostsController } from './posts.controller';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Post, Like, Comment, CommentLike, SavedPost, Reel, Follow, Message]),
    UsersModule,
  ],
  providers: [PostsService],
  controllers: [PostsController],
  exports: [PostsService],
})
export class PostsModule {}
