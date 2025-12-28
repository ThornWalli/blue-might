import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { fromEvent, Observable, ReplaySubject, Subscription } from 'rxjs';
import type { PerspectiveCamera, Vector2, Object3D, Camera } from 'three';
import {
  WebGLRenderer,
  Clock,
  SRGBColorSpace,
  BasicShadowMap,
  PCFShadowMap,
  NeutralToneMapping,
  Color,
  PCFSoftShadowMap,
  Scene,
  Fog
} from 'three';

import IntersectionRendererModule from './rendererModule/Intersection';
import DebugRendererModule from './rendererModule/Debug';
import CameraRendererModule from './rendererModule/Camera';
import ControlsRendererModule from './rendererModule/Controls';

import '../utils/raycast';

export type RendererModuleList = (
  | typeof CameraRendererModule
  | typeof ControlsRendererModule
  | typeof DebugRendererModule
  | typeof IntersectionRendererModule
)[];

export interface RendererModules {
  camera: CameraRendererModule;
  controls: ControlsRendererModule;
  debug: DebugRendererModule;
  intersection: IntersectionRendererModule;
}

export enum ShadowQuality {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  OFF = 'off'
}

export const DEFAULT_SHADOW_QUALITY = ShadowQuality.LOW;

export type AnimationLoopValue = {
  time: number;
  delta: number;
};
export type AnimationLoopSubject = ReplaySubject<AnimationLoopValue>;

export default class Renderer<
  Modules extends RendererModules = RendererModules
