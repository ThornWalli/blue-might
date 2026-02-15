import { snakeCase } from 'change-case';
import { Color, Vector2, Vector3 } from 'three';
import type { MapDescription } from '@blue-might/app/lib/types/map';

import Unit from '../lib/classes/Unit';

export async function createExport(description: MapDescription) {
  const JSZip = await import('jszip').then(m => m.default);
  const { saveAs } = await import('file-saver');

  //#region textures to blob
  const textureBlobs = (await Promise.all(
    Object.entries(description.surface.textures).map(([key, texture]) => {
      return fetch(texture)
        .then(response => response.blob())
        .then(blob => [key, blob]);
    })
  )) as [string, Blob][];
  //#endregion

  //#region create zip
  const zip = new JSZip();

  const textures = zip.folder('textures')!;
  const surface = {
    ...description.surface,
    textures: { ...description.surface.textures }
  };
  textureBlobs.forEach(([key, blob]) => {
    surface.textures[key as keyof MapDescription['surface']['textures']] =
      `textures/${key}.png`;
    textures.file(`${key}.png`, blob);
  });

  zip.file(
    'data.json',
    JSON.stringify({ ...description, surface }, (key, value) => {
      if (value instanceof Vector2 || value instanceof Vector3) {
        return {
          _type: 'Vector2',
          _value: value.toArray()
        };
      }
      if (value instanceof Color) {
        return value.getHexString();
      }
      if (value instanceof Unit) {
        return {
          key: value.key,
          id: value.id,
          position: value.position
        };
      }
      return value;
    })
  );

  const zipContent = await zip.generateAsync({ type: 'blob' });
  saveAs(zipContent, `${snakeCase(description.meta.name)}.zip`);

  //#endregion
}

export async function createImport(file: File) {
  const buffer = await readFile(file);
  return getMapDescriptionFromArrayBuffer(buffer);
}

export async function getMapDescriptionFromArrayBuffer(buffer: ArrayBuffer) {
  const JSZip = await import('jszip').then(m => m.default);
  const new_zip = new JSZip();
  const zip = await new_zip.loadAsync(buffer);
  const texturesFolder = zip.folder('textures');

  const textureBlobs = (await Promise.all(
    Object.entries(texturesFolder?.files ?? {})
      .filter(([fileName]) => {
        return fileName.startsWith('textures/') && fileName.endsWith('.png');
      })
      .map(async ([fileName, file]) => {
        const blob = await file.async('blob');
        return [
          fileName.replace(/textures\/(.*).png/, '$1'),
          URL.createObjectURL(blob)
        ];
      })
  )) as [string, string][];

  const description = JSON.parse(
    (await zip.file('data.json')?.async('text')) ?? '{}',
    (key, value) => {
      if (value && typeof value === 'object') {
        if (value._type === 'Vector2') {
          return new Vector2(...(value._value as [number, number]));
        }
        if (value._type === 'Vector3') {
          return new Vector3(...(value._value as [number, number, number]));
        }
        if (value._type === 'Color') {
          return new Color(value._value);
        }
      }
      return value;
    }
  ) as MapDescription;
  textureBlobs.forEach(([key, url]) => {
    Object.keys(description.surface.textures).forEach(textureKey => {
      if (textureKey === key) {
        description.surface.textures[
          textureKey as keyof MapDescription['surface']['textures']
        ] = url;
      }
    });
  });

  return description;
}

function readFile(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = event => {
      resolve(event.target?.result as ArrayBuffer);
    };
    reader.onerror = event => {
      reject(event);
    };
    reader.readAsArrayBuffer(file);
  });
}

export function convertColor(color: number | string): string {
  if (typeof color === 'number') {
    return `#${color.toString(16).padStart(6, '0')}`;
  }
  return color;
}
