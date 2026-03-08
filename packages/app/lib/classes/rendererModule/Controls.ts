import type { Observable } from 'rxjs';
import { switchMap, fromEvent, ReplaySubject, filter } from 'rxjs';
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
  orbitControls$: ReplaySubject<OrbitControls | null>;
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

  orbitControls: OrbitControls | null = null;

  constructor(renderer: Renderer, state: State) {
    super(renderer, {
      ...state
    });

    //#region observables
    this.observables.orbitControls$ = new ReplaySubject<OrbitControls | null>(
      1
    );
    this.observables.options$ = new ReplaySubject<Partial<ControlOptions>>(1);
    this.observables.change$ = this.observables.orbitControls$.pipe(
      filter(Boolean),
      switchMap(controls =>
        fromEvent<Event>(controls as HasEventTargetAddRemove<Event>, 'change')
      )
    );
    //#endregion
  }
  setupOrbitalControls() {
    const renderer = this.renderer;
    this.orbitControls = new OrbitControls(
      renderer.modules.camera.getCamera(),
      renderer.getRenderer().domElement
    );

    this.orbitControls.dampingFactor = 0.05; // kleiner Wert = smoother
    this.orbitControls.zoomSpeed = 1.0;
    this.orbitControls.panSpeed = 1.0;

    // WICHTIG: Target setzen (Mittelpunkt der Szene)
    this.orbitControls.target.set(0, 0, 0);

    // Zoom-Limits um Near-Plane-Clipping zu verhindern
    this.orbitControls.minDistance = this.state.minDistance ?? 1;
    this.orbitControls.maxDistance = this.state.maxDistance ?? 200;

    // Enable damping für smoothere Bewegung
    // this.controls.enableDamping = true;

    this.enable();
    this.orbitControls.update();
  }

  removeOrbitControls() {
    if (this.orbitControls) {
      this.orbitControls.dispose();
      this.orbitControls = null;
    }
  }

  setEnableOrbitControls(value: boolean) {
    if (value) {
      this.setupOrbitalControls();
    } else {
      this.removeOrbitControls();
    }
  }

  refresh() {
    this.orbitControls?.update();
  }

  override async setup() {
    this.renderer.getRenderer().setAnimationLoop(() => {
      if (this.orbitControls?.enableDamping) {
        this.orbitControls.update();
      }
    });

    this.observables.orbitControls$.next(this.orbitControls);
  }

  setControlsClamp(value: boolean) {
    const { orbitControls: controls } = this.renderer.modules.controls;
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
    if (!this.orbitControls) {
      throw new Error('Controls not initialized');
    }
    return {
      pan: this.orbitControls.enablePan,
      zoom: this.orbitControls.enableZoom,
      rotate: this.orbitControls.enableRotate
    };
  }

  setOptions({
    pan = true,
    zoom = true,
    rotate = true
  }: Partial<ControlOptions>) {
    if (!this.orbitControls) return;
    const controls = this.orbitControls;
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
