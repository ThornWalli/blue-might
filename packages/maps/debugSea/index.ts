import type { MapDescription } from '@blue-might/app/lib/types/map';

import heightMap from './heightMap.png';
import backgroundTexture from './texture_bg.png';
import foregroundTexture from './texture_fg.png';

export default function (): Omit<MapDescription, 'playerOptions'> {
  return {
    meta: {
      name: 'Default Map'
    },
    surface: {
      textures: {
        heightMap,
        backgroundTexture,
        foregroundTexture
      }
    },
    factions: [],
    units: []
  };
}
