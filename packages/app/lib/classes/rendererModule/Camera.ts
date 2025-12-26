import type { Quaternion } from 'three';
import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three';
import { ReplaySubject } from 'rxjs';

import type Renderer from '../Renderer';
import RendererModule, {
  type RendererModuleObservables,
  type RendererModuleState
} from '../RendererModule';

export interface Observables extends RendererModuleObservables {
  camera$: ReplaySubject<PerspectiveCamera>;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface State extends RendererModuleState {}

export default class CameraRendererModule extends RendererModule<
  State,
  Observables
> {
  static override TYPE = 'camera';

  camera?: PerspectiveCamera;

  constructor(renderer: Renderer, state: State) {
    super(renderer, {
      ...state
    });

    //#region observables
    this.observables.camera$ = new ReplaySubject<PerspectiveCamera>(1);
    //#endregion
  }

  override async setup() {
    const dimension = this.renderer.dimension;
    const camera = new PerspectiveCamera(
      60, // FOV reduziert von 75 auf 60 für bessere Sicht auf Details
      dimension.x / dimension.y,
      0.1, // near plane näher für kleine Objekte
      2000 // far plane
    );

    this.camera = camera;
    this.updateCamera();
  }

  updateCamera(options?: {
    position: Vector3;
    quaternion: Quaternion;
    lerpFactor?: number;
  }) {
    const { controls } = this.renderer.modules.controls;
    if (!controls) return;
    if (!this.camera) return;
    this.camera.zoom = (controls.object as PerspectiveCamera)?.zoom || 1;

    if (options) {
      const { position, quaternion } = options;
      let { lerpFactor } = options;

      const cameraOffset = new Vector3(0, 5, -5);
      lerpFactor = lerpFactor ?? 0.1;

      const idealPosition = position
        .clone()
        .add(cameraOffset.clone().applyQuaternion(quaternion));

      this.camera.position.lerp(idealPosition, lerpFactor);
      this.camera.lookAt(position);

      controls.target.copy(position);
      controls.update();
    } else {
      const distance = 10;
      this.camera.position.set(distance, distance, distance);
      this.camera.lookAt(0, 0, 0); // Explizit auf Zentrum schauen

      controls.target.set(0, 0, 0); // Target der Controls setzen
      controls.update();
    }
  }

  getCamera() {
    if (!this.camera) {
      throw new Error('Camera not initialized');
    }
    return this.camera;
  }

  setCamera(camera: PerspectiveCamera) {
    this.camera = camera;
    this.observables.camera$.next(camera);
  }

  resize() {
    const camera = this.camera;
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
    return this.renderer.dimension.x / this.renderer.dimension.y;
  }
}
