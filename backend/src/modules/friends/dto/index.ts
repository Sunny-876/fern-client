import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendFriendRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'Target username or user ID is required.' })
  targetUsernameOrId: string;
}

export class BlockUserDto {
  @IsString()
  @IsOptional()
  reason?: string;
}
