import type { MapDescription } from '@blue-might/app/lib/classes/Map';

import heightMap from './heightMap.png';
import backgroundTexture from './texture_bg.png';
import foregroundTexture from './texture_fg.png';

const desc: MapDescription = {
  name: 'Default Map',
  textures: {
    heightMap,
    backgroundTexture,
    foregroundTexture
  },
  factions: [],
  units: []
};
export default desc;
