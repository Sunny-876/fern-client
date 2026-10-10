import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CosmeticsService } from './cosmetics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { EquipCosmeticDto, UnequipCosmeticDto } from './dto';

@Controller('api/v1/cosmetics')
export class CosmeticsController {
  constructor(private readonly cosmeticsService: CosmeticsService) {}

  @Get('catalog')
  async getCatalog(@Query('category') category?: string) {
    const data = await this.cosmeticsService.getCatalog(category);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('catalog/:id')
  async getCosmeticById(@Param('id') id: string) {
    const data = await this.cosmeticsService.getCosmeticById(id);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('owned')
  @UseGuards(JwtAuthGuard)
  async getOwnedCosmetics(@CurrentUser('userId') userId: string) {
    const data = await this.cosmeticsService.getUserOwnership(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('equipped')
  @UseGuards(JwtAuthGuard)
  async getEquippedCosmetics(@CurrentUser('userId') userId: string) {
    const data = await this.cosmeticsService.getEquippedState(userId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('equipped/:targetUserId')
  async getEquippedByUserId(@Param('targetUserId') targetUserId: string) {
    const data = await this.cosmeticsService.getEquippedState(targetUserId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('equip')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async equipCosmetic(
    @CurrentUser('userId') userId: string,
    @Body() dto: EquipCosmeticDto,
  ) {
    const data = await this.cosmeticsService.equipCosmetic(userId, dto);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('unequip')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unequipCosmetic(
    @CurrentUser('userId') userId: string,
    @Body() dto: UnequipCosmeticDto,
  ) {
    const data = await this.cosmeticsService.unequipCosmetic(userId, dto);
    return { success: true, data, timestamp: Date.now() };
  }

  @Post('favorite/:cosmeticId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async toggleFavorite(
    @CurrentUser('userId') userId: string,
    @Param('cosmeticId') cosmeticId: string,
  ) {
    const data = await this.cosmeticsService.toggleFavorite(userId, cosmeticId);
    return { success: true, data, timestamp: Date.now() };
  }

  @Get('ingame-payload')
  @UseGuards(JwtAuthGuard)
  async getInGamePayload(
    @CurrentUser('userId') userId: string,
    @Query('model') model?: 'default' | 'slim',
  ) {
    const data = await this.cosmeticsService.getInGamePayload(userId, model || 'default');
    return { success: true, data, timestamp: Date.now() };
  }
}
