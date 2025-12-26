import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import type { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { Observable, ReplaySubject, fromEvent } from 'rxjs';
import type { Vector2, Object3D } from 'three';
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

interface Passes {
  render: RenderPass;
  output: OutputPass;
}

export enum ShadowQuality {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  OFF = 'off'
}

export type AnimationLoopValue = {
  time: number;
  delta: number;
};
export type AnimationLoopSubject = ReplaySubject<AnimationLoopValue>;

export default class Renderer<
  Modules extends RendererModules = RendererModules
> {
  observables: {
    shadowQuality$: ReplaySubject<ShadowQuality>;
    animationLoop$: AnimationLoopSubject;
    pointerDown$: Observable<PointerEvent>;
    pointerMove$: Observable<PointerEvent>;
    pointerUp$: Observable<PointerEvent>;
    rotation$: ReplaySubject<number>;
    controlsChange$: Observable<Event>;
  };
  shadowQuality: ShadowQuality = ShadowQuality.LOW;

  clock = new Clock();
  private renderer?: WebGLRenderer;
  scene!: Scene;
  private composer?: EffectComposer;
  dimension: Vector2;

  pixelated: boolean;

  modules: Modules;
  private passes!: Passes;

  private _debug: boolean;
  private canvas: HTMLCanvasElement;

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

    const renderer = this.setupRenderer(canvas, { pixelated: this.pixelated });

    //#region Modules
    await Promise.all(
      Object.values(this.modules).map(module => module.setup())
    );
    //#endregion

    this.setupScene();
    this.setupComposer();

    this.setShadowQuality(ShadowQuality.MEDIUM);

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
    this.shadowQuality = quality;
    this.observables.shadowQuality$.next(quality);
  }

  destroy() {
    this.observables.animationLoop$.complete();
    Object.values(this.modules).forEach(handler => handler.destroy());
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

  setupScene(color: Color = new Color(0x000000)) {
    const scene = new Scene();
    scene.background = color;
    scene.fog = new Fog(color, 30, 30.001);

    const cam = this.modules.camera.getCamera();
    cam.far = 30;
    cam.updateProjectionMatrix();
    this.scene = scene;
  }

  setupRenderer(
    canvas: HTMLCanvasElement,
    options: { pixelated?: boolean } = {}
  ) {
    const { dimension } = this;

    const renderer = new WebGLRenderer({
      canvas,
      antialias: false
      // powerPreference: 'low-power'
    });

    this.renderer = renderer;

    renderer.shadowMap.autoUpdate = true;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    if (options.pixelated) {
      renderer.setPixelRatio(480 / window.innerWidth);
    }
    renderer.setSize(dimension.x, dimension.y);
    //#endregion

    return renderer;
  }

  getRenderer() {
    if (!this.renderer) {
      throw new Error('Renderer not initialized');
    }
    return this.renderer;
  }

  getComposer() {
    if (!this.composer) {
      throw new Error('Composer not initialized');
    }
    return this.composer;
  }

  setupComposer(dimension: Vector2 = this.dimension) {
    const composer = new EffectComposer(this.getRenderer());
    this.composer = composer;

    const passes: Partial<Passes> = {};

    const renderPass = new RenderPass(
      this.scene,
      this.modules.camera.getCamera()
    );
    composer.addPass(renderPass);

    this.passes = passes as Passes;

    this.composer.setSize(dimension.x, dimension.y);
  }

  get debug() {
    return this._debug;
  }

  get el() {
    return this.getRenderer().domElement;
  }
}
