import type { Texture } from 'three';
import {
  CanvasTexture,
  ClampToEdgeWrapping,
  LinearFilter,
  NearestFilter,
  RepeatWrapping,
  SRGBColorSpace
} from 'three';

import { createCheckerboardCanvas } from './canvas';

export function checkerboardTexture(
  size: number,
  tileSize: number,
  color1: string,
  color2: string,
  repeatX = 4,
  repeatY = 4
) {
  const checkerboardCanvas = createCheckerboardCanvas(
    size,
    tileSize,
    color1,
    color2
  );
  const checkerboardTexture = new CanvasTexture(checkerboardCanvas);

  checkerboardTexture.wrapS = RepeatWrapping;
  checkerboardTexture.wrapT = RepeatWrapping;
  checkerboardTexture.repeat.set(repeatX, repeatY);
  return checkerboardTexture;
}

export function prepareTexture(
  texture: Texture,
  options: {
    pixelrated?: boolean;
    repeat?: boolean;
  } = {}
) {
  texture.colorSpace = SRGBColorSpace;
  texture.flipY = false;
  texture.generateMipmaps = true;
  if (options.pixelrated) {
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
  } else {
    texture.minFilter = LinearFilter;
    texture.magFilter = LinearFilter;
  }
  if (!options.repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  } else {
    texture.wrapS = ClampToEdgeWrapping;
    texture.wrapT = ClampToEdgeWrapping;
  }
  texture.needsUpdate = true;
  return texture;
}

export function generateNoiseTexture({
  width = 256,
  height = 256,
  intensity = 1.0,
  opacity = 1.0,
  monochrome = true
} = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    let r, g, b;

    if (monochrome) {
      const v = Math.floor(Math.random() * 255 * intensity);
      r = g = b = v;
    } else {
      r = Math.floor(Math.random() * 255 * intensity);
      g = Math.floor(Math.random() * 255 * intensity);
      b = Math.floor(Math.random() * 255 * intensity);
    }

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = Math.floor(255 * opacity);
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas;
}
