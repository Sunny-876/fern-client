import { Module } from '@nestjs/common';
import { CosmeticsController } from './cosmetics.controller';
import { CosmeticsService } from './cosmetics.service';

@Module({
  controllers: [CosmeticsController],
  providers: [CosmeticsService],
  exports: [CosmeticsService],
})
export class CosmeticsModule {}
