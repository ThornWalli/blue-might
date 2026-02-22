import { Euler } from 'three';
import { randFloat } from 'three/src/math/MathUtils.js';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Map from '../Map';

declare module '../Map' {
  interface ModuleDebug {
    faction: boolean;
  }
}

type Observables = MapModuleObservables;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Options extends MapModuleState {}
interface State extends MapModuleState {
  rotation: Euler;
  speed: number;
}

export default class AirFlowModule extends MapModule<
  Options,
  State,
  Observables
> {
  static override TYPE = 'airFlow';

  constructor(map: Map, options: Options, states: State, debug: boolean) {
    super(
      map,
      options,
      {
        ...states,
        rotation: states.rotation ?? new Euler(0, randFloat(0, Math.PI * 2), 0),
        speed: states.speed ?? randFloat(0.1, 0.5)
      },
      debug
    );
  }

  getRotation() {
    return this.state.rotation;
  }

  getSpeed() {
    return this.state.speed;
  }
}
