import {
  combineLatest,
  EMPTY,
  filter,
  map,
  merge,
  ReplaySubject,
  Subject,
  switchMap
} from 'rxjs';
import type { Units } from '@blue-might/units';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type Unit from '../Unit';
import type BaseApp from '../BaseApp';
import { CAMERA_VIEW } from '../rendererModule/Camera';

interface Observables extends AppModuleObservables {
  type$: ReplaySubject<FOLLOW_TYPE | null>;
  followedUnit$: ReplaySubject<Units | null>;
  focusedUnit$: ReplaySubject<Units | null>;
  focus$: Subject<Units>;
}

export enum FOLLOW_TYPE {
  PLAYER,
  UNIT
}

interface State extends AppModuleState {
  type: FOLLOW_TYPE | null;
  focusedUnit: Units | null;
  followedUnit: Units | null;
}
export default class UnitFocusAppModule extends AppModule<State, Observables> {
  static override TYPE = 'unitFocus';
  constructor(app: BaseApp) {
    super(app, {
      type: null,
      focusedUnit: null,
      followedUnit: null
    });

    //#region observables
    this.observables.type$ = new ReplaySubject<FOLLOW_TYPE | null>(1);
    this.observables.focus$ = new Subject<Units>();
    this.observables.focusedUnit$ = new ReplaySubject<Units | null>(1);
    this.observables.followedUnit$ = new ReplaySubject<Units | null>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();

    if ('player' in this.app.modules) {
      this.subscription.add(
        this.app.modules.player.observables.currentPlayer$
          .pipe(
            switchMap(player =>
              player ? player.modules.vehicle.observables.currentUnit$ : EMPTY
            ),
            switchMap(unit =>
              unit ? unit.observables.visible$.pipe(map(() => unit)) : EMPTY
            ),
            filter(Boolean)
          )
          .subscribe(unit => {
            this.app.renderer.modules.camera.setViewByUnit(unit);
          })
      );
    }

    this.subscription.add(
      this.app.renderer.modules.camera.observables.view$.subscribe(view => {
        if (view === CAMERA_VIEW.FREE) {
          this.abort();
        } else {
          this.focusPlayer();
        }
      })
    );
    this.subscription.add(
      combineLatest([
        this.observables.followedUnit$,
        this.app.renderer.modules.camera.observables.view$
      ])
        .pipe(
          filter(([, view]) => view !== CAMERA_VIEW.FREE),
          switchMap(([unit, view]) => {
            if (!unit) return EMPTY;
            return merge(
              unit.observables.position$,
              unit.observables.rotation$
            ).pipe(map(() => ({ unit: unit as Units, view })));
          })
        )
        .subscribe(({ unit, view }) => {
          const position = unit.getPosition();

          this.app.renderer.modules.camera.updateCamera({
            position,
            quaternion: unit.root.quaternion,
            view: view as Extract<keyof typeof CAMERA_VIEW, CAMERA_VIEW.FREE>,
            lerpFactor: 1
          });
        })
    );
  }

  isFollowed(unit: Unit) {
    return this.state.followedUnit?.id === unit.id;
  }

  abort() {
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
    this.state.focusedUnit = unit;
    this.observables.focus$.next(unit);
    this.app.renderer.modules.camera.updateCamera({
      position: unit.getPosition().clone(),
      quaternion: unit.root.quaternion.clone(),
      lerpFactor: 1
    });
  }

  unfocus() {
    this.state.focusedUnit = null;
    this.state.followedUnit = null;
    this.setCameraFocusClamp(false);
    this.observables.focusedUnit$.next(null);
    this.observables.followedUnit$.next(null);
  }

  private getCurrentUnit() {
    if (
      'player' in this.app.modules &&
      this.app.modules.player.hasCurrentPlayer()
    ) {
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
    const { orbitControls: controls } = this.app.renderer.modules.controls;
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
