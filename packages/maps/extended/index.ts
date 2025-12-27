import { Vector3 } from 'three';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import CombatHelicopter_1 from '@blue-might/units/combat_helicopter_1/CombatHelicopter_1';
import {
  Barrack_1,
  ControlTower_1,
  LandingPort_1,
  Tank_1,
  Tree_1,
  Soldat_1,
  Turret_1,
  CombatTank_1
} from '@blue-might/units';
import Faction from '@blue-might/app/lib/classes/Faction';
import { weapons } from '@blue-might/weapon';

import foregroundTexture from './texture_fg.png';
import backgroundTexture from './texture_bg.png';
import heightMap from './heightMap.png';

const blueFaction = new Faction({
  id: 'blue-faction',
  name: 'Blue Faction',
  colors: [0x0055aa, 0xcccccc]
});
const enemyFaction = new Faction({
  id: 'enemy-faction',
  name: 'Enemy Faction',
  colors: [0x205010, 0xa0b0a0]
});

export const playerFaction = blueFaction;
const desc: MapDescription = {
  name: 'Extended Map',
  textures: {
    heightMap,
    backgroundTexture,
    foregroundTexture
  },

  debug: {
    pathfinding: false
  },

  factions: [blueFaction, enemyFaction],

  units: [
    new Tree_1({
      position: new Vector3(37, 0, -23) // 3+34, 9-32
    }),
    new Tree_1({
      position: new Vector3(36.5, 0, -22) // 2.5+34, 10-32
    }),
    new LandingPort_1({
      position: new Vector3(43.5, 0, -26.5)
    }),
    new LandingPort_1({
      position: new Vector3(41.5, 0, -26.5)
    }),
    new ControlTower_1({
      position: new Vector3(37, 0, -27),
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      }
    }),
    new Barrack_1({
      position: new Vector3(44, 0, -31),
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      }
    }),
    new Barrack_1({
      position: new Vector3(42.83, 0, -31),
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      }
    }),

    new CombatHelicopter_1({
      id: 'combat-helicopter-1',
      position: new Vector3(43.5, 0, -26.5), // 34+9.5, -32+5.5
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      }
    }),
    new CombatTank_1({
      id: 'combat-tank-1',
      position: new Vector3(38.83, 0, -30.17),
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      }
    }),
    new Tank_1({
      position: new Vector3(38.17, 0, -30.17),
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      }
    }),
    new Tank_1({
      position: new Vector3(37.5, 0, -30.17),
      moduleStates: {
        faction: {
          faction: blueFaction
        },
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
            [36.17, -28.83], // 2.17+34, 3.17-32
            [36.17, -40.5], // 2.17+34, -8.5-32
            [47.83, -31.5], // 13.83+34, 0.5-32
            [43.5, -28.5], // 9.5+34, 3.5-32
            [42.83, -20.17], // 8.83+34, 11.83-32
            [32.17, -17.17], // -1.83+34, 14.83-32
            [26.83, -20.83], // -9.17+34, 11.17-32
            [36.17, -24.83] // 2.17+34, 7.17-32
          ]
        }
      }
    }),
    new Soldat_1({
      id: 'soldat-1',
      position: new Vector3(44.83, 0, -28.17),
      moduleStates: {
        faction: {
          faction: blueFaction
        },
        patrol: {
          active: false
        }
      },
      moduleOptions: {
        patrol: {
          path: [
            [44.83, -28.5],
            [45.5, -28.5],
            [45.5, -25.5],
            [37.5, -25.5],
            [37.5, -28.17],
            [44.83, -28.17]
          ]
        }
      }
    }),
    new Soldat_1({
      id: 'soldat-2',
      position: new Vector3(37.5, 0, -27.83),
      moduleStates: {
        faction: {
          faction: blueFaction
        },
        patrol: {
          active: false
        }
      },
      moduleOptions: {
        patrol: {
          path: [
            [37.5, -27.5],
            [37.5, -26.5],
            [36.5, -26.5],
            [36.5, -27.5]
          ]
        }
      }
    }),
    new Turret_1({
      position: new Vector3(45.17, 1, -25.83),
      moduleStates: {
        faction: {
          faction: blueFaction
        }
      },
      moduleOptions: {
        gun: {
          weapons: [new weapons.default()]
        }
      }
    })
  ]
};
export default desc;
