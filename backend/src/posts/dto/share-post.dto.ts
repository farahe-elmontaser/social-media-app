import { IsString, IsNotEmpty } from 'class-validator';

export class SharePostDto {
  @IsString()
  @IsNotEmpty()
  receiverId!: string;
}
