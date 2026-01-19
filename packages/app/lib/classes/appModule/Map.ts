import { EMPTY, map as rxjsMap, ReplaySubject, switchMap } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import Map from '../Map';
import type { MapDescription } from '../Map';
import type App from '../App';

interface Observables extends AppModuleObservables {
  map$: ReplaySubject<Map>;
}

interface State extends AppModuleState {
  map: Map | null;
}
export default class MapAppModule extends AppModule<State, Observables> {
  static override TYPE = 'map';
  override state: State = {
    map: null
  };

  constructor(app: App) {
    super(app, {} as State);

    //#region observables
    this.observables.map$ = new ReplaySubject<Map>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();

    const renderer = this.app.renderer;

    this.subscription.add(
      this.observables.map$
        .pipe(
          switchMap(map =>
            map
              ? renderer.observables.animationLoop$.pipe(
                  rxjsMap(context => {
                    return { map, context };
                  })
                )
              : EMPTY
          )
        )
        .subscribe(({ map, context }) => {
          map.update(context);
        })
    );
  }

  getMap() {
    return this.state.map;
  }

  async setMap(map: Map) {
    const renderer = this.app.renderer;
    await map.setup();
    renderer.addToScene(map.root);
    this.state.map = map;
    this.observables.map$.next(map);
  }

  fromDescription(description: MapDescription) {
    return new Map(description, this.app);
  }
}
