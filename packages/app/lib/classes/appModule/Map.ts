import { ReplaySubject, Subject } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import Map from '../Map';
import type { MapDescription } from '../Map';
import type BaseApp from '../BaseApp';
import type { AnimationLoopValue } from '../Renderer';

interface Observables extends AppModuleObservables {
  map$: ReplaySubject<Map>;
  beforeRestart$: Subject<void>;
  enterMap$: Subject<Map>;
}

interface State extends AppModuleState {
  map: Map | null;
  descriptionStash: MapDescription | null;
}
export default class MapAppModule extends AppModule<State, Observables> {
  static override TYPE = 'map';
  override state: State = {
    map: null,
    descriptionStash: null
  };

  constructor(app: BaseApp) {
    super(app, {} as State);

    //#region observables
    this.observables.map$ = new ReplaySubject<Map>(1);
    this.observables.beforeRestart$ = new Subject<void>();
    this.observables.enterMap$ = new Subject<Map>();
    //#endregion
  }

  getMap() {
    return this.state.map;
  }

  async setMap(map: Map) {
    this.state.descriptionStash = null;
    const renderer = this.app.renderer;
    await map.setup();
    renderer.addToScene(map.root);
    this.state.map = map;
    this.observables.map$.next(map);

    return map;
  }

  override update(v: AnimationLoopValue): void {
    this.state.map?.update(v);
  }

  private mapDescription: MapDescription | null = null;
  async enterMap(description: MapDescription) {
    const lastMap = this.getMap();
    if (lastMap) {
      lastMap.destroy();
    }
    this.mapDescription = description;
    const newMap = this.fromDescription(description);
    const map = await this.setMap(newMap);

    console.log('Map loaded', newMap, await newMap.toDescription());

    this.observables.enterMap$.next(map);
    return map;
  }

  restartMap(mapDescription = this.mapDescription) {
    if (!mapDescription) {
      throw new Error('No map description available to restart');
    }

    this.observables.beforeRestart$.next();

    this.enterMap(mapDescription);
  }

  fromDescription(description: MapDescription) {
    return new Map(description, this.app);
  }

  hasStashedDescription() {
    return this.state.descriptionStash !== null;
  }

  async stashDescription(force?: boolean) {
    if (this.state.descriptionStash && !force) {
      console.warn('Description stash already exists');
      return;
    }
    this.state.descriptionStash =
      (await this.state.map?.toDescription()) ?? null;
  }
  async unstashDescription() {
    if (!this.state.descriptionStash) {
      console.warn('No description stash exists');
      return;
    }
    await this.enterMap(this.state.descriptionStash);
    this.state.descriptionStash = null;
  }
}
