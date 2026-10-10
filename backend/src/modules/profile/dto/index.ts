import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsOptional()
  @Length(2, 32, { message: 'Display name must be between 2 and 32 characters.' })
  displayName?: string;

  @IsString()
  @IsOptional()
  avatar?: string;

  @IsString()
  @IsOptional()
  @Length(0, 250, { message: 'Bio must not exceed 250 characters.' })
  bio?: string;

  @IsString()
  @IsOptional()
  favoriteMinecraftVersion?: string;

  @IsString()
  @IsOptional()
  favoriteInstallation?: string;
}

export class UpdatePrivacyDto {
  @IsBoolean()
  @IsOptional()
  allowFriendRequests?: boolean;

  @IsBoolean()
  @IsOptional()
  allowProfileDiscovery?: boolean;

  @IsBoolean()
  @IsOptional()
  showOnlineStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  showPlayingStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  showMinecraftVersion?: boolean;

  @IsBoolean()
  @IsOptional()
  showInstallationName?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['everyone', 'friends_only', 'nobody'])
  allowProfileViewing?: 'everyone' | 'friends_only' | 'nobody';

  @IsBoolean()
  @IsOptional()
  invisibleMode?: boolean;
}
