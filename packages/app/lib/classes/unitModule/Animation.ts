import {
  AnimationMixer,
  type Object3D,
  AnimationClip,
  type AnimationAction,
  type AnimationActionLoopStyles
} from 'three';
import type { Subject } from 'rxjs';
import { ReplaySubject } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleSetupContext,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';

export interface AnimationSetting {
  clampWhenFinished?: boolean;
  loop: AnimationActionLoopStyles;
  duration: number;
}

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

  override destroy() {
    this.mixer?.stopAllAction();
    super.destroy();
  }

  override renderUpdate({ delta }: AnimationLoopValue) {
    this.mixer?.update(delta);
  }

  runningAnimations = new Map<
    string,
    {
      action: AnimationAction;
      resolve: (value: AnimationAction) => void;
    }
  >();

  private setupMixer(object: Object3D) {
    this.mixer = new AnimationMixer(object);

    // Setze isAnimating zurück, wenn Action endet
    this.mixer.addEventListener('finished', event => {
      const runningAnimation = this.runningAnimations.get(
        event.action.getClip().name
      );
      if (!runningAnimation) {
        console.warn(
          'Animation finished but not tracked:',
          event.action.getClip().name
        );
        return;
      }
      const { action, resolve } = runningAnimation;
      if (event.action === action) {
        this.activeActionsCount--;

        if (this.activeActionsCount === 0) {
          this.isAnimating = false;
        }
        resolve(event.action);
      }
    });
  }

  override async setupMesh(context: UnitModuleSetupContext) {
    this.setupMixer(context.mesh);

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

  getCurrentAction() {
    return this.action;
  }

  override isForceUpdate() {
    return this.isAnimating;
  }

  applySettings(settings: Record<string, AnimationSetting>) {
    Object.entries(settings).forEach(
      ([name, { clampWhenFinished, loop, duration }]) => {
        const action = this.getAction(name);
        if (action) {
          action.clampWhenFinished = clampWhenFinished ?? false;
          action.setLoop(loop, Infinity);
          action.setDuration(duration);
        }
      }
    );
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
    const { promise, resolve } = Promise.withResolvers<AnimationAction>();
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

    // Tracking starten
    this.activeActionsCount++;
    this.isAnimating = true;

    this.observables.action$.next({
      current: name,
      previous: from ?? null
    });

    this.runningAnimations.set(name, { action: next, resolve });

    next.play();

    return promise;
  }
  stopAction(name: string) {
    const action = this.actions[name];
    if (!action) return;

    action.stop();
  }

  stopActions() {
    this.runningAnimations.forEach(({ action }) => action.stop());
    this.runningAnimations.clear();
  }
}
