import { AnimationClip, type AnimationAction } from 'three';
import { AnimationMixer, Object3D } from 'three';
import type { Subject } from 'rxjs';
import { ReplaySubject } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleSetupContext,
  type UnitModuleState
} from '../UnitModule';
import { OBJECT_NAME } from '../../utils/object';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';

declare module '../Unit' {
  interface ModuleStates {
    animation: Partial<AnimationUnitModuleState>;
  }
  interface ModuleOptions {
    animation: Partial<AnimationUnitModuleOptions>;
  }
  interface ModuleDebug {
    animation: boolean;
  }
}

type Actions = { [key: string]: AnimationAction };

interface Observables extends UnitModuleObservables {
  action$: ReplaySubject<{
    current: string | null;
    previous: string | null;
  }>;
  addAction$: Subject<AnimationAction>;
}

export type AnimationUnitModuleOptions = UnitModuleOptions;

export type AnimationUnitModuleState = UnitModuleState;

export class AnimationUnitModule extends UnitModule<
  AnimationUnitModuleOptions,
  AnimationUnitModuleState,
  Observables
> {
  static override TYPE = 'animation';

  private mixer!: AnimationMixer;
  private actions: Actions = {};
  private animations: AnimationClip[] = [];
  private action: string | null;
  private activeActionsCount = 0;
  public isAnimating = false;

  override isForceUpdate() {
    return this.isAnimating;
  }

  getCurrentAction() {
    return this.action;
  }

  constructor(
    unit: Unit,
    options: AnimationUnitModuleOptions,
    state: AnimationUnitModuleState,
    debug: boolean
  ) {
    super(unit, options, state, debug);

    this.action = null;

    //#region observables
    this.observables.action$ = new ReplaySubject<{
      current: string | null;
      previous: string | null;
    }>(1);
    this.observables.action$.next({
      current: this.action,
      previous: null
    });
    this.observables.addAction$ = new ReplaySubject<AnimationAction>(1);
    //#endregion
  }

  override destroy(): void {
    super.destroy();
    this.mixer?.stopAllAction();
  }

  override update({ delta }: AnimationLoopValue) {
    this.mixer?.update(delta);
  }

  override async setupMesh(context: UnitModuleSetupContext) {
    const animationWrapper = new Object3D();
    animationWrapper.name = OBJECT_NAME.MESH_ANIMATION;
    this.mixer = new AnimationMixer(context.mesh);

    this.animations.forEach(clip => {
      const tracks = clip.tracks;
      this.addAction(
        clip.name,
        this.mixer.clipAction(
          new AnimationClip(clip.name, clip.duration, tracks)
        )
      );
    });

    return context.mesh;
  }

  getMixer() {
    return this.mixer;
  }

  getAction(name: string) {
    return this.actions[name];
  }

  private addAction(name: string, action: AnimationAction) {
    this.observables.addAction$.next(action);
    this.actions[name] = action;
  }

  setAnimations(animations: AnimationClip[]) {
    this.animations = animations;
  }

  playAction(
    name: string,
    {
      reverse = false,
      from,
      duration = 0
    }: {
      reverse?: boolean;
      from?: string;
      duration?: number;
    } = {}
  ) {
    // console.log('Play action:', name, from, duration, reverse);
    const next = this.actions[name];
    if (!next) return;

    const current = from && this.actions[from];

    // Wichtig: nicht reset() benutzen beim Reverse,
    // denn reset setzt die Zeit auf 0, was falsch ist!
    next.enabled = true;
    next.reset();

    const timeScale = next.timeScale;
    if (reverse) {
      next.timeScale = -Math.abs(timeScale);
    } else {
      next.timeScale = Math.abs(timeScale);
    }

    if (reverse) {
      next.time = next.getClip().duration - 0.000001;
    } else {
      next.time = 0;
    }

    if (from && current) {
      next.crossFadeFrom(current, duration, true);
    }

    next.play();

    // Tracking starten
    this.activeActionsCount++;
    this.isAnimating = true;

    // Setze isAnimating zurück, wenn Action endet
    this.mixer.addEventListener('finished', event => {
      if (event.action === next) {
        this.activeActionsCount--;
        if (this.activeActionsCount === 0) {
          this.isAnimating = false;
        }
      }
    });

    this.observables.action$.next({
      current: name,
      previous: from ?? null
    });
  }
  stopAction(name: string) {
    const action = this.actions[name];
    if (!action) return;

    action.stop();
  }
}
