import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import { blueFaction, enemyFaction } from '@blue-might/app/lib/utils/factions';
import { neutralFaction } from '@blue-might/app/lib/classes/mapModule/Faction';
import type { UnitDescriptions } from '@blue-might/units';

import foregroundTexture from './texture_fg.png';
import backgroundTexture from './texture_bg.png';
import heightMap from './heightMap.png';

export const playerFaction = blueFaction;
export default function (): MapDescription {
  return {
    name: 'Extended Map',

    playerOptions: {
      position: [43.5, 0, -26.5],
      rotation: [0, Math.PI, 0],
      unit: {
        key: 'combat_helicopter_1'
      }
    },

    ground: {
      heightMap,
      backgroundTexture,
      foregroundTexture
    },

    factions: [blueFaction, enemyFaction],

    units: [
      ...([[40.5, -27.5]].map(position => ({
        key: 'flag_1',
        position: [position[0], 0, position[1]]
      })) as UnitDescriptions[]),
      ...([[42.5, -27.5]].map(position => ({
        key: 'windsock_1',
        position: [position[0], 0, position[1]]
      })) as UnitDescriptions[]),
      {
        key: 'combat_submarine_1',
        position: [2.36, 0, -47.18],
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
      },
      {
        key: 'combat_fregatte_1',
        position: [47.6, 0, 3.14],
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
      },

      ...([
        [27.67, -37.36],
        [26.13, -39.27],
        [37, -23]
      ].map(position => ({
        key: 'tree_1',
        position: [position[0], 0, position[1]]
      })) as UnitDescriptions[]),

      ...([[36.5, -22]].map(position => ({
        key: 'tree_2',
        position: [position[0], 0, position[1]]
      })) as UnitDescriptions[]),

      {
        key: 'landing_port_1',
        position: [43.5, 0, -26.5],
        moduleDebug: {
          collision: false
        }
      },
      {
        key: 'landing_port_1',
        position: [41.5, 0, -26.5],
        moduleDebug: {
          collision: false
        }
      },
      {
        key: 'supply_station_1',
        position: [41.5, 0, -30.17],
        moduleDebug: {
          collision: false
        },
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      },
      {
        key: 'landing_port_supply_station_1',
        position: [39.5, 0, -26.5],
        moduleDebug: {
          collision: false
        },
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      },
      {
        key: 'control_tower_1',
        position: [37, 0, -27],
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      },
      {
        key: 'lighthouse_1',
        position: [26.38, 0, -36.66],
        moduleOptions: {
          faction: {
            faction: neutralFaction
          }
        }
      },
      {
        key: 'barrack_1',
        position: [44, 0, -31],
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      },

      {
        key: 'barrack_1',
        position: [42.83, 0, -31],
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      },
      {
        key: 'combat_tank_1',
        id: 'combat-tank-1',
        position: [38.83, 0, -30.17],
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      },
      {
        key: 'tank_1',
        position: [38.17, 0, -30.17],
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      },
      {
        key: 'tank_1',
        position: [37.5, 0, -30.17],
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
      },
      {
        key: 'soldat_1',
        id: 'soldat-1',
        position: [44.83, 0, -28.17],
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
      },
      {
        key: 'soldat_1',
        id: 'soldat-2',
        position: [37.5, 0, -27.83],
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
      },
      ...([
        [45.17, -25.83],
        [37.83, -25.83],
        [45.17, -32.5],
        [34.83, -32.5],
        [35.0, -25.24]
      ].map(position => ({
        key: 'turret_1',
        position: [position[0], 0, position[1]],
        moduleOptions: {
          faction: {
            faction: blueFaction
          }
        }
      })) as UnitDescriptions[]),
      {
        key: 'church_1',
        position: [39.17, 0, -17.5],
        rotation: [0, 0, 0]
      },
      ...([
        {
          position: [38.17, 0, -20.17],
          rotation: [0, -Math.PI / 2, 0]
        },
        {
          position: [40.83, 0, -20.5],
          rotation: [0, Math.PI, 0]
        }
      ].map(({ position, rotation }) => ({
        key: 'house_1',
        position,
        rotation
      })) as UnitDescriptions[]),
      {
        key: 'combat_ship_1',
        position: [15.61, 0, -29.73],
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
      },
      {
        key: 'combat_ship_1',
        position: [30.33, 0, -51.45],
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
      },
      {
        key: 'combat_ship_1',
        position: [55.83, 0, -20.47],
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
      },
      ...([[0.5, 4.5]].map(position => ({
        key: 'missile_launcher_1',
        position: [position[0], 0, position[1]],
        moduleDebug: {
          attack: false
        },
        moduleOptions: {
          faction: {
            faction: enemyFaction
          }
        }
      })) as UnitDescriptions[]),
      ...([
        [0.75, 9.96],
        [-2.98, 4.63]
      ].map(position => ({
        key: 'turret_1',
        position: [position[0], 0, position[1]],
        moduleOptions: {
          faction: {
            faction: enemyFaction
          }
        }
      })) as UnitDescriptions[])
    ]
  };
}

function reversePath(path: number[][]): number[][] {
  return path.slice().reverse();
}
