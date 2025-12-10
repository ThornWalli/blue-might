import { AnimationClip, type AnimationAction } from 'three';
import { AnimationMixer, Object3D } from 'three';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleSetupContext,
  type UnitModuleState
} from '../UnitModule';
import { OBJECT_NAME } from '../../utils/object';
import type { Subject } from 'rxjs';
import { ReplaySubject } from 'rxjs';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';

type Actions = { [key: string]: AnimationAction };

interface Observables extends UnitModuleObservables {
  action$: ReplaySubject<{
    current: string | null;
    previous: string | null;
  }>;
  addAction$: Subject<AnimationAction>;
}

type Options = UnitModuleOptions;

type State = UnitModuleState;

export class AnimationUnitModule extends UnitModule<
  Options,
  State,
  Observables
> {
  static override TYPE = 'animation';

  mixer!: AnimationMixer;
  actions: Actions = {};
  animations: AnimationClip[] = [];
  private action: string | null;

  getCurrentAction() {
    return this.action;
  }

  constructor(unit: Unit, options: Options, state: State, debug: boolean) {
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

  override destroy(): void {
    super.destroy();
    this.mixer?.stopAllAction();
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

  override update({ delta }: AnimationLoopValue) {
    this.mixer?.update(delta);
  }

  // playAction(name: string, { from }: { from?: string } = {}) {
  //   const next = this.actions[name];
  //   if (!next) return;
  //   const current = from && this.actions[from];

  //   if (from && current) {
  //     // Zeitwert übernehmen
  //     const currentTime = current.time;
  //     current.fadeOut(0.5);
  //     // Kein reset, damit die Zeit nicht auf 0 springt!
  //     next.enabled = true;
  //     next.time = currentTime % next.getClip().duration;
  //     next.fadeIn(0.5).play();
  //   } else {
  //     next.enabled = true;
  //     next.play();
  //   }

  //   this.observables.action$.next({
  //     current: name,
  //     previous: from ?? null
  //   });
  // }

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
    console.log('Play action:', name, from, duration, reverse);
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

    this.observables.action$.next({
      current: name,
      previous: from ?? null
    });
  }

  // playAction(
  //   name: string,
  //   {
  //     reverse,
  //     from,
  //     duration
  //   }: {
  //     reverse?: boolean;
  //     from?: string;
  //     duration?: number;
  //   } = {}
  // ) {
  //   console.log('Play action:', name, from, duration);
  //   const next = this.actions[name];
  //   if (!next) return;
  //   const current = from && this.actions[from];

  //   next.reset();
  //   if (reverse) {
  //     next.timeScale = next.timeScale * -1;
  //   }
  //   if (from && current) {
  //     next.crossFadeFrom(current, duration ?? 0, true);
  //   }
  //   next.play();
  //   this.observables.action$.next({
  //     current: name,
  //     previous: from ?? null
  //   });
  // }

  // playActionFadeTo(
  //   name: string,
  //   options: {
  //     fadeInDuration?: number;
  //     fadeOutDuration?: number;
  //   } = {}
  // ) {
  //   const next = this.actions[name];
  //   if (!next || next === this.activeAction) return;

  //   let currentTime = 0;
  //   if (this.activeAction) {
  //     currentTime = this.activeAction.time;
  //     this.activeAction.fadeOut(options.fadeOutDuration ?? 0);
  //   }

  //   next.reset();
  //   next.time = currentTime % next.getClip().duration; // Zeit nach reset setzen!
  //   next.fadeIn(options.fadeInDuration ?? 0).play();
  //   this.activeAction = next;
  // }
}
