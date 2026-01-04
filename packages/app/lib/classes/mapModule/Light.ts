import { AmbientLight, DirectionalLight, DirectionalLightHelper } from 'three';

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

    light.shadow.mapSize.set(1024, 1024);
    light.shadow.radius = 0;

    light.shadow.bias = -0.0007;
    light.shadow.normalBias = 0.03;
    const ambientLight = new AmbientLight(0xcccccc, 0.08);

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

  private lightAngle: number = 45;
  private lightDistance: number = 6;

  private updateLightPosition() {
    if (!this.map.app.renderer?.modules.controls?.controls) return;
    const controls = this.map.app.renderer?.modules.controls.controls;
    const camera = controls.object;

    const light = this.lights[0] as DirectionalLight;

    const angleRad = (this.lightAngle * Math.PI) / 180;
    const offsetX = this.lightDistance * Math.sin(angleRad);
    const offsetZ = this.lightDistance * Math.cos(angleRad);

    light.position.set(
      camera.position.x + offsetX,
      12,
      camera.position.z + offsetZ
    );

    const SHADOW_RANGE = 12;

    light.shadow.camera.left = -SHADOW_RANGE;
    light.shadow.camera.right = SHADOW_RANGE;
    light.shadow.camera.top = SHADOW_RANGE;
    light.shadow.camera.bottom = -SHADOW_RANGE;

    light.shadow.camera.near = 2;
    light.shadow.camera.far = 40;
    light.shadow.camera.updateProjectionMatrix();

    // light.target.position.copy(controls.target);
    light.target.position.set(camera.position.x, 0, camera.position.z);
    light.target.updateMatrixWorld();
  }
}
