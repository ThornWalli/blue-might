import { Euler, Vector3 } from 'three';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import {
  Barrack_1,
  ControlTower_1,
  LandingPort_1,
  Tank_1,
  Tree_1,
  Soldat_1,
  Turret_1,
  CombatHelicopter_1,
  CombatTank_1,
  House_1,
  LandingPortSupplyStation,
  SupplyStation,
  CombatShip_1,
  CombatSubmarine_1,
  Lighthouse_1,
  CombatFregatte_1,
  Flag_1,
  Church_1,
  Tree_2,
  Windsock_1
} from '@blue-might/units';
import { blueFaction, enemyFaction } from '@blue-might/app/lib/utils/factions';
import { neutralFaction } from '@blue-might/app/lib/classes/mapModule/Faction';
import MissleLauncher_1 from '@blue-might/units/turret/missle_launcher_1/MissleLauncher_1';

import foregroundTexture from './texture_fg.png';
import backgroundTexture from './texture_bg.png';
import heightMap from './heightMap.png';

export const playerFaction = blueFaction;
export default function (): MapDescription {
  return {
    name: 'Extended Map',
    ground: {
      heightMap,
      backgroundTexture,
      foregroundTexture
    },

    factions: [blueFaction, enemyFaction],

    units: [
      new CombatHelicopter_1({
        id: 'combat-helicopter-1',
        position: new Vector3(43.5, 0, -26.5), // 34+9.5, -32+5.5
        rotation: new Euler(0, Math.PI, 0),
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      }),
      ...[[40.5, -27.5]].map(
        position =>
          new Flag_1({
            position: new Vector3(position[0], 0, position[1])
          })
      ),
      ...[[42.5, -27.5]].map(
        position =>
          new Windsock_1({
            position: new Vector3(position[0], 0, position[1])
          })
      ),
      new CombatSubmarine_1({
        position: new Vector3(2.36, 0, -47.18),

        moduleOptions: {
          patrol: {
            active: true,
            path: [
              [2.36, -47.18],
              [-0.52, -12.95],
              [21.52, 9.29],
              [50.73, 4.61]
            ]
          },
          faction: {
            faction: enemyFaction
          }
        }
      }),
      new CombatFregatte_1({
        position: new Vector3(47.6, 0, 3.14),
        moduleDebug: {
          attack: false
        },
        moduleOptions: {
          patrol: {
            active: true,
            path: [
              [47.6, 3.14],
              [16.28, 1.01],
              [4.59, -17.27],
              [20.08, -30.01],
              [8.15, -50.87]
            ]
          },
          faction: {
            faction: enemyFaction
          }
        }
      }),

      ...[
        [27.67, -37.36],
        [26.13, -39.27],
        [37, -23]
      ].map(
        position =>
          new Tree_1({
            position: new Vector3(position[0], 0, position[1])
          })
      ),
      ...[[36.5, -22]].map(
        position =>
          new Tree_2({
            position: new Vector3(position[0], 0, position[1])
          })
      ),
      new LandingPort_1({
        position: new Vector3(43.5, 0, -26.5),
        moduleDebug: {
          collision: false
        }
      }),
      new LandingPort_1({
        position: new Vector3(41.5, 0, -26.5),
        moduleDebug: {
          collision: false
        }
      }),

      new SupplyStation({
        position: new Vector3(41.5, 0, -30.17),
        moduleDebug: {
          collision: false
        },
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      }),

      new LandingPortSupplyStation({
        position: new Vector3(39.5, 0, -26.5),
        moduleDebug: {
          collision: false
        },
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      }),
      new ControlTower_1({
        position: new Vector3(37, 0, -27),
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      }),
      new Lighthouse_1({
        position: new Vector3(26.38, 0, -36.66),
        moduleOptions: {
          faction: {
            faction: neutralFaction
          }
        }
      }),

      new Barrack_1({
        position: new Vector3(44, 0, -31),
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      }),
      new Barrack_1({
        position: new Vector3(42.83, 0, -31),
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      }),

      new CombatTank_1({
        id: 'combat-tank-1',
        position: new Vector3(38.83, 0, -30.17),
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      }),
      new Tank_1({
        position: new Vector3(38.17, 0, -30.17),
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      }),
      new Tank_1({
        position: new Vector3(37.5, 0, -30.17),
        moduleOptions: {
          faction: {
            faction: blueFaction
          },
          patrol: {
            active: false,
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
        moduleOptions: {
          faction: {
            faction: blueFaction
          },
          patrol: {
            active: true,
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
        moduleOptions: {
          faction: {
            faction: blueFaction
          },
          patrol: {
            active: false,
            path: [
              [37.5, -27.5],
              [37.5, -26.5],
              [36.5, -26.5],
              [36.5, -27.5]
            ]
          }
        }
      }),
      ...[
        [45.17, -25.83],
        [37.83, -25.83],
        [45.17, -32.5],
        [34.83, -32.5],
        [35.0, -25.24]
      ].map(
        position =>
          new Turret_1({
            position: new Vector3(position[0], 0, position[1]),
            moduleOptions: {
              faction: {
                faction: blueFaction
              }
            }
          })
      ),

      new Church_1({
        position: new Vector3(39.17, 0, -17.5),
        rotation: new Euler(0, 0, 0)
      }),

      ...[
        {
          position: new Vector3(38.17, 0, -20.17),
          rotation: new Euler(0, -Math.PI / 2, 0)
        },
        {
          position: new Vector3(40.83, 0, -20.5),
          rotation: new Euler(0, Math.PI, 0)
        }
      ].map(
        ({ position, rotation }) =>
          new House_1({
            position,
            rotation
          })
      ),

      new CombatShip_1({
        debug: false,
        position: new Vector3(15.61, 0, -29.73),
        moduleOptions: {
          faction: {
            faction: enemyFaction
          },
          patrol: {
            active: true,
            path: [
              [15.61, -29.73],
              [24.82, -30.45],
              [15.97, -42.65],
              [30.33, -51.45],
              [46.35, -50.18],
              [54.55, -35.34],
              [55.83, -20.47],
              [48.81, -10.18],
              [39.07, -2.54],
              [25.56, -2.82],
              [15.32, -9.53],
              [12.87, -19.34]
            ]
          }
        }
      }),
      new CombatShip_1({
        debug: false,
        position: new Vector3(30.33, 0, -51.45),
        moduleOptions: {
          faction: {
            faction: enemyFaction
          },
          patrol: {
            active: true,
            path: reversePath([
              [46.35, -50.18],
              [54.55, -35.34],
              [55.83, -20.47],
              [48.81, -10.18],
              [39.07, -2.54],
              [25.56, -2.82],
              [15.32, -9.53],
              [12.87, -19.34],
              [15.61, -29.73],
              [24.82, -30.45],
              [15.97, -42.65],
              [30.33, -51.45]
            ]) as [number, number][]
          }
        }
      }),

      new CombatShip_1({
        debug: false,
        position: new Vector3(55.83, 0, -20.47),
        moduleOptions: {
          faction: {
            faction: enemyFaction
          },
          patrol: {
            active: true,
            path: [
              [55.83, -20.47],
              [48.81, -10.18],
              [39.07, -2.54],
              [25.56, -2.82],
              [15.32, -9.53],
              [12.87, -19.34],
              [15.61, -29.73],
              [24.82, -30.45],
              [15.97, -42.65],
              [30.33, -51.45],
              [46.35, -50.18],
              [54.55, -35.34]
            ]
          }
        }
      }),

      ...[[0.5, 4.5]].map(
        position =>
          new MissleLauncher_1({
            position: new Vector3(position[0], 0, position[1]),
            moduleDebug: {
              attack: true
            },
            moduleOptions: {
              faction: {
                faction: enemyFaction
              }
            }
          })
      ),

      ...[
        [0.75, 9.96],
        [-2.98, 4.63]
      ].map(
        position =>
          new Turret_1({
            position: new Vector3(position[0], 0, position[1]),
            moduleOptions: {
              faction: {
                faction: enemyFaction
              }
            }
          })
      )
    ]
  };
}

function reversePath(path: number[][]): number[][] {
  return path.slice().reverse();
}
