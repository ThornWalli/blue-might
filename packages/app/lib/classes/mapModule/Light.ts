import { AmbientLight, DirectionalLight, DirectionalLightHelper } from 'three';
import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Unit from '../Unit';
import type { Subject } from 'rxjs';

interface Observables extends MapModuleObservables {
  addUnit$: Subject<Unit>;
  removeUnit$: Subject<Unit>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends MapModuleState {}

export default class LightModule extends MapModule<State, Observables> {
  static override TYPE = 'light';

  override state: State = {};
  private lights: (DirectionalLight | AmbientLight)[] = [];

  setupLights() {
    const light = new DirectionalLight(0xffffff, 1);
    light.position.set(20, 50, 20);

    const helper = new DirectionalLightHelper(light, 5);
    this.map.addToRoot(helper);

    light.castShadow = true;

    light.shadow.mapSize.width = 4096 * 4; // groß = hohe Qualität
    light.shadow.mapSize.height = 4096 * 4;

    light.shadow.camera.left = -20;
    light.shadow.camera.right = 20;
    light.shadow.camera.top = 20;
    light.shadow.camera.bottom = -20;

    // Optional: Shadow Radius = 0 für harte Kanten
    light.shadow.radius = 0;
    const ambientLight = new AmbientLight(0xffffff, 0.4);

    this.lights = [light, ambientLight];
    this.map.addToRoot(...this.lights);
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
}
