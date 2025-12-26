import {
  AmbientLight,
  DirectionalLight,
  DirectionalLightHelper,
  Vector3
} from 'three';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
declare module '../Map' {
  interface ModuleDebug {
    light: boolean;
  }
}

type Observables = MapModuleObservables;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends MapModuleState {}

export default class LightModule extends MapModule<State, Observables> {
  static override TYPE = 'light';

  override state: State = {};
  private lights: (DirectionalLight | AmbientLight)[] = [];

  setupLights() {
    const light = new DirectionalLight(0xffffff, 1);
    light.position.set(20, 50, 20);

    light.castShadow = true;

    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    // Optional: Shadow Radius = 0 für harte Kanten
    light.shadow.radius = 0;
    light.shadow.bias = -0.0005;
    const ambientLight = new AmbientLight(0xffffff, 0.4);

    this.lights = [light, ambientLight];
    this.map.addToRoot(...this.lights);

    if (this.debug) {
      const helper = new DirectionalLightHelper(light, 5);
      this.map.addToRoot(helper);
    }

    this.subscription.add(
      this.map.app.renderer?.modules.controls?.observables.change$.subscribe(
        () => {
          this.updateLightPosition();
        }
      )
    );
    this.updateLightPosition();
  }

  override destroy(): void {
    super.destroy();
    this.lights.forEach(light => {
      light.parent?.remove(light);
      light.remove();
    });
  }

  override async setup() {
    await super.setup();

    this.setupLights();
  }

  private updateLightPosition() {
    if (!this.map.app.renderer?.modules.controls?.controls) return;
    const controls = this.map.app.renderer?.modules.controls.controls;
    const camera = controls.object; // Kamera von Controls

    // Licht relativ zur Kamera positionieren (z.B. über und hinter der Kamera)
    const light = this.lights[0] as DirectionalLight;
    light.position.copy(camera.position).add(new Vector3(10, 20, 10)); // Offset zur Kamera

    // Shadow-Camera dynamisch anpassen (basierend auf Map-Größe)
    const mapSize = this.map.modules.ground?.state.terrainWidth ?? 64; // Hole Map-Größe;
    const halfSize = mapSize / 2;
    light.shadow.camera.left = -halfSize;
    light.shadow.camera.right = halfSize;
    light.shadow.camera.top = halfSize;
    light.shadow.camera.bottom = -halfSize;
    light.shadow.camera.updateProjectionMatrix();

    // Target des Lichts auf das Controls-Target setzen
    light.target.position.copy(controls.target);
    light.target.updateMatrixWorld();
  }
}
