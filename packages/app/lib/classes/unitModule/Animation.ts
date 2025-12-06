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
  action$: ReplaySubject<string | null>;
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
    this.observables.action$ = new ReplaySubject<string | null>(1);
    this.observables.action$.next(this.action);
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

  setAnimationAction(type: string, duration = 0.2) {
    if (!this.mixer) {
      console.warn('Animation mixer not initialized yet');
      return;
    }
    if (this.action === type) return;
    this.action = type;
    this.fadeToAction(this.mixer ? this.actions : {}, type, duration);
    this.observables.action$.next(type);
  }

  override update({ delta }: AnimationLoopValue) {
    this.mixer?.update(delta);
  }

  activeAction: AnimationAction | null = null;
  fadeToAction(actions: Actions, name: string, duration = 0.5) {
    const next = actions[name];
    if (!next || next === this.activeAction) return;

    if (this.activeAction) {
      this.activeAction.fadeOut(duration);
    }

    next.reset().fadeIn(duration).play();
    this.activeAction = next;
  }
}
