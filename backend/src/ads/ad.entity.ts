import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('ads')
export class Ad {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column()
  mediaUrl!: string;

  @Column({ type: 'text', nullable: true })
  caption!: string;

  @Column({ nullable: true })
  ctaUrl!: string;

  @Column()
  sponsorName!: string;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}
