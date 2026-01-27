import { Euler } from 'three';
import { randFloat } from 'three/src/math/MathUtils.js';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';

declare module '../Map' {
  interface ModuleDebug {
    faction: boolean;
  }
}

type Observables = MapModuleObservables;

interface State extends MapModuleState {
  rotation: Euler;
  speed: number;
}

export default class AirFlowModule extends MapModule<State, Observables> {
  static override TYPE = 'airFlow';
  override state: State = {
    rotation: new Euler(0, randFloat(0, Math.PI * 2), 0),
    speed: randFloat(0.1, 0.5)
  };
  // constructor(map: Map, debug: boolean) {
  //   super(map, debug);
  // }

  getRotation() {
    return this.state.rotation;
  }

  getSpeed() {
    return this.state.speed;
  }
}
