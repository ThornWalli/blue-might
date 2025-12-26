import type { Texture } from 'three';
import { Object3D } from 'three';
import assetLoader from '@blue-might/app/services/assetLoader';
import { Subscription } from 'rxjs';

import type App from './App';
import type { AnimationLoopValue } from './Renderer';
import { LOADER } from './AssetLoader';
import type Unit from './Unit';
import UnitsModule from './mapModule/Units';
import GroundModule from './mapModule/Ground';
import LightModule from './mapModule/Light';
import PathfindingModule from './mapModule/Pathfinding';
import ShootModule from './mapModule/Shoot';
import EffectModule from './mapModule/Effect';
import { COLLISION_TYPE } from './unitModule/Collision';
import FactionModule from './mapModule/Faction';
import type Faction from './Faction';

type MapModuleList = (
  | typeof UnitsModule
  | typeof GroundModule
  | typeof LightModule
  | typeof PathfindingModule
  | typeof ShootModule
  | typeof FactionModule
  | typeof EffectModule
)[];

interface MapModules {
  units: UnitsModule;
  ground: GroundModule;
  light: LightModule;
  pathfinding: PathfindingModule;
  shoot: ShootModule;
  faction: FactionModule;
  effect: EffectModule;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MapState {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-explicit-any
export interface ModuleDebug extends Record<any, boolean> {}

export default class Map<
  Modules extends MapModules = MapModules,
  ModuleList extends MapModuleList = MapModuleList
> {
  //#region debug
  private moduleDebug: Partial<ModuleDebug> = {};
  setModuleDebug(debug: Partial<ModuleDebug>) {
    this.moduleDebug = { ...this.moduleDebug, ...debug };
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

    this.moduleDebug = { ...this.moduleDebug, ...description.debug };
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
      FactionModule,
      EffectModule
    );

    const preparedModules = moduleList
      .map(ModuleClass => {
        const moduleInstance = new ModuleClass(
          this,
          this.moduleDebug && (this.moduleDebug[ModuleClass.TYPE] ?? false)
        );
        return ModuleClass.TYPES.map(type => [type, moduleInstance]);
      })
      .flat();
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

      if (cm1.getWorldOBB().intersectsOBB(cm2.getWorldOBB())) {
        return cm2.getCollisionType();
      }
    }

    return COLLISION_TYPE.NONE;
  }
}

export interface MapDescription {
  debug?: Partial<ModuleDebug>;
  name: string;
  textures: {
    backgroundTexture: string;
    foregroundTexture: string;
    heightMap: string;
  };
  units: Unit[];
  factions: Faction[];
}
