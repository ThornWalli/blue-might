/* eslint-disable complexity */
import type { Object3D, Vector3, Texture } from 'three';
import { Raycaster, Vector2 } from 'three';

import { resizeCanvas } from './canvas';

export enum TILE_TYPE {
  BLOCKED = 0,
  SOFT = 1,
  DRY_ROAD = 2,
  BETON_ROAD = 3,
  GRASS = 4,
  WATER = 5
}

export const TILE_INDEX: { [key: number]: TILE_TYPE } = {
  [TILE_TYPE.BLOCKED]: TILE_TYPE.BLOCKED,
  [TILE_TYPE.DRY_ROAD]: TILE_TYPE.DRY_ROAD,
  [TILE_TYPE.BETON_ROAD]: TILE_TYPE.BETON_ROAD,
  [TILE_TYPE.GRASS]: TILE_TYPE.GRASS,
  [TILE_TYPE.WATER]: TILE_TYPE.WATER
};
const TILE_COSTS_GROUND: { [key: number]: number } = {
  [TILE_TYPE.BLOCKED]: Infinity,
  [TILE_TYPE.SOFT]: 9999,
  [TILE_TYPE.GRASS]: 1000,
  [TILE_TYPE.DRY_ROAD]: 200,
  [TILE_TYPE.BETON_ROAD]: 50,
  [TILE_TYPE.WATER]: 2000
};
const TILE_COSTS_SEA: { [key: number]: number } = {
  [TILE_TYPE.BLOCKED]: Infinity,
  [TILE_TYPE.SOFT]: Infinity,
  [TILE_TYPE.GRASS]: Infinity,
  [TILE_TYPE.DRY_ROAD]: Infinity,
  [TILE_TYPE.BETON_ROAD]: Infinity,
  [TILE_TYPE.WATER]: 50
};

export type TileCostsType = 'ground' | 'sea';
export function getTileCosts(type: TileCostsType = 'ground') {
  return type === 'ground' ? TILE_COSTS_GROUND : TILE_COSTS_SEA;
}

export function lineOfSight(a: Vector3, b: Vector3, colliders: Object3D[]) {
  const dir = b.clone().sub(a).normalize();
  const dist = a.distanceTo(b);
  const ray = new Raycaster(a, dir, 0, dist);
  const hits = ray.intersectObjects(colliders, true);

  return hits.length === 0;
}

export function getCostsFromImage(
  texture: Texture<ImageBitmap>,
  tileTypeByColor: (
    r: number,
    g: number,
    b: number,
    a: number
  ) => TILE_TYPE | undefined,
  size: Vector2 = new Vector2(64, 64),
  cellSize = 3,
  existsTileMap: (TILE_TYPE | undefined)[][] = []
) {
  size = size.clone().divideScalar(1 / cellSize); // Grid Size 3 Cells

  let canvas: HTMLCanvasElement | OffscreenCanvas =
    document.createElement('canvas');
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D =
    canvas.getContext('2d')!;
  ctx.drawImage(texture.image, 0, 0);

  canvas = resizeCanvas(canvas, size.x);
  ctx = canvas.getContext('2d')!;

  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const tileMap: (TILE_TYPE | undefined)[][] = [];

  const y_ = canvas.height;
  const x_ = canvas.width;
  for (let y = 0; y < y_; y++) {
    for (let x = 0; x < x_; x++) {
      const px = x;
      const py = y;

      const index = (py * canvas.width + px) * 4;
      const r = data[index + 0] ?? 0;
      const g = data[index + 1] ?? 0;
      const b = data[index + 2] ?? 0;
      const a = data[index + 3] ?? 0;

      if (!tileMap[y]) tileMap[y] = existsTileMap[y] ?? [];

      tileMap[y]![x] = tileTypeByColor(r, g, b, a) ?? existsTileMap[y]?.[x];
    }
  }

  return tileMap;
}
