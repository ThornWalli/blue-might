import type { Object3D, Vector3, Texture } from 'three';
import { Raycaster, Vector2 } from 'three';

import { resizeCanvas } from './canvas';

export type TileType = number;

export enum TILE_TYPE {
  // General
  BLOCKED = 0,
  SOFT = 1,

  // Ground 100-199
  WATER = 100,
  GRASS = 101,
  // Road 200-299
  DRY_ROAD = 200,
  BETON_ROAD = 201,
  // Units 300-399
  UNIT = 300,
  UNIT_GROUND = 301,
  UNIT_AIR = 302,
  UNIT_SEA = 303,
  UNIT_BUILDING = 304,
  UNIT_HIGH_BUILDING = 305,
  UNIT_PLATFORM = 306
}

export type TILE_TYPE_COSTS = {
  [key: number]: number;
  [TILE_TYPE.BLOCKED]: number;
  [TILE_TYPE.SOFT]: number;
  [TILE_TYPE.GRASS]: number;
  [TILE_TYPE.DRY_ROAD]: number;
  [TILE_TYPE.BETON_ROAD]: number;
  [TILE_TYPE.WATER]: number;
};

export const TILE_INDEX = Object.freeze({
  [TILE_TYPE.BLOCKED]: TILE_TYPE.BLOCKED,
  [TILE_TYPE.SOFT]: TILE_TYPE.SOFT,
  [TILE_TYPE.DRY_ROAD]: TILE_TYPE.DRY_ROAD,
  [TILE_TYPE.BETON_ROAD]: TILE_TYPE.BETON_ROAD,
  [TILE_TYPE.GRASS]: TILE_TYPE.GRASS,
  [TILE_TYPE.WATER]: TILE_TYPE.WATER,
  // Units
  [TILE_TYPE.UNIT]: TILE_TYPE.UNIT,
  [TILE_TYPE.UNIT_GROUND]: TILE_TYPE.UNIT_GROUND,
  [TILE_TYPE.UNIT_AIR]: TILE_TYPE.UNIT_AIR,
  [TILE_TYPE.UNIT_SEA]: TILE_TYPE.UNIT_SEA,
  [TILE_TYPE.UNIT_BUILDING]: TILE_TYPE.UNIT_BUILDING,
  [TILE_TYPE.UNIT_HIGH_BUILDING]: TILE_TYPE.UNIT_HIGH_BUILDING,
  [TILE_TYPE.UNIT_PLATFORM]: TILE_TYPE.UNIT_PLATFORM
});

export const TILE_TYPES = [
  TILE_TYPE.BLOCKED,
  TILE_TYPE.SOFT,
  TILE_TYPE.DRY_ROAD,
  TILE_TYPE.BETON_ROAD,
  TILE_TYPE.GRASS,
  TILE_TYPE.WATER,
  TILE_TYPE.UNIT,
  TILE_TYPE.UNIT_GROUND,
  TILE_TYPE.UNIT_AIR,
  TILE_TYPE.UNIT_SEA,
  TILE_TYPE.UNIT_BUILDING,
  TILE_TYPE.UNIT_HIGH_BUILDING,
  TILE_TYPE.UNIT_PLATFORM
];

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
