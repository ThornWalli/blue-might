import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import type { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';

import { Observable, ReplaySubject, fromEvent } from 'rxjs';
import type { Quaternion, Vector2, Object3D } from 'three';
import {
  Clock,
  SRGBColorSpace,
  Vector3,
  BasicShadowMap,
  PCFShadowMap,
  NeutralToneMapping,
  PerspectiveCamera,
  Color,
  OrthographicCamera,
  PCFSoftShadowMap,
  Scene,
  WebGLRenderer
} from 'three';

import IntersectionRendererModule from './rendererModule/Intersection';
import DebugRendererModule from './rendererModule/Debug';
import type { HasEventTargetAddRemove } from 'rxjs/internal/observable/fromEvent';

export type RendererModuleList = (
  | typeof DebugRendererModule
  | typeof IntersectionRendererModule
)[];

interface RendererModules {
  debug: DebugRendererModule;
  intersection: IntersectionRendererModule;
}

interface Passes {
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
    controls$: ReplaySubject<{
      pen: boolean;
      zoom: boolean;
      rotate: boolean;
    }>;
    rotation$: ReplaySubject<number>;
    controlsChange$: Observable<Event>;
  };
  shadowQuality: ShadowQuality = ShadowQuality.LOW;

  clock = new Clock();
  renderer: WebGLRenderer;
  scene!: Scene;
  camera!: PerspectiveCamera;
  controls!: OrbitControls;
  composer!: EffectComposer;
  dimension: Vector2;

  pixelated: boolean;

  modules: Modules;
  private passes!: Passes;

  private _debug: boolean;

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
    modules.push(IntersectionRendererModule);

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
      controls$: new ReplaySubject<{
        pen: boolean;
        zoom: boolean;
        rotate: boolean;
      }>(1),
      rotation$: new ReplaySubject<number>(1),
      controlsChange$: new Observable<Event>()
    };

    this.dimension = dimension;
    this._debug = options.debug ?? false;

    this.setupScene();
    this.setupCamera();

    canvas.width = dimension.x;
    canvas.height = dimension.y;

    this.pixelated = options.pixelated ?? false;
    const renderer = new WebGLRenderer({
      canvas,
      antialias: options.pixelated ? false : true
    });

    this.renderer = renderer;

    this.setupRenderer();
    this.setupComposer();

    this.setShadowQuality(ShadowQuality.MEDIUM);

    if (options.controls) {
      this.setupControls();
      this.observables.controlsChange$ = fromEvent<Event>(
        this.controls as HasEventTargetAddRemove<Event>,
        'change'
      );
    }

    //#region Modules
    const preparedModules = modules.map(ModuleClass => {
      const moduleInstance = new ModuleClass(this);
      return [ModuleClass.TYPE, moduleInstance];
    });
    this.modules = Object.fromEntries(preparedModules);
    Object.values(this.modules).forEach(module => module.setup());
    //#endregion

    let lastTime = 0;
    renderer.setAnimationLoop(time => {
      const delta = time - lastTime;
      lastTime = time;
      this.observables.animationLoop$.next({
        time,
        delta: this.clock.getDelta()
      });

      if (this.controls?.enableDamping) {
        this.controls.update();
      }

      this.composer.render(time);

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
    this.renderer.shadowMap.enabled = true;

    switch (quality) {
      case ShadowQuality.HIGH:
        this.renderer.shadowMap.type = PCFSoftShadowMap;
        break;
      case ShadowQuality.MEDIUM:
        this.renderer.shadowMap.type = PCFShadowMap;
        break;
      case ShadowQuality.LOW:
        this.renderer.shadowMap.type = BasicShadowMap;
        break;
      case ShadowQuality.OFF:
        this.renderer.shadowMap.enabled = false;
        break;
    }

    this.renderer.shadowMap.needsUpdate = true;
    this.shadowQuality = quality;
    this.observables.shadowQuality$.next(quality);
  }

  destroy() {
    this.observables.animationLoop$.complete();
    Object.values(this.modules).forEach(handler => handler.destroy());
    this.renderer.dispose();
    this.composer.dispose();
    this.scene.clear();
    this.scene.remove();
  }

  resize(dimension: Vector2) {
    this.dimension = dimension;

    const camera = this.camera;
    if (camera instanceof OrthographicCamera) {
      camera.left = -this.cameraZoom * this.aspectRatio;
      camera.right = this.cameraZoom * this.aspectRatio;
      camera.top = this.cameraZoom;
      camera.bottom = -this.cameraZoom;
      camera.updateProjectionMatrix();
    }

    this.renderer.setSize(dimension.x, dimension.y);

    this.controls?.update();
  }

  getControlsOptions() {
    return {
      pan: this.controls.enablePan,
      zoom: this.controls.enableZoom,
      rotate: this.controls.enableRotate
    };
  }

  setControlsOptions({
    pan = true,
    zoom = true,
    rotate = true
  }: {
    pan?: boolean;
    zoom?: boolean;
    rotate?: boolean;
  }) {
    this.controls.enablePan = pan;
    this.controls.enableZoom = zoom;
    this.controls.enableRotate = rotate;
    this.observables.controls$.next({
      pen: this.controls.enablePan,
      zoom: this.controls.enableZoom,
      rotate: this.controls.enableRotate
    });
  }

  enableControls() {
    this.setControlsOptions({
      pan: true,
      zoom: true,
      rotate: true
    });
  }
  disableControls() {
    this.setControlsOptions({
      pan: true,
      zoom: true,
      rotate: false
    });
  }

  get aspectRatio() {
    return this.dimension.x / this.dimension.y;
  }

  addToScene(root: Object3D) {
    this.scene.add(root);
  }

  //#region inits

  setupScene(color: Color = new Color(0x000000)) {
    const scene = new Scene();
    scene.background = color;
    this.scene = scene;
  }

  setupControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    this.controls.dampingFactor = 0.05; // kleiner Wert = smoother
    this.controls.zoomSpeed = 1.0;
    this.controls.zoomSpeed = 1.0;
    this.controls.panSpeed = 1.0;

    // WICHTIG: Target setzen (Mittelpunkt der Szene)
    this.controls.target.set(0, 0, 0);

    // Zoom-Limits um Near-Plane-Clipping zu verhindern
    this.controls.minDistance = 5;
    this.controls.maxDistance = 200;

    // Enable damping für smoothere Bewegung
    // this.controls.enableDamping = true;

    this.enableControls();
    this.controls.update();
  }

  setupRenderer() {
    const { renderer, dimension } = this;
    renderer.shadowMap.autoUpdate = true;
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    // renderer.setPixelRatio(480 / window.innerWidth);
    // renderer.setPixelRatio(1 / 3);
    // renderer.setPixelRatio(window.devicePixelRatio); // window.devicePixelRatio
    renderer.setSize(dimension.x, dimension.y);
    //#endregion
  }

  setupComposer(dimension: Vector2 = this.dimension) {
    const composer = new EffectComposer(this.renderer);
    this.composer = composer;

    const passes: Partial<Passes> = {};

    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    this.passes = passes as Passes;

    this.composer.setSize(dimension.x, dimension.y);
  }

  setupCamera() {
    const camera = new PerspectiveCamera(
      60, // FOV reduziert von 75 auf 60 für bessere Sicht auf Details
      this.dimension.x / this.dimension.y,
      0.1, // near plane näher für kleine Objekte
      2000 // far plane
    );

    this.camera = camera;
    this.updateCamera();
  }

  updateCamera(options?: { position: Vector3; quaternion: Quaternion }) {
    this.camera.zoom = (this.controls?.object as PerspectiveCamera)?.zoom || 1;

    if (options) {
      const { position, quaternion } = options;
      // console.log('updateZoom', position, quaternion);
      const cameraOffset = new Vector3(0, 5, -5);
      const lerpFactor = 0.1;
      const idealPosition = position
        .clone()
        .add(cameraOffset.clone().applyQuaternion(quaternion));

      this.camera.position.lerp(idealPosition, lerpFactor);
      this.camera.lookAt(position);

      if (this.controls) {
        this.controls.target.copy(position);
        this.controls.update();
      }
    } else {
      this.camera.position.set(30, 30, 30);
      this.camera.lookAt(0, 0, 0); // Explizit auf Zentrum schauen

      if (this.controls) {
        this.controls.target.set(0, 0, 0); // Target der Controls setzen
        this.controls.update();
      }
    }
  }

  setCameraClamp(value: boolean) {
    if (value) {
      this.controls.enableRotate = false; // Kein Drehen
      this.controls.enablePan = true; // Nur bewegen
      this.controls.enableZoom = true; // Zoom mit Mausrad
    } else {
      this.controls.enableRotate = true; // Kein Drehen
      this.controls.enablePan = true; // Nur bewegen
      this.controls.enableZoom = true; // Zoom mit Mausrad
    }
  }

  get cameraZoom() {
    // return 1 * 48 * (512 / window.innerWidth);
    return 1;
  }
  get debug() {
    return this._debug;
  }

  get el() {
    return this.renderer.domElement;
  }
}
