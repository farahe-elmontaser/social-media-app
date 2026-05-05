import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Post } from './post.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  userId!: string;

  @ManyToOne(() => Post, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'postId' })
  post!: Post;

  @Column()
  postId!: string;

  // FK stored as plain column — no self-referential @ManyToOne to avoid
  // TypeORM double-mapping the same column as both @Column and @JoinColumn FK.
  @Column({ nullable: true, type: 'uuid' })
  parentId!: string | null;

  @Column({ type: 'text' })
  content!: string;

  @Column({ default: 0 })
  likesCount!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
