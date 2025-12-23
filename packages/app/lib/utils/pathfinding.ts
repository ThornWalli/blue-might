import type { Object3D, Vector3, Texture } from 'three';
import { Raycaster } from 'three';

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

export const TILE_COSTS: { [key: number]: number } = {
  [TILE_TYPE.BLOCKED]: Infinity, // Hohe Kosten für blockierte Zellen
  [TILE_TYPE.SOFT]: 9999,
  [TILE_TYPE.GRASS]: 1000,
  [TILE_TYPE.DRY_ROAD]: 200,
  [TILE_TYPE.BETON_ROAD]: 50,
  [TILE_TYPE.WATER]: 2000 // Beispiel: Wasser hat höhere Kosten
};

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
  size: number = 64 / (1 / 3)
) {
  function resizeCanvas(
    canvas: HTMLCanvasElement | OffscreenCanvas,
    width: number,
    height?: number
  ) {
    if (!width && height) {
      width = height * (canvas.width / canvas.height);
    } else if (!height) {
      height = width * (canvas.height / canvas.width);
    }
    const resizedCanvas = new OffscreenCanvas(width, height);
    const ctx = resizedCanvas.getContext(
      '2d'
    ) as OffscreenCanvasRenderingContext2D;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, width, height);
    return resizedCanvas;
  }

  let canvas: HTMLCanvasElement | OffscreenCanvas =
    document.createElement('canvas');
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D =
    canvas.getContext('2d')!;
  ctx.drawImage(texture.image, 0, 0);

  canvas = resizeCanvas(canvas, size);
  ctx = canvas.getContext('2d')!;

  const test: (number | undefined)[][] = [];
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

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

      if (!test[y]) test[y] = [];

      test[y]![x] = tileTypeByColor(r, g, b, a);
    }
  }

  return test;
}
