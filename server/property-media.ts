import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaClientLike = Prisma.TransactionClient | PrismaClient;

export function normalizeMediaAssetIds(mediaAssetIds: string[] | undefined): string[] {
  if (!mediaAssetIds || mediaAssetIds.length === 0) {
    return [];
  }

  return [...new Set(mediaAssetIds.map((id) => id.trim()).filter(Boolean))];
}

export async function assertMediaAssetsExist(
  db: PrismaClientLike,
  mediaAssetIds: string[],
): Promise<void> {
  if (mediaAssetIds.length === 0) {
    return;
  }

  const count = await db.mediaAsset.count({
    where: {
      id: {
        in: mediaAssetIds,
      },
    },
  });

  if (count !== mediaAssetIds.length) {
    throw new Error("MEDIA_ASSET_NOT_FOUND");
  }
}

export function buildPropertyMediaRows(propertyId: string, mediaAssetIds: string[]) {
  return mediaAssetIds.map((mediaAssetId, index) => ({
    propertyId,
    mediaAssetId,
    sortOrder: index,
  }));
}

type MediaLinkLike = {
  mediaAsset: unknown;
};

export function serializePropertyImages<
  T extends {
    mediaLinks?: MediaLinkLike[];
  },
>(property: T): Omit<T, "mediaLinks"> & { images: unknown[] } {
  const { mediaLinks = [], ...rest } = property as T & {
    mediaLinks?: MediaLinkLike[];
  };

  return {
    ...rest,
    images: mediaLinks.map((link) => link.mediaAsset),
  };
}

export function serializePropertyImageList<
  T extends {
    mediaLinks?: MediaLinkLike[];
  },
>(properties: T[]): Array<Omit<T, "mediaLinks"> & { images: unknown[] }> {
  return properties.map((property) => serializePropertyImages(property));
}
