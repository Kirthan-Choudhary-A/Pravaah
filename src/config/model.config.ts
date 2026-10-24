/**
 * 3D Model and Asset Registry
 *
 * Rules:
 * - Records licence, attribution, and availability status for all 3D assets.
 * - Missing assets are marked status: "missing" with an empty path.
 * - In development, logs one clear console warning listing missing assets.
 * - Nothing in the UI pretends a missing asset exists.
 */

export interface ModelCameraConfig {
  readonly position: readonly [number, number, number];
  readonly fov: number;
  readonly minDistance: number;
  readonly maxDistance: number;
}

export interface ModelAssetEntry {
  readonly id: string;
  readonly title: string;
  readonly path: string;
  readonly licence: string;
  readonly attribution: string;
  readonly scale: readonly [number, number, number];
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
  readonly camera: ModelCameraConfig;
  readonly poster: string;
  readonly status: 'available' | 'missing';
}

export const MODEL_REGISTRY: Record<string, ModelAssetEntry> = {
  heroPlateCard: {
    id: 'heroPlateCard',
    title: 'Generic Registration Plate and PVC Licence Card',
    path: '', // Procedurally generated geometry
    licence: 'MIT / Apache 2.0 (Procedural meshes and Roboto/Inter sans typography)',
    attribution: 'Pravaah procedural studio assets (no trademarked government logos or emblems)',
    scale: [1, 1, 1],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    camera: {
      position: [0, 0, 5],
      fov: 35,
      minDistance: 3,
      maxDistance: 8,
    },
    poster: '/assets/posters/hero-plate-card.png',
    status: 'available',
  },
  twoWheelerModel: {
    id: 'twoWheelerModel',
    title: 'Two-Wheeler Vehicle CAD Asset',
    path: '', // Not present in repository
    licence: 'Pending open CC0 / CC-BY acquisition',
    attribution: 'Unassigned',
    scale: [1, 1, 1],
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    camera: {
      position: [0, 1.5, 4],
      fov: 45,
      minDistance: 2,
      maxDistance: 10,
    },
    poster: '/assets/posters/two-wheeler-fallback.png',
    status: 'missing',
  },
};

// Log warning in development for any missing assets
if (import.meta.env.DEV) {
  const missingAssets = Object.values(MODEL_REGISTRY)
    .filter((asset) => asset.status === 'missing')
    .map((asset) => `${asset.id} ("${asset.title}")`);

  if (missingAssets.length > 0) {
    console.warn(
      `[ModelRegistry] The following 3D assets are registered as missing and will use fallbacks: ${missingAssets.join(
        ', '
      )}`
    );
  }
}
