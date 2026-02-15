import type { MapDescription } from '@blue-might/app/lib/types/map';
import factions, { FACTION } from '@blue-might/app/lib/utils/factions';

import foregroundTexture from './texture_fg.png';
import backgroundTexture from './texture_bg.png';
import heightMap from './heightMap.png';

export default function (): MapDescription {
  return {
    meta: {
      name: 'Default Map'
    },
    playerOptions: {
      position: [9.5, 0, 5.5],
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
    factions: [factions[FACTION.BLUE]],
    units: [
      {
        key: 'tree_1',
        position: [3, 0, 9]
      },
      {
        key: 'tree_2',
        position: [2.5, 0, 10]
      },
      {
        key: 'landing_port_1',
        position: [9.5, 0.4, 5.5]
      },
      {
        key: 'landing_port_1',
        position: [-3, 0, 10]
      },
      {
        key: 'tank_1',
        position: [7.5, 0, 2]
      },
      {
        key: 'tank_1',
        position: [8.5, 0, 2]
      },
      {
        key: 'tank_1',
        position: [6.5, 0, 2],
        moduleOptions: {
          movable: {
            active: true
          },
          patrol: {
            active: false,
            path: [
              [2.17, 3.17],
              [2.17, -8.5],
              [13.83, 0.5],
              [9.5, 3.5],
              [8.83, 11.83]
            ]
          }
        }
      },
      {
        key: 'control_tower_1',
        position: [5, 0, 5]
      },
      {
        key: 'barrack_1',
        position: [10.5, 0, 1]
      },
      {
        key: 'soldat_1',
        position: [12.83, 0, 3.83],
        moduleOptions: {
          patrol: {
            active: false,
            path: [
              [12.83, 3.5],
              [13.5, 3.5],
              [13.5, 6.5],
              [5.5, 6.5],
              [5.5, 3.83],
              [12.83, 3.83]
            ]
          }
        }
      },
      {
        key: 'soldat_1',
        position: [5.5, 0, 4.17],
        moduleOptions: {
          patrol: {
            active: false,
            path: [
              [5.5, 4.5],
              [5.5, 5.5],
              [4.5, 5.5],
              [4.5, 4.5]
            ]
          }
        }
      }
    ]
  };
}
