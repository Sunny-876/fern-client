import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdatePresenceDto {
  @IsString()
  @IsIn(['offline', 'online', 'in_launcher', 'playing_minecraft', 'invisible'])
  state: 'offline' | 'online' | 'in_launcher' | 'playing_minecraft' | 'invisible';

  @IsString()
  @IsOptional()
  minecraftVersion?: string;

  @IsString()
  @IsOptional()
  installationName?: string;
}
