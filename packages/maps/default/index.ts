import { Vector3 } from 'three';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import heightMap from './heightMap.png';
import backgroundTexture from './texture_bg.png';
import foregroundTexture from './texture_fg.png';
import LandingPort_1 from '@blue-might/units/landing_port_1/LandingPort_1';
import Tank_1 from '@blue-might/units/tank_1/Tank_1';
import { Barrack_1, ControlTower_1 } from '@blue-might/units';
import CombatHelicopter_1 from '@blue-might/units/blue_might/CombatHelicopter_1';
import Tree_1 from '@blue-might/units/tree_1/Tree_1';
import Soldat_1 from '@blue-might/units/soldat_1/Soldat_1';
import Faction from '@blue-might/app/lib/classes/Faction';

const blueFaction = new Faction({
  id: 'blue-faction',
  name: 'Blue Faction',
  colors: [0x0055aa]
});
export const playerFaction = blueFaction;

const desc: MapDescription = {
  name: 'Default Map',
  textures: {
    heightMap,
    backgroundTexture,
    foregroundTexture
  },
  factions: [blueFaction],
  units: [
    new Tree_1({
      position: new Vector3(3, 0, 9)
    }),
    new Tree_1({
      position: new Vector3(2.5, 0, 10)
    }),
    new LandingPort_1({
      position: new Vector3(9.5, 0.4, 5.5)
    }),
    new LandingPort_1({
      position: new Vector3(-3, 0, 10)
    }),
    new Tank_1({
      id: 'tank-1',
      position: new Vector3(7.5, 0, 2)
    }),
    new Tank_1({
      position: new Vector3(8.5, 0, 2)
    }),
    new Tank_1({
      position: new Vector3(6.5, 0, 2),
      moduleStates: {
        movable: {
          active: true
        },
        patrol: {
          active: false
        }
      },
      moduleOptions: {
        patrol: {
          path: [
            [2.17, 3.17],
            [2.17, -8.5],
            [13.83, 0.5],
            [9.5, 3.5],
            [8.83, 11.83],
            [-1.83, 14.83],
            [-9.17, 11.17],
            [2.17, 7.17]
          ]
        }
      }
    }),
    new ControlTower_1({
      position: new Vector3(5, 0, 5)
    }),
    new CombatHelicopter_1({
      id: 'combat-helicopter-1',
      position: new Vector3(9.5, 0, 5.5),
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      }
    }),
    new Barrack_1({
      position: new Vector3(10.5, 0, 1)
    }),
    new Soldat_1({
      id: 'soldat-1',
      position: new Vector3(12.83, 0, 3.83),
      moduleStates: {
        patrol: {
          active: false
        }
      },
      moduleOptions: {
        patrol: {
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
    }),
    new Soldat_1({
      id: 'soldat-2',
      position: new Vector3(5.5, 0, 4.17),
      moduleStates: {
        patrol: {
          active: false
        }
      },
      moduleOptions: {
        patrol: {
          path: [
            [5.5, 4.5],
            [5.5, 5.5],
            [4.5, 5.5],
            [4.5, 4.5]
          ]
        }
      }
    })
  ]
};
export default desc;
