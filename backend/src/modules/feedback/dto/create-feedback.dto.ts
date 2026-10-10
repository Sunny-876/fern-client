import { IsString, IsNotEmpty, IsOptional, IsIn, MaxLength } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  @IsIn([
    'bug',
    'crash',
    'installation',
    'performance',
    'mod_compatibility',
    'ui',
    'feature_request',
    'suggestion',
    'other',
  ])
  category:
    | 'bug'
    | 'crash'
    | 'installation'
    | 'performance'
    | 'mod_compatibility'
    | 'ui'
    | 'feature_request'
    | 'suggestion'
    | 'other';

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string;

  @IsString()
  @IsOptional()
  @MaxLength(4000)
  reproductionSteps?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  expectedResult?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  actualResult?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  minecraftVersion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  javaVersion?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  loader?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  loaderVersion?: string;

  @IsString()
  @IsNotEmpty()
  clientVersion: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsOptional()
  diagnosticReport?: Record<string, any>;
}
