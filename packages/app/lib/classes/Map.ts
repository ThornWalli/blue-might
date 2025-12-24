import type { Texture } from 'three';
import { Object3D } from 'three';
import type App from './App';
import type { AnimationLoopValue } from './Renderer';
import assetLoader from '@blue-might/app/services/assetLoader';
import { LOADER } from './AssetLoader';
import type Unit from './Unit';
import { Subscription } from 'rxjs';
import UnitsModule from './mapModule/Units';
import GroundModule from './mapModule/Ground';
import LightModule from './mapModule/Light';
import PathfindingModule from './mapModule/Pathfinding';
import ShootModule from './mapModule/Shoot';
import EffectModule from './mapModule/Effect';
import { COLLISION_TYPE } from './unitModule/Collision';

type MapModuleList = (
  | typeof UnitsModule
  | typeof GroundModule
  | typeof LightModule
  | typeof PathfindingModule
  | typeof ShootModule
  | typeof EffectModule
)[];

interface MapModules {
  units: UnitsModule;
  ground: GroundModule;
  light: LightModule;
  pathfinding: PathfindingModule;
  shoot: ShootModule;
  effect: EffectModule;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MapState {}

export default class Map<
  Modules extends MapModules = MapModules,
  ModuleList extends MapModuleList = MapModuleList
> {
  //#region debug
  private debug: { [key: string]: boolean } = {
    [PathfindingModule.TYPE]: false,
    [GroundModule.TYPE]: false,
    [LightModule.TYPE]: false,
    [UnitsModule.TYPE]: false,
    [ShootModule.TYPE]: false,
    [EffectModule.TYPE]: false
  };
  setDebug(debug: { [key: string]: boolean }) {
    this.debug = { ...this.debug, ...debug };
  }
  //#endregion

  subscription = new Subscription();
  state: MapState = {};
  modules: Modules = {} as Modules;
  root: Object3D;
  description: MapDescription;
  textures: {
    heightMap: Texture<ImageBitmap> | null;
    backgroundTexture: Texture<ImageBitmap> | null;
    foregroundTexture: Texture<ImageBitmap> | null;
  } = {
    heightMap: null,
    backgroundTexture: null,
    foregroundTexture: null
  };

  constructor(
    description: MapDescription,
    public app: App,
    protected moduleList: unknown[] = []
  ) {
    this.root = new Object3D();
    this.root.name = 'map';

    this.description = description;

    this.debug = { ...this.debug, ...description.debug };
  }

  async setup() {
    await this.loadAssets();
    await this.setupModules();

    this.subscription.add(
      this.modules.units.observables.select$.subscribe(unit =>
        this.app.modules.selection.setSelectedUnit(unit)
      )
    );
  }

  private async setupModules() {
    const moduleList = this.moduleList as ModuleList;
    moduleList.push(
      UnitsModule,
      GroundModule,
      LightModule,
      PathfindingModule,
      ShootModule,
      EffectModule
    );

    const preparedModules = moduleList.map(ModuleClass => {
      const moduleInstance = new ModuleClass(
        this,
        this.debug && (this.debug[ModuleClass.TYPE] ?? false)
      );
      return [ModuleClass.TYPE, moduleInstance];
    });
    this.modules = Object.fromEntries(preparedModules);

    await Promise.all(
      Object.values(this.modules).map(module => module.setup())
    );
    await Promise.all(
      Object.values(this.modules).map(module => module.afterSetup())
    );
  }

  private async loadAssets() {
    const [heightMap, backgroundTexture, foregroundTexture] = await Promise.all(
      [
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.description.textures.heightMap,
          loader: LOADER.TEXTURE
        }),
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.description.textures.backgroundTexture,
          loader: LOADER.TEXTURE
        }),
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.description.textures.foregroundTexture,
          loader: LOADER.TEXTURE
        })
      ]
    );
    this.textures.heightMap = heightMap;
    this.textures.backgroundTexture = backgroundTexture;
    this.textures.foregroundTexture = foregroundTexture;
  }

  destroy() {
    this.subscription.unsubscribe();
    this.app.getScene().remove(this.root);
    this.root.remove();
    Object.values(this.modules).forEach(module => module.destroy());
  }

  addToRoot(...object: Object3D[]) {
    this.root.add(...object);
  }

  removeFromRoot(...object: Object3D[]) {
    this.root.remove(...object);
  }

  update(value: AnimationLoopValue) {
    Object.values(this.modules).forEach(module => {
      module.update(value);
    });
  }

  get name() {
    return this.description.name;
  }

  checkCollision(unit: Unit) {
    const cm1 = unit.modules.collision;
    if (!cm1) return COLLISION_TYPE.NONE;

    cm1.refreshWorldOBB();
    cm1.refreshDebugHelper();

    const units = this.modules.units.getUnits();

    for (let i = 0; i < units.length; i++) {
      const target = units[i]!;
      if (target === unit) continue; // Verwende === statt .equal()

      const cm2 = target.modules.collision;
      if (!cm2) continue;

      cm2.refreshWorldOBB();
      cm2.refreshDebugHelper(); // Nur für debug, sonst weglassen

      if (cm1.worldOBB.intersectsOBB(cm2.worldOBB)) {
        return cm2.getCollisionType();
      }
    }

    return COLLISION_TYPE.NONE;
  }
}

export interface MapDescription {
  debug?: { [key: string]: boolean };
  name: string;
  textures: {
    backgroundTexture: string;
    foregroundTexture: string;
    heightMap: string;
  };
  units: Unit[];
}
