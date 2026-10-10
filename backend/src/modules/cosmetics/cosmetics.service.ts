import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EquipCosmeticDto, UnequipCosmeticDto } from './dto';

@Injectable()
export class CosmeticsService {
  private readonly logger = new Logger(CosmeticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCatalog(category?: string) {
    const where = category ? { category } : {};
    return this.prisma.cosmeticDefinition.findMany({
      where,
      orderBy: { id: 'asc' },
    });
  }

  async getCosmeticById(id: string) {
    const cosmetic = await this.prisma.cosmeticDefinition.findUnique({
      where: { id },
    });
    if (!cosmetic) {
      throw new NotFoundException(`Cosmetic item '${id}' not found`);
    }
    return cosmetic;
  }

  async getUserOwnership(userId: string) {
    const ownerships = await this.prisma.cosmeticOwnership.findMany({
      where: { userId },
      include: { cosmetic: true },
    });

    const ownedCosmeticIds = ownerships.map((o) => o.cosmeticId);
    const favorites = ownerships.filter((o) => o.isFavorite).map((o) => o.cosmeticId);
    const unlockedAt: Record<string, number> = {};
    for (const o of ownerships) {
      unlockedAt[o.cosmeticId] = o.unlockedAt.getTime();
    }

    return {
      userId,
      ownedCosmeticIds,
      favorites,
      unlockedAt,
    };
  }

  async getEquippedState(userId: string) {
    const equipped = await this.prisma.equippedCosmetic.findMany({
      where: { userId },
    });

    const map: Record<string, string> = {};
    let latest = 0;
    for (const eq of equipped) {
      map[eq.category] = eq.cosmeticId;
      if (eq.updatedAt.getTime() > latest) {
        latest = eq.updatedAt.getTime();
      }
    }

    return {
      userId,
      equipped: map,
      lastUpdated: latest || Date.now(),
    };
  }

  async equipCosmetic(userId: string, dto: EquipCosmeticDto) {
    // Verify cosmetic definition exists
    const cosmetic = await this.prisma.cosmeticDefinition.findUnique({
      where: { id: dto.cosmeticId },
    });
    if (!cosmetic) {
      throw new NotFoundException(`Cosmetic item '${dto.cosmeticId}' does not exist.`);
    }

    if (cosmetic.category !== dto.category) {
      throw new BadRequestException(
        `Cosmetic category mismatch: item is '${cosmetic.category}', requested slot is '${dto.category}'.`,
      );
    }

    // SERVER AUTHORITATIVE OWNERSHIP CHECK
    const ownership = await this.prisma.cosmeticOwnership.findUnique({
      where: {
        userId_cosmeticId: {
          userId,
          cosmeticId: dto.cosmeticId,
        },
      },
    });

    if (!ownership) {
      throw new ForbiddenException(
        `Ownership validation failed: You do not own the cosmetic item '${dto.cosmeticId}'.`,
      );
    }

    // Upsert equipped slot
    await this.prisma.equippedCosmetic.upsert({
      where: {
        userId_category: {
          userId,
          category: dto.category,
        },
      },
      update: {
        cosmeticId: dto.cosmeticId,
      },
      create: {
        userId,
        category: dto.category,
        cosmeticId: dto.cosmeticId,
      },
    });

    return this.getEquippedState(userId);
  }

  async unequipCosmetic(userId: string, dto: UnequipCosmeticDto) {
    await this.prisma.equippedCosmetic.deleteMany({
      where: {
        userId,
        category: dto.category,
      },
    });

    return this.getEquippedState(userId);
  }

  async toggleFavorite(userId: string, cosmeticId: string) {
    const ownership = await this.prisma.cosmeticOwnership.findUnique({
      where: {
        userId_cosmeticId: {
          userId,
          cosmeticId,
        },
      },
    });

    if (!ownership) {
      throw new ForbiddenException(`You do not own cosmetic '${cosmeticId}'.`);
    }

    const updated = await this.prisma.cosmeticOwnership.update({
      where: { id: ownership.id },
      data: { isFavorite: !ownership.isFavorite },
    });

    const favorites = await this.prisma.cosmeticOwnership.findMany({
      where: { userId, isFavorite: true },
      select: { cosmeticId: true },
    });

    return favorites.map((f) => f.cosmeticId);
  }

  async getInGamePayload(userId: string, playerModel: 'default' | 'slim' = 'default') {
    const equipped = await this.getEquippedState(userId);
    const catalog = await this.getCatalog();
    const catalogMap = new Map(catalog.map((c) => [c.id, c]));

    const equippedDefs: Record<string, any> = {};
    for (const [cat, id] of Object.entries(equipped.equipped)) {
      if (id && catalogMap.has(id)) {
        equippedDefs[cat] = catalogMap.get(id);
      }
    }

    return {
      userId,
      playerUuid: 'server_verified_uuid',
      playerModel,
      equipped: equippedDefs,
      cosmeticsEnabled: true,
    };
  }
}
