import type { Camera, Quaternion } from 'three';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { ReplaySubject, Subject } from 'rxjs';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import type Renderer from '../Renderer';
import RendererModule, {
  type RendererModuleObservables,
  type RendererModuleState
} from '../RendererModule';
import type Unit from '../Unit';

export enum CAMERA_VIEW {
  FREE = 'free',
  BACK = 'back',
  BACK_NEAR = 'back_near',
  SIDE = 'side',
  BIRD = 'bird'
}

export enum CameraType {
  MAIN = 'main',
  SECONDARY = 'secondary'
}

export interface Observables extends RendererModuleObservables {
  addCamera$: Subject<Camera>;
  removeCamera$: Subject<Camera>;
  view$: ReplaySubject<CAMERA_VIEW>;
}

export interface State extends RendererModuleState {
  view: CAMERA_VIEW;
}

export default class CameraRendererModule extends RendererModule<
  State,
  Observables
> {
  getCameras() {
    return Array.from(this.cameras.values());
  }
  static override TYPE = 'camera';

  private cameras: Map<string, Camera> = new Map(); // Map mit Camera als Wert

  constructor(renderer: Renderer, state: Partial<State>) {
    super(renderer, {
      ...state,
      view: state.view ?? CAMERA_VIEW.BACK
    });

    //#region observables
    this.observables.addCamera$ = new Subject<Camera>();
    this.observables.removeCamera$ = new Subject<Camera>();
    this.observables.view$ = new ReplaySubject<CAMERA_VIEW>();
    this.observables.view$.next(this.state.view);
    //#endregion
  }

  getCamera<C extends Camera = Camera>(type: CameraType = CameraType.MAIN) {
    return this.cameras.get(type) as C;
  }

  override async setup() {
    const dimension = this.renderer.getDimension();
    const camera = new PerspectiveCamera(
      60, // FOV reduziert von 75 auf 60 für bessere Sicht auf Details
      dimension.x / dimension.y,
      0.1, // near plane näher für kleine Objekte
      2000 // far plane
    );

    this.addCamera(CameraType.MAIN, camera);
    this.updateCamera();
  }

  updateCamera(options?: {
    position: Vector3;
    quaternion?: Quaternion;
    lerpFactor?: number;
    view?: Exclude<CAMERA_VIEW, CAMERA_VIEW.FREE>;
  }) {
    console.log('Updating camera with options:', options);
    const { orbitControls } = this.renderer.modules.controls;

    const camera = this.getCamera<PerspectiveCamera>();

    if (!camera) return;
    camera.zoom = (orbitControls?.object as PerspectiveCamera)?.zoom || 1;

    if (options) {
      updateCameraDefault(camera, orbitControls, {
        ...options,
        view: (options.view ?? this.state.view) as Exclude<
          CAMERA_VIEW,
          CAMERA_VIEW.FREE
        >
      });
    } else {
      updateCameraFallback(camera, orbitControls);
    }

    camera.updateMatrix();
    camera.updateMatrixWorld();
    orbitControls?.update();
  }

  addCamera(type: CameraType, camera: PerspectiveCamera) {
    this.cameras.set(type, camera);
    this.observables.addCamera$.next(camera);
  }

  removeCamera(type: CameraType) {
    const camera = this.cameras.get(type);
    if (camera) {
      this.cameras.delete(type);
      this.observables.removeCamera$.next(camera);
    }
  }

  resize() {
    const camera = this.getCamera();
    if (camera instanceof OrthographicCamera) {
      camera.left = -this.cameraZoom * this.aspectRatio;
      camera.right = this.cameraZoom * this.aspectRatio;
      camera.top = this.cameraZoom;
      camera.bottom = -this.cameraZoom;
      camera.updateProjectionMatrix();
    }
  }

  setViewByUnit(unit: Unit, view: CAMERA_VIEW = this.state.view) {
    const camera = this.getCamera();
    if (!camera) return;

    if (view === CAMERA_VIEW.FREE) {
      this.renderer.modules.controls.setEnableOrbitControls(true);
    } else {
      this.renderer.modules.controls.setEnableOrbitControls(false);
      this.updateCamera({
        position: unit.getPosition(),
        quaternion: unit.root.quaternion.clone(),
        view,
        lerpFactor: 1
      });
    }

    this.observables.view$.next(view);
  }

  setCameraClamp(value: boolean) {
    const { orbitControls } = this.renderer.modules.controls;
    if (!orbitControls) return;
    if (value) {
      orbitControls.enableRotate = true;
      orbitControls.enablePan = true;
      orbitControls.enableZoom = true;
    } else {
      orbitControls.enableRotate = false;
      orbitControls.enablePan = false;
      orbitControls.enableZoom = false;
    }
  }

  get cameraZoom() {
    return 1;
  }

  get aspectRatio() {
    const dimension = this.renderer.getDimension();
    return dimension.x / dimension.y;
  }
}

function updateCameraDefault(
  camera: Camera,
  orbitControls: OrbitControls | null,
  options: {
    position: Vector3;
    quaternion?: Quaternion;
    lerpFactor?: number;
    view: Exclude<CAMERA_VIEW, CAMERA_VIEW.FREE>;
  }
) {
  const { position, quaternion } = options;
  let { lerpFactor } = options;

  let applyRotation;

  const cameraOffset = new Vector3(0, 0, 0);
  const targetOffset = new Vector3(0, 0, 0);
  switch (options.view) {
    case CAMERA_VIEW.SIDE:
      cameraOffset.set(6, 1, 0);
      applyRotation = false; // Für Side-Ansicht: Offset nicht rotieren, damit die Ansicht absolut (immer von rechts) ist
      break;
    default:
    case CAMERA_VIEW.BACK:
      cameraOffset.set(0, 2.5, -5);
      // cameraOffset = new Vector3(0, 0.8, -3);
      applyRotation = true; // Standard: Offset rotieren
      break;
    case CAMERA_VIEW.BACK_NEAR:
      cameraOffset.set(0, 0.75, -1.25);
      targetOffset.set(0, 0.5, 0);
      applyRotation = true; // Standard: Offset rotieren
      break;
    case CAMERA_VIEW.BIRD:
      cameraOffset.set(0, 10, 0);
      applyRotation = true;
      break;
  }

  lerpFactor = lerpFactor ?? 0.1;

  const offsetToApply =
    applyRotation && quaternion
      ? cameraOffset.clone().applyQuaternion(quaternion)
      : cameraOffset;

  const idealPosition = position.clone().add(offsetToApply);

  camera.position.lerp(idealPosition, lerpFactor);
  camera.lookAt(position.clone().add(targetOffset));

  orbitControls?.target.copy(position);
}

function updateCameraFallback(
  camera: Camera,
  orbitControls: OrbitControls | null
) {
  const distance = 20;
  camera.position.set(distance, distance, distance);
  camera.lookAt(0, 0, 0); // Explizit auf Zentrum schauen

  orbitControls?.target.set(0, 0, 0); // Target der Controls setzen
}
