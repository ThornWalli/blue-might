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
  CombatShip_1
} from '@blue-might/units';
import { weapons } from '@blue-might/weapon';
import { blueFaction, enemyFaction } from '@blue-might/app/lib/utils/factions';

import foregroundTexture from './texture_fg.png';
import backgroundTexture from './texture_bg.png';
import heightMap from './heightMap.png';

export const playerFaction = blueFaction;
export default function (): MapDescription {
  return {
    name: 'Extended Map',
    textures: {
      heightMap,
      backgroundTexture,
      foregroundTexture
    },

    factions: [blueFaction, enemyFaction],

    units: [
      new Tree_1({
        position: new Vector3(37, 0, -23)
      }),
      new Tree_1({
        position: new Vector3(36.5, 0, -22)
      }),
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
        moduleStates: {
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
        moduleStates: {
          faction: {
            faction: blueFaction
          }
        }
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
        rotation: new Euler(0, Math.PI, 0),
        moduleStates: {
          helicopter: {
            active: true
          },
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
            active: true
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
      ...[
        new Vector3(45.17, 1, -25.83),
        new Vector3(37.83, 0, -25.83),
        new Vector3(45.17, 1, -32.5),
        new Vector3(34.83, 0, -32.5),
        new Vector3(35.0, 0, -25.24)
      ].map(
        position =>
          new Turret_1({
            position,
            moduleStates: {
              faction: {
                faction: blueFaction
              }
            },
            moduleOptions: {
              weapon: {
                slots: [
                  {
                    slot: 0,
                    weapon: new weapons.default(),
                    ammunition: 30,
                    maxAmmunition: 30
                  }
                ]
              }
            }
          })
      ),
      new House_1({
        position: new Vector3(38.5, 0, -20.17),
        rotation: new Euler(0, Math.PI / 2, 0)
      }),

      new CombatShip_1({
        debug: false,
        position: new Vector3(15.61, 0, -29.73),
        moduleOptions: {
          attack: {
            followTarget: true
          },
          patrol: {
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
        },
        moduleStates: {
          weapon: {
            autoAimActive: true
          },
          movable: {
            active: true
          },
          faction: {
            faction: enemyFaction
          },
          patrol: {
            active: true
          }
        }
      }),
      new CombatShip_1({
        debug: false,
        position: new Vector3(30.33, 0, -51.45),
        moduleOptions: {
          attack: {
            followTarget: true
          },
          patrol: {
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
        },
        moduleStates: {
          weapon: {
            autoAimActive: true
          },
          movable: {
            active: true
          },
          faction: {
            faction: enemyFaction
          },
          patrol: {
            active: true
          }
        }
      }),
      new CombatShip_1({
        debug: false,
        position: new Vector3(55.83, 0, -20.47),
        moduleOptions: {
          attack: {
            followTarget: true
          },
          patrol: {
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
        },
        moduleStates: {
          weapon: {
            autoAimActive: true
          },
          movable: {
            active: true
          },
          faction: {
            faction: enemyFaction
          },
          patrol: {
            active: true
          }
        }
      })

      // new CombatShip_1({
      //   debug: false,
      //   id: 'combat-ship-1',
      //   position: new Vector3(55.83, 0, -20.47),
      //   moduleDebug: {
      //     pathfinding: true
      //   },
      //   moduleOptions: {
      //     attack: {
      //       followTarget: true
      //     }
      //   },
      //   moduleStates: {
      //     weapon: {
      //       autoAimActive: false
      //     },
      //     movable: {
      //       active: true
      //     },
      //     faction: {
      //       faction: blueFaction
      //     }
      //   }
      // })
    ]
  };
}

function reversePath(path: number[][]): number[][] {
  return path.slice().reverse();
}