> {
  //#region Modules
  observables: {
    shadowQuality$: ReplaySubject<ShadowQuality>;
    animationLoop$: AnimationLoopSubject;
    pointerDown$: Observable<PointerEvent>;
    pointerMove$: Observable<PointerEvent>;
    pointerUp$: Observable<PointerEvent>;
    rotation$: ReplaySubject<number>;
    controlsChange$: Observable<Event>;
  };
  shadowQuality: ShadowQuality = DEFAULT_SHADOW_QUALITY;

  clock = new Clock();
  private renderer?: WebGLRenderer;
  scene!: Scene;
  private composer?: EffectComposer;
  private dimension: Vector2;

  private pixelated: boolean;

  modules: Modules;

  private _debug: boolean;
  private canvas: HTMLCanvasElement;

  private subscription = new Subscription();
  private renderPassByCamera = new Map<Camera, RenderPass>();

  constructor(
    canvas: HTMLCanvasElement,
    dimension: Vector2,
    options: {
      pixelated?: boolean;
      controls?: boolean;
      debug?: boolean;
    } = {},
    modules: RendererModuleList = []
  ) {
    modules.push(
      CameraRendererModule,
      ControlsRendererModule,
      IntersectionRendererModule
    );

    if (this.debug) {
      modules.push(DebugRendererModule);
    }

    this.observables = {
      shadowQuality$: new ReplaySubject<ShadowQuality>(1),
      animationLoop$: new ReplaySubject<{
        time: number;
        delta: number;
      }>(0),
      pointerDown$: fromEvent<PointerEvent>(canvas, 'pointerdown'),
      pointerMove$: fromEvent<PointerEvent>(canvas, 'pointermove'),
      pointerUp$: fromEvent<PointerEvent>(canvas, 'pointerup'),
      rotation$: new ReplaySubject<number>(1),
      controlsChange$: new Observable<Event>()
    };

    this.canvas = canvas;
    this.dimension = dimension;
    this._debug = options.debug ?? false;
    this.pixelated = options.pixelated ?? false;

    //#region Modules
    const preparedModules = modules
      .map(ModuleClass => {
        const moduleInstance = new ModuleClass(this, {});
        return ModuleClass.TYPES.map(type => [type, moduleInstance]);
      })
      .flat();
    this.modules = Object.fromEntries(preparedModules);
    //#endregion
  }

  async setup() {
    const canvas = this.canvas;
    const dimension = this.dimension;

    canvas.width = dimension.x;
    canvas.height = dimension.y;

    const renderer = createRenderer(canvas, dimension, {
      pixelated: this.pixelated
    });
    this.renderer = renderer;

    //#region Modules
    await Promise.all(
      Object.values(this.modules).map(module => module.setup())
    );
    //#endregion

    this.setupScene();

    this.composer = createComposer(
      renderer,
      this.scene,
      this.modules.camera.getCamera(),
      dimension
    );

    this.setShadowQuality(DEFAULT_SHADOW_QUALITY);

    renderer.setAnimationLoop(time => {
      const rawDelta = this.clock.getDelta();
      const delta = Math.min(rawDelta, 1 / 60);
      this.observables.animationLoop$.next({
        time,
        delta
      });

      this.getComposer().render(time);

      Object.values(this.modules)
        .filter(handler => 'update' in handler)
        .forEach(handler => {
          handler.update({
            time,
            delta
          });
        });
    });
  }

  setShadowQuality(quality: ShadowQuality) {
    const renderer = this.getRenderer();

    setRendererShadow(renderer, quality);

    this.shadowQuality = quality;
    this.observables.shadowQuality$.next(quality);
  }

  destroy() {
    this.subscription.unsubscribe();
    this.observables.animationLoop$.complete();
    Object.values(this.modules).forEach(module => module.destroy());
    this.renderer?.setAnimationLoop(null);
    this.renderer?.dispose();
    this.composer?.dispose();
    this.scene.clear();
    this.scene.remove();
  }

  resize(dimension: Vector2) {
    this.dimension = dimension;

    this.modules.camera.resize();

    this.renderer?.setSize(dimension.x, dimension.y);

    this.modules.controls.refresh();
  }

  addToScene(root: Object3D) {
    this.scene.add(root);
  }

  //#region inits

  setupScene(
    {
      color
    }: {
      color: Color;
      fogDistance: number;
    } = {
      color: new Color(0x000000),
      fogDistance: 30
    }
  ) {
    const scene = new Scene();

    //#region setup for fog
    scene.background = color;
    scene.fog = new Fog(color, 30, 30.001);

    const mainCamera = this.modules.camera.getCamera<PerspectiveCamera>();
    if (mainCamera) {
      mainCamera.far = 30;
      mainCamera.updateProjectionMatrix();
    } else {
      throw new Error('Main camera not found');
    }
    //#endregion

    this.scene = scene;
  }

  getRenderer() {
    if (!this.renderer) {
      throw new Error('Renderer not initialized');
    }
    return this.renderer;
  }

  getPixelated() {
    return this.pixelated;
  }

  getComposer() {
    if (!this.composer) {
      throw new Error('Composer not initialized');
    }
    return this.composer;
  }

  getDimension() {
    return this.dimension;
  }

  get debug() {
    return this._debug;
  }

  get el() {
    return this.getRenderer().domElement;
  }
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  dimension: Vector2,
  options: { pixelated?: boolean } = {}
) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: false
    // powerPreference: 'low-power'
  });

  renderer.shadowMap.autoUpdate = true;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  if (options.pixelated) {
    renderer.setPixelRatio(640 / window.innerWidth);
  }
  renderer.setSize(dimension.x, dimension.y);
  //#endregion

  return renderer;
}

export function createComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  dimension: Vector2
) {
  const composer = new EffectComposer(renderer);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  composer.setSize(dimension.x, dimension.y);
  return composer;
}

export function setRendererShadow(
  renderer: WebGLRenderer,
  quality: ShadowQuality
) {
  renderer.shadowMap.enabled = true;
  switch (quality) {
    case ShadowQuality.HIGH:
      renderer.shadowMap.type = PCFSoftShadowMap;
      break;
    case ShadowQuality.MEDIUM:
      renderer.shadowMap.type = PCFShadowMap;
      break;
    case ShadowQuality.LOW:
      renderer.shadowMap.type = BasicShadowMap;
      break;
    case ShadowQuality.OFF:
      renderer.shadowMap.enabled = false;
      break;
  }
  renderer.shadowMap.needsUpdate = true;
}
