import { EMPTY, map, merge, ReplaySubject, switchMap } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type Unit from '../Unit';
import type BaseApp from '../BaseApp';

interface Observables extends AppModuleObservables {
  type$: ReplaySubject<FOLLOW_TYPE | null>;
  followedUnit$: ReplaySubject<Unit | null>;
  focus$: ReplaySubject<Unit>;
}

export enum FOLLOW_TYPE {
  PLAYER,
  UNIT
}

interface State extends AppModuleState {
  type: FOLLOW_TYPE | null;
  followedUnit: Unit | null;
}
export default class UnitFocusAppModule extends AppModule<State, Observables> {
  static override TYPE = 'unitFocus';
  constructor(app: BaseApp) {
    super(app, {
      type: null,
      followedUnit: null
    });

    //#region observables
    this.observables.type$ = new ReplaySubject<FOLLOW_TYPE | null>(1);
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

  abort() {
    this.state.type = null;
    this.state.followedUnit = null;
    this.setCameraFocusClamp(false);
    this.observables.type$.next(null);
    this.observables.followedUnit$.next(null);
  }

  followPlayer() {
    this.state.type = FOLLOW_TYPE.PLAYER;
    const unit = this.getCurrentUnit();
    if (unit) {
      this.followFocus(unit);
    }
  }

  followUnit(unit: Unit) {
    this.state.type = FOLLOW_TYPE.UNIT;
    this.followFocus(unit);
  }
  focusPlayer() {
    const unit = this.getCurrentUnit();
    if (unit) {
      this.followFocus(unit);
    }
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

  private getCurrentUnit() {
    if ('player' in this.app.modules) {
      return this.app.modules.player
        .getCurrentPlayer()
        .modules.vehicle.getCurrentUnit();
    }
    return null;
  }

  private followFocus(unit: Unit) {
    this.state.followedUnit = unit;
    this.setCameraFocusClamp(true);
    this.observables.followedUnit$.next(unit);
    this.focus(unit);
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
