import type { SubscriptionLike } from 'rxjs';
import type { Object3D } from 'three';

import type Map from './Map';
import Module, { type ModuleObservables, type ModuleState } from './Module';

export interface MapModuleObservables extends ModuleObservables {
  [key: string]: SubscriptionLike | unknown;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MapModuleState extends ModuleState {}

export default abstract class MapModule<
  State extends MapModuleState = MapModuleState,
  Observables extends MapModuleObservables = MapModuleObservables
> extends Module<State, Observables> {
  constructor(
    public map: Map,
    debug?: boolean
  ) {
    super({} as State, debug);
  }

  override destroy() {
    this.map.destroy();
    super.destroy();
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
}
