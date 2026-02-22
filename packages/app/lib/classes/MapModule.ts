import type { SubscriptionLike } from 'rxjs';
import type { Object3D } from 'three';

import type Map from './Map';
import Module, { type ModuleObservables, type ModuleState } from './Module';

export interface MapModuleObservables extends ModuleObservables {
  [key: string]: SubscriptionLike | unknown;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MapModuleOptions extends ModuleState {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MapModuleState extends ModuleState {}

export default abstract class MapModule<
  Options extends MapModuleOptions = MapModuleOptions,
  State extends MapModuleState = MapModuleState,
  Observables extends MapModuleObservables = MapModuleObservables
> extends Module<State, Observables> {
  constructor(
    public map: Map,
    public options: Options = {} as Options,
    state: State = {} as State,
    debug?: boolean
  ) {
    super(state, debug);
  }

  getScene() {
    return this.map.app.renderer.scene;
  }

  addToScene(object: Object3D) {
    this.getScene().add(object);
  }

  removeFromScene(object: Object3D) {
    this.getScene().remove(object);
  }

  async getOptions() {
    return {};
  }
}
