import { IsString, MinLength, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
