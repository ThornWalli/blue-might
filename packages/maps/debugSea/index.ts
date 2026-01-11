import type { MapDescription } from '@blue-might/app/lib/classes/Map';

import heightMap from './heightMap.png';
import backgroundTexture from './texture_bg.png';
import foregroundTexture from './texture_fg.png';

export default function (): MapDescription {
  return {
    name: 'Default Map',
    ground: {
      heightMap,
      backgroundTexture,
      foregroundTexture
    },
    factions: [],
    units: []
  };
}
