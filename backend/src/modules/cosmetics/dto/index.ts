import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class EquipCosmeticDto {
  @IsString()
  @IsIn(['cape', 'cloak', 'hat', 'accessory', 'emote'], {
    message: 'Category must be one of: cape, cloak, hat, accessory, emote.',
  })
  category: 'cape' | 'cloak' | 'hat' | 'accessory' | 'emote';

  @IsString()
  @IsNotEmpty({ message: 'Cosmetic ID is required.' })
  cosmeticId: string;
}

export class UnequipCosmeticDto {
  @IsString()
  @IsIn(['cape', 'cloak', 'hat', 'accessory', 'emote'], {
    message: 'Category must be one of: cape, cloak, hat, accessory, emote.',
  })
  category: 'cape' | 'cloak' | 'hat' | 'accessory' | 'emote';
}
