import { EMPTY, map, merge, ReplaySubject, switchMap } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type Unit from '../Unit';
import type BaseApp from '../BaseApp';

interface Observables extends AppModuleObservables {
  followedUnit$: ReplaySubject<Unit | null>;
  focus$: ReplaySubject<Unit>;
}

interface State extends AppModuleState {
  followedUnit: Unit | null;
}
export default class UnitFocusAppModule extends AppModule<State, Observables> {
  static override TYPE = 'unitFocus';
  constructor(app: BaseApp) {
    super(app, {
      followedUnit: null
    });

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
        .subscribe(unit => {
          this.app.renderer.modules.camera.updateCamera({
            position: unit.getPosition().clone(),
            quaternion: unit.root.quaternion.clone(),
            view: 'back',
            lerpFactor: 1
          });
          // this.app.renderer.modules.camera.updateCamera({
          //   position: unit.getPosition().clone(),
          //   quaternion: unit.root.quaternion.clone(),
          //   view: 'back'
          // });
        })
    );
  }

  isFollowed(unit: Unit) {
    return this.state.followedUnit?.id === unit.id;
  }

  followFocus(unit: Unit) {
    this.state.followedUnit = unit;
    this.setCameraFocusClamp(true);
    this.observables.followedUnit$.next(unit);
    this.focus(unit);
  }

  focus(unit: Unit) {
    this.observables.focus$.next(unit);
    this.app.renderer.modules.camera.updateCamera({
      position: unit.getPosition().clone(),
      quaternion: unit.root.quaternion.clone(),
      lerpFactor: 1,
      view: 'back'
    });
  }

  unfocus() {
    this.state.followedUnit = null;
    this.setCameraFocusClamp(false);
    this.observables.followedUnit$.next(null);
  }

  setCameraFocusClamp(value: boolean) {
    const { controls } = this.app.renderer.modules.controls;
    if (!controls) return;

    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    if (value) {
      controls.minPolarAngle = Math.PI / 3;
      controls.maxPolarAngle = Math.PI / 3;
    } else {
      controls.minPolarAngle = 0;
      controls.maxPolarAngle = Math.PI / 2;
    }
  }
}
