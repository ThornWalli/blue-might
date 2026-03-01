import { snakeCase } from 'change-case';
import { Color, Vector2, Vector3 } from 'three';
import type { MapDescription } from '@blue-might/app/lib/types/map';

import Unit from '../lib/classes/Unit';
import type { SurfaceModuleOptions } from '../lib/classes/mapModule/Surface';

export async function createExport(description: MapDescription) {
  const JSZip = await import('jszip').then(m => m.default);
  const { saveAs } = await import('file-saver');

  const surfaceModule = description.moduleOptions.surface;
  if (!surfaceModule?.textures)
    throw new Error('Surface textures not found in map description');

  //#region textures to blob
  const textureBlobs = (await Promise.all(
    Object.entries(surfaceModule.textures).map(([key, texture]) => {
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
    ...description.moduleOptions.surface,
    textures: { ...surfaceModule.textures }
  };
  textureBlobs.forEach(([key, blob]) => {
    surface.textures[key as keyof SurfaceModuleOptions['textures']] =
      `textures/${key}.png`;
    textures.file(`${key}.png`, blob);
  });

  zip.file(
    'data.json',
    JSON.stringify(
      {
        ...description,
        moduleOptions: {
          ...description.moduleOptions,
          surface: {
            ...description.moduleOptions.surface,
            textures: { ...surface.textures }
          }
        }
      } as MapDescription,
      (key, value) => {
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
      }
    )
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

  let description = JSON.parse(
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

  description = fromLegacyMapDescription(description);

  const surfaceModule = description.moduleOptions.surface;
  if (!surfaceModule?.textures)
    throw new Error('Surface textures not found in map description');
  const textures = surfaceModule.textures;

  textureBlobs.forEach(([key, url]) => {
    Object.keys(textures).forEach(textureKey => {
      if (textureKey === key) {
        textures[textureKey as keyof SurfaceModuleOptions['textures']] = url;
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

export function fromLegacyMapDescription(
  description: MapDescription
): MapDescription {
  if ('debug' in description && description.debug) {
    description.moduleOptions = {
      ...description.moduleOptions,
      debug: {
        ...description.debug
      }
    };
  }
  if ('units' in description && description.units) {
    description.moduleOptions = {
      ...description.moduleOptions,
      units: {
        units: description.units
      }
    };
  }
  if ('factions' in description && description.factions) {
    description.moduleOptions = {
      ...description.moduleOptions,
      faction: {
        factions: description.factions
      }
    };
  }
  if ('surface' in description && description.surface) {
    description.moduleOptions = {
      ...description.moduleOptions,
      surface: {
        textures: description.surface.textures,
        heightMap: description.surface.heightMap,
        noise: description.surface.noise
      }
    };
  }

  return description;
}
