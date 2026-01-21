import {
  Euler,
  Vector3,
  type EulerTuple,
  type Texture,
  type Vector3Tuple
} from 'three';
import { Object3D } from 'three';
import assetLoader from '@blue-might/app/services/assetLoader';
import { Subscription } from 'rxjs';
import type { UnitDescriptions } from '@blue-might/units';

import type App from './App';
import type { AnimationLoopValue } from './Renderer';
import { LOADER } from './AssetLoader';
import UnitsModule from './mapModule/Units';
import GroundModule from './mapModule/Ground';
import LightModule from './mapModule/Light';
import PathfindingModule from './mapModule/Pathfinding';
import ShootModule from './mapModule/Shoot';
import EffectModule from './mapModule/Effect';
import FactionModule from './mapModule/Faction';
import AirFlowModule from './mapModule/AirFlow';
import type { FactionDescription, FactionIdentifier } from './Faction';
import type { RawUnitDescription } from './Unit';

type MapModuleList = (
  | typeof UnitsModule
  | typeof GroundModule
  | typeof LightModule
  | typeof PathfindingModule
  | typeof ShootModule
  | typeof FactionModule
  | typeof AirFlowModule
  | typeof EffectModule
)[];

interface MapModules {
  units: UnitsModule;
  ground: GroundModule;
  light: LightModule;
  pathfinding: PathfindingModule;
  shoot: ShootModule;
  faction: FactionModule;
  airFlow: AirFlowModule;
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
  private destroyed = false;
  subscription = new Subscription();
  state: MapState = {};
  modules: Modules = {} as Modules;
  root: Object3D;
  description: MapDescription;
  playerOptions: PlayerOptions<UnitDescriptions>;
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
    this.playerOptions = {
      ...description.playerOptions,
      position: new Vector3().fromArray(description.playerOptions.position),
      rotation: description.playerOptions.rotation
        ? new Euler().fromArray(description.playerOptions.rotation)
        : undefined,
      faction: description.playerOptions.faction
    };

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
      FactionModule,
      UnitsModule,
      GroundModule,
      LightModule,
      ShootModule,
      PathfindingModule,
      AirFlowModule,
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
          value: this.description.ground.heightMap,
          loader: LOADER.TEXTURE
        }),
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.description.ground.backgroundTexture,
          loader: LOADER.TEXTURE
        }),
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.description.ground.foregroundTexture,
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
    this.destroyed = true;
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

  get playerStartPosition() {
    return this.description.playerOptions;
  }

  toDescription(): MapDescription {
    return {
      debug: this.moduleDebug,
      name: this.name,
      playerOptions: this.playerStartPosition,
      ground: {
        heightMap: this.description.ground.heightMap,
        backgroundTexture: this.description.ground.backgroundTexture,
        foregroundTexture: this.description.ground.foregroundTexture,
        noiseMonochrome: this.description.ground.noiseMonochrome
      },
      units: Object.values(this.modules.units.getUnits()).map(unit =>
        unit.toDescription()
      ),
      factions: Object.values(this.modules.faction.getFactions()).map(faction =>
        faction.toDescription()
      )
    };
  }
}

export interface RawPlayerOptions<
  UD extends UnitDescriptions = UnitDescriptions,
  V3 = Vector3Tuple,
  E = EulerTuple
> {
  unit: UD;
  position: V3;
  rotation?: E;
  faction: FactionIdentifier;
}

export type PlayerOptions<UD extends UnitDescriptions = UnitDescriptions> =
  RawPlayerOptions<UD, Vector3, Euler>;

export interface MapDescription {
  debug?: Partial<ModuleDebug>;
  name: string;
  playerOptions: RawPlayerOptions;
  ground: {
    heightMap: string;
    backgroundTexture: string;
    foregroundTexture: string;
    noiseMonochrome?: boolean;
  };
  units: RawUnitDescription[];
  factions: FactionDescription[];
}
