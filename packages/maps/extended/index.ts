import { Vector3 } from 'three';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import heightMap from './heightMap.png';
import backgroundTexture from './texture_bg.png';
import foregroundTexture from './texture_fg.png';
import BlueMight from '@blue-might/units/blue_might/BlueMight';
import {
  Barrack_1,
  ControlTower_1,
  LandingPort_1,
  Tank_1,
  Tree_1,
  Soldat_1
} from '@blue-might/units';

const desc: MapDescription = {
  name: 'Extended Map',
  textures: {
    heightMap,
    backgroundTexture,
    foregroundTexture
  },
  units: [
    new Tree_1({
      position: new Vector3(37, 0, -23) // 3+34, 9-32
    }),
    new Tree_1({
      position: new Vector3(36.5, 0, -22) // 2.5+34, 10-32
    }),
    new LandingPort_1({
      position: new Vector3(43.5, 0, -26.5) // 9.5+34, 5.5-32
    }),
    new LandingPort_1({
      position: new Vector3(31, 0, -22) // -3+34, 10-32
    }),
    new Tank_1({
      id: 'tank-1',
      position: new Vector3(38.83, 0, -30) // 7.5+34, 2-32
    }),
    new Tank_1({
      position: new Vector3(38.17, 0, -30) // 8.5+34, 2-32
    }),
    new Tank_1({
      position: new Vector3(37.5, 0, -30), // 6.5+34, 2-32
      moduleStates: {
        groundVehicle: {
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
    new ControlTower_1({
      position: new Vector3(37, 0, -27) // 5+34, 5-32
    }),
    new BlueMight({
      id: 'blue-might-1',
      position: new Vector3(43.5, 0, -26.5) // 34+9.5, -32+5.5
    }),
    new Barrack_1({
      position: new Vector3(44, 0, -31) // 34+10.5, -32+1
    }),
    new Soldat_1({
      id: 'soldat-1',
      position: new Vector3(44.83, 0, -28.17),
      moduleStates: {
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
    })
  ]
};
export default desc;
