import { IsBoolean, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

export class UploadConfigDto {
  @IsObject()
  @IsNotEmpty({ message: 'Configuration payload object is required.' })
  config: Record<string, any>;

  @IsString()
  @IsOptional()
  parentRevisionId?: string;

  @IsBoolean()
  @IsOptional()
  force?: boolean;

  @IsString()
  @IsOptional()
  clientVersion?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
