import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { fromEvent, Observable, ReplaySubject, Subscription } from 'rxjs';
import type { PerspectiveCamera, Vector2, Object3D, Camera } from 'three';
import {
  WebGLRenderer,
  Timer,
  SRGBColorSpace,
  BasicShadowMap,
  PCFShadowMap,
  NeutralToneMapping,
  Color,
  PCFSoftShadowMap,
  Scene,
  FogExp2
} from 'three';
import type { RendererOptions } from '@blue-might/app/types';

import type { FogOptions } from '../types/map';

import IntersectionRendererModule from './rendererModule/Intersection';
import DebugRendererModule from './rendererModule/Debug';
import CameraRendererModule from './rendererModule/Camera';
import ControlsRendererModule from './rendererModule/Controls';

import '../utils/raycast';

const DEFAULT_SCENE_BACKGROUND = new Color(0x000000);

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
  scene?: Scene;
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

  timer = new Timer();
  private renderer?: WebGLRenderer;
  scene!: Scene;
  private composer?: EffectComposer;
  private dimension: Vector2;

  modules: Modules;

  private options: {
    fog: FogOptions;
    pixelated: boolean;
    controls: boolean;
    debug: boolean;
  };
  private canvas: HTMLCanvasElement;

  private subscription = new Subscription();
  private renderPassByCamera = new Map<Camera, RenderPass>();

  constructor(
    canvas: HTMLCanvasElement,
    dimension: Vector2,
    options: {
      fog?: Partial<FogOptions> & { enabled: boolean };
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

    this.options = {
      fog: {
        enabled: false,
        color: new Color(0x000000),
        fogDistance: 30,
        ...(options.fog ?? {})
      },
      pixelated: options.pixelated ?? false,
      controls: options.controls ?? false,
      debug: options.debug ?? false
    };

    if (this.debug) {
      modules.push(DebugRendererModule);
    }

    this.observables = {
      shadowQuality$: new ReplaySubject<ShadowQuality>(1),
      animationLoop$: new ReplaySubject<AnimationLoopValue>(0),
      pointerDown$: fromEvent<PointerEvent>(canvas, 'pointerdown'),
      pointerMove$: fromEvent<PointerEvent>(canvas, 'pointermove'),
      pointerUp$: fromEvent<PointerEvent>(canvas, 'pointerup'),
      rotation$: new ReplaySubject<number>(1),
      controlsChange$: new Observable<Event>()
    };

    this.canvas = canvas;
    this.dimension = dimension;

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

    const renderer = createRenderer(canvas, dimension);
    this.renderer = renderer;

    this.setupScene();

    //#region Modules
    await Promise.all(
      Object.values(this.modules).map(module => module.setup())
    );
    //#endregion

    this.setOptions(this.options);

    this.composer = createComposer(
      renderer,
      this.scene,
      this.modules.camera.getCamera(),
      dimension
    );

    this.setShadowQuality(DEFAULT_SHADOW_QUALITY);

    this.timer.connect(document);

    renderer.setAnimationLoop(time => {
      this.timer.update(time);
      const rawDelta = this.timer.getDelta();

      const delta = Math.min(rawDelta, 1 / 60);
      this.observables.animationLoop$.next({
        time,
        delta,
        scene: this.scene
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
    this.timer.disconnect();
    this.timer.dispose();
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
    } = {
      color: new Color(0x000000)
    }
  ) {
    const scene = new Scene();
    this.scene = scene;
    scene.background = color;
  }

  getRenderer() {
    if (!this.renderer) {
      throw new Error('Renderer not initialized');
    }
    return this.renderer;
  }

  setFogOptions(options: Partial<FogOptions> & { enabled: boolean }) {
    const { enabled, color, fogDistance } = {
      enabled: options.enabled,
      color: options.color ?? new Color(0x000000),
      fogDistance: options.fogDistance ?? 30
    };
    const scene = this.scene;
    if (enabled) {
      scene.background = color;
      // Verwenden Sie FogExp2 für einen natürlicheren Fog-Effekt
      // Dichte basierend auf fogDistance berechnen (höherer Wert = dichter Fog)
      const density = 1 / fogDistance; // Anpassen, wenn nötig (z.B. 0.5 / fogDistance für weniger dichten Fog)
      scene.fog = new FogExp2(color, density);

      const mainCamera = this.modules.camera.getCamera<PerspectiveCamera>();
      if (mainCamera) {
        // Erhöhen Sie far, um die Sichtweite zu erweitern (z.B. 2x fogDistance)
        mainCamera.far = fogDistance * 2;
        mainCamera.updateProjectionMatrix();
      } else {
        throw new Error('Main camera not found');
      }
    } else {
      scene.background = DEFAULT_SCENE_BACKGROUND;
      scene.fog = null;
    }
    this.options.fog = {
      enabled,
      color,
      fogDistance
    };
  }

  getPixelated() {
    return this.options.pixelated;
  }

  setPixelated(value: boolean) {
    this.renderer?.setPixelRatio(
      value
        ? window.innerWidth / window.devicePixelRatio / window.innerWidth
        : 1
    );
    this.options.pixelated = value;
  }

  setOptions(options: Partial<RendererOptions>) {
    if ('fog' in options) {
      this.setFogOptions(options.fog ?? { enabled: false });
    }
    if ('pixelated' in options) {
      this.setPixelated(options.pixelated ?? false);
    }
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
    return this.options.debug;
  }

  get el() {
    return this.getRenderer().domElement;
  }
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  dimension: Vector2,
  options: Pick<RendererOptions, 'pixelated'> = { pixelated: false }
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
  renderer.setSize(dimension.x, dimension.y);

  if (options.pixelated) {
    renderer.setPixelRatio(getPixelRationBase() / window.innerWidth);
  }
  //#endregion

  return renderer;
}

function getPixelRationBase() {
  return window.devicePixelRatio > 1 ? 640 : 320;
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
