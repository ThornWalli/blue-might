import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import factions, { FACTION } from '@blue-might/app/lib/utils/factions';

import foregroundTexture from './texture_fg.png';
import backgroundTexture from './texture_bg.png';
import heightMap from './heightMap.png';

export const playerFaction = FACTION.BLUE;
export default function (): MapDescription {
  return {
    name: 'Editor Map',

    playerOptions: {
      position: [43.5, 0, -26.5],
      rotation: [0, Math.PI, 0],
      faction: FACTION.BLUE,
      unit: {
        key: 'combat_helicopter_1'
      }
    },

    surface: {
      textures: {
        heightMap,
        backgroundTexture,
        foregroundTexture
      }
    },

    factions: [factions[FACTION.BLUE], factions[FACTION.ENEMY]],

    units: []
  };
}
