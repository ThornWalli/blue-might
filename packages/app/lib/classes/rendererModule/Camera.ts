import type { Camera, Quaternion } from 'three';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { Subject } from 'rxjs';

import type Renderer from '../Renderer';
import RendererModule, {
  type RendererModuleObservables,
  type RendererModuleState
} from '../RendererModule';

export enum CameraType {
  MAIN = 'main',
  SECONDARY = 'secondary'
}

export interface Observables extends RendererModuleObservables {
  addCamera$: Subject<Camera>;
  removeCamera$: Subject<Camera>;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface State extends RendererModuleState {}

export default class CameraRendererModule extends RendererModule<
  State,
  Observables
> {
  getCameras() {
    return Array.from(this.cameras.values());
  }
  static override TYPE = 'camera';

  private cameras: Map<string, Camera> = new Map(); // Map mit Camera als Wert

  constructor(renderer: Renderer, state: State) {
    super(renderer, {
      ...state
    });

    //#region observables
    this.observables.addCamera$ = new Subject<Camera>();
    this.observables.removeCamera$ = new Subject<Camera>();
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
    quaternion: Quaternion;
    lerpFactor?: number;
  }) {
    const { controls } = this.renderer.modules.controls;
    if (!controls) return;

    const camera = this.getCamera<PerspectiveCamera>();

    if (!camera) return;
    camera.zoom = (controls.object as PerspectiveCamera)?.zoom || 1;

    if (options) {
      const { position, quaternion } = options;
      let { lerpFactor } = options;

      const cameraOffset = new Vector3(0, 5, -5);
      lerpFactor = lerpFactor ?? 0.1;

      const idealPosition = position
        .clone()
        .add(cameraOffset.clone().applyQuaternion(quaternion));

      camera.position.lerp(idealPosition, lerpFactor);
      camera.lookAt(position);

      controls.target.copy(position);
    } else {
      const distance = 10;
      camera.position.set(distance, distance, distance);
      camera.lookAt(0, 0, 0); // Explizit auf Zentrum schauen

      controls.target.set(0, 0, 0); // Target der Controls setzen
    }
    controls.update();
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

  setCameraClamp(value: boolean) {
    const { controls } = this.renderer.modules.controls;
    if (!controls) return;
    if (value) {
      controls.enableRotate = false; // Kein Drehen
      controls.enablePan = true; // Nur bewegen
      controls.enableZoom = true; // Zoom mit Mausrad
    } else {
      controls.enableRotate = true; // Kein Drehen
      controls.enablePan = true; // Nur bewegen
      controls.enableZoom = true; // Zoom mit Mausrad
    }
  }

  get cameraZoom() {
    // return 1 * 48 * (512 / window.innerWidth);
    return 1;
  }

  get aspectRatio() {
    const dimension = this.renderer.getDimension();
    return dimension.x / dimension.y;
  }
}
