import { Vector3 } from 'three';
import type { MapDescription } from '@blue-might/app/lib/classes/Map';
import heightMap from './heightMap.png';
import backgroundTexture from './texture_bg.png';
import foregroundTexture from './texture_fg.png';
import LandingPort_1 from '@blue-might/units/landing_port_1/LandingPort_1';
import Tank_1 from '@blue-might/units/tank_1/Tank_1';
import { Barrack_1, ControlTower_1 } from '@blue-might/units';
import BlueMight from '@blue-might/units/blue_might/BlueMight';
import Tree_1 from '@blue-might/units/tree_1/Tree_1';
import Soldat_1 from '@blue-might/units/soldat_1/Soldat_1';

const desc: MapDescription = {
  name: 'Default Map',
  textures: {
    heightMap,
    backgroundTexture,
    foregroundTexture
  },
  units: [
    new Tree_1({
      position: new Vector3(3, 0, 9)
    }),
    new Tree_1({
      position: new Vector3(2.5, 0, 10)
    }),
    new LandingPort_1({
      position: new Vector3(9, 0, 5)
    }),
    new LandingPort_1({
      position: new Vector3(-3, 0, 10)
    }),
    new Tank_1({
      id: 'tank-1',
      position: new Vector3(7, 0, 2)
    }),
    new Tank_1({
      position: new Vector3(8, 0, 2)
    }),
    new Tank_1({
      position: new Vector3(9, 0, 2)
    }),
    new ControlTower_1({
      position: new Vector3(5, 0, 5)
    }),
    new BlueMight({
      id: 'blue-might-1',
      position: new Vector3(9, 0.4, 5)
    }),
    new Barrack_1({
      position: new Vector3(11, 0, 1)
    }),
    new Soldat_1({
      position: new Vector3(11, 0, 2)
    })
  ]
};
export default desc;
