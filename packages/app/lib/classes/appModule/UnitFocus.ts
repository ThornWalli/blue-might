import { EMPTY, map, merge, ReplaySubject, switchMap } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type App from '../App';
import type Unit from '../Unit';

interface Observables extends AppModuleObservables {
  followedUnit$: ReplaySubject<Unit | null>;
  focus$: ReplaySubject<Unit>;
}

interface State extends AppModuleState {
  followedUnit: Unit | null;
}
export default class UnitFocusAppModule extends AppModule<State, Observables> {
  static override TYPE = 'unitFocus';
  override state: State = {
    followedUnit: null
  };

  constructor(app: App) {
    super(app, {} as State);

    //#region observables
    this.observables.focus$ = new ReplaySubject<Unit>(1);
    this.observables.followedUnit$ = new ReplaySubject<Unit | null>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();

    this.subscription.add(
      this.observables.followedUnit$
        .pipe(
          switchMap(unit => {
            if (!unit) return EMPTY;
            return merge(
              unit.observables.position$,
              unit.observables.rotation$
            ).pipe(map(() => unit));
          })
        )
        .subscribe(unit =>
          this.app.renderer.modules.camera.updateCamera({
            position: unit.getPosition().clone(),
            quaternion: unit.root.quaternion.clone(),
            view: 'side'
          })
        )
    );
  }

  isFollowed(unit: Unit) {
    return this.state.followedUnit?.id === unit.id;
  }

  followFocus(unit?: Unit | null) {
    unit = unit ?? null;
    this.state.followedUnit = unit;
    this.observables.followedUnit$.next(unit);
  }

  focus(unit: Unit) {
    this.observables.focus$.next(unit);
    this.app.renderer.modules.camera.updateCamera({
      position: unit.getPosition().clone(),
      quaternion: unit.root.quaternion.clone(),
      lerpFactor: 1,
      view: 'side'
    });
  }

  unfocus() {
    this.state.followedUnit = null;
    this.observables.followedUnit$.next(null);
  }
}
