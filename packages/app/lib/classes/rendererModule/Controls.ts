import type { Observable } from 'rxjs';
import { switchMap, fromEvent, ReplaySubject } from 'rxjs';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { HasEventTargetAddRemove } from 'rxjs/internal/observable/fromEvent';

import type Renderer from '../Renderer';
import RendererModule, {
  type RendererModuleObservables,
  type RendererModuleState
} from '../RendererModule';

interface ControlOptions {
  pan: boolean;
  zoom: boolean;
  rotate: boolean;
}

export interface Observables extends RendererModuleObservables {
  controls$: ReplaySubject<OrbitControls>;
  options$: ReplaySubject<Partial<ControlOptions>>;
  change$: Observable<Event>;
}

export interface State extends RendererModuleState {
  minDistance?: number;
  maxDistance?: number;
}

export default class ControlsRendererModule extends RendererModule<
  State,
  Observables
> {
  static override TYPE = 'controls';

  controls?: OrbitControls;

  constructor(renderer: Renderer, state: State) {
    super(renderer, {
      ...state
    });

    //#region observables
    this.observables.controls$ = new ReplaySubject<OrbitControls>(1);
    this.observables.options$ = new ReplaySubject<Partial<ControlOptions>>(1);
    this.observables.change$ = this.observables.controls$.pipe(
      switchMap(controls =>
        fromEvent<Event>(controls as HasEventTargetAddRemove<Event>, 'change')
      )
    );
    //#endregion
  }

  refresh() {
    this.controls?.update();
  }

  override async setup() {
    const renderer = this.renderer;

    this.controls = new OrbitControls(
      renderer.modules.camera.getCamera(),
      renderer.getRenderer().domElement
    );

    this.controls.dampingFactor = 0.05; // kleiner Wert = smoother
    this.controls.zoomSpeed = 1.0;
    this.controls.panSpeed = 1.0;

    // WICHTIG: Target setzen (Mittelpunkt der Szene)
    this.controls.target.set(0, 0, 0);

    // Zoom-Limits um Near-Plane-Clipping zu verhindern
    this.controls.minDistance = this.state.minDistance ?? 1;
    this.controls.maxDistance = this.state.maxDistance ?? 200;

    // Enable damping für smoothere Bewegung
    // this.controls.enableDamping = true;

    this.enable();
    this.controls.update();

    renderer.getRenderer().setAnimationLoop(() => {
      if (this.controls?.enableDamping) {
        this.controls.update();
      }
    });

    this.observables.controls$.next(this.controls);
  }

  setControlsClamp(value: boolean) {
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
  getControlsOptions() {
    if (!this.controls) {
      throw new Error('Controls not initialized');
    }
    return {
      pan: this.controls.enablePan,
      zoom: this.controls.enableZoom,
      rotate: this.controls.enableRotate
    };
  }

  setOptions({
    pan = true,
    zoom = true,
    rotate = true
  }: Partial<ControlOptions>) {
    if (!this.controls) return;
    const controls = this.controls;
    controls.enablePan = pan;
    controls.enableZoom = zoom;
    controls.enableRotate = rotate;
    this.observables.options$.next({
      pan: controls.enablePan,
      zoom: controls.enableZoom,
      rotate: controls.enableRotate
    });
  }

  enable() {
    this.setOptions({
      pan: true,
      zoom: true,
      rotate: true
    });
  }
  disable() {
    this.setOptions({
      pan: true,
      zoom: true,
      rotate: false
    });
  }
}
