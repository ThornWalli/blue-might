import {
  Euler,
  Texture,
  Vector3,
  type EulerTuple,
  type Vector3Tuple
} from 'three';
import { Object3D } from 'three';
import assetLoader from '@blue-might/app/services/assetLoader';
import { ReplaySubject, Subscription } from 'rxjs';
import type { UnitDescriptions } from '@blue-might/units';
import { imageBitmapToBlob } from '@blue-might/app/utils/blob';

import type { App } from '../types';

import type { AnimationLoopValue } from './Renderer';
import { LOADER } from './AssetLoader';
import UnitsModule from './mapModule/Units';
import SurfaceModule from './mapModule/Surface';
import LightModule from './mapModule/Light';
import PathfindingModule from './mapModule/Pathfinding';
import ShootModule from './mapModule/Shoot';
import EffectModule from './mapModule/Effect';
import FactionModule from './mapModule/Faction';
import AirFlowModule from './mapModule/AirFlow';
import type { FactionDescription, FactionIdentifier } from './Faction';
import type { RawUnitDescription } from './Unit';

export interface Textures {
  heightMap: Texture<ImageBitmap>;
  backgroundTexture: Texture<ImageBitmap>;
  foregroundTexture: Texture<ImageBitmap>;
}

interface MapObservables {
  playerOptions$: ReplaySubject<PlayerOptions>;
}

type MapModuleList = (
  | typeof UnitsModule
  | typeof SurfaceModule
  | typeof LightModule
  | typeof PathfindingModule
  | typeof ShootModule
  | typeof FactionModule
  | typeof AirFlowModule
  | typeof EffectModule
)[];

interface MapModules {
  units: UnitsModule;
  surface: SurfaceModule;
  light: LightModule;
  pathfinding: PathfindingModule;
  shoot: ShootModule;
  faction: FactionModule;
  airFlow: AirFlowModule;
  effect: EffectModule;
}

interface MapState {
  playerOptions: PlayerOptions<UnitDescriptions>;
}

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
  state: MapState;
  observables: MapObservables;
  modules: Modules = {} as Modules;
  root: Object3D;
  description: MapDescription;

  private textures: Textures = {
    heightMap: new Texture(),
    backgroundTexture: new Texture(),
    foregroundTexture: new Texture()
  };

  getTextures() {
    return this.textures;
  }

  setTextures(textures: Textures) {
    this.textures = textures;
  }

  constructor(
    description: MapDescription,
    public app: App,
    protected moduleList: unknown[] = []
  ) {
    this.root = new Object3D();
    this.root.name = 'map';

    this.description = description;

    this.state = {
      playerOptions: {
        ...description.playerOptions,
        position: new Vector3().fromArray(description.playerOptions.position),
        rotation: description.playerOptions.rotation
          ? new Euler().fromArray(description.playerOptions.rotation)
          : undefined,
        faction: description.playerOptions.faction
      }
    };

    //#region observables
    this.observables = {
      playerOptions$: new ReplaySubject<PlayerOptions>()
    };
    this.observables.playerOptions$.next(this.state.playerOptions);
    //#endregion

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
      SurfaceModule,
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

  getPlayerOptions() {
    return this.state.playerOptions;
  }

  setPlayerOptions(playerOptions: PlayerOptions) {
    if (this.state.playerOptions === playerOptions) return;
    this.state.playerOptions = playerOptions;
    this.observables.playerOptions$.next(playerOptions);
  }

  private async loadAssets() {
    const [heightMap, backgroundTexture, foregroundTexture] = await Promise.all(
      [
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.description.surface.textures.heightMap,
          loader: LOADER.TEXTURE
        }),
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.description.surface.textures.backgroundTexture,
          loader: LOADER.TEXTURE
        }),
        assetLoader.add<Texture<ImageBitmap>>({
          value: this.description.surface.textures.foregroundTexture,
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

  getMeta(): Meta {
    return this.description.meta;
  }
  setMeta(meta: Meta) {
    this.description.meta = meta;
  }

  update(value: AnimationLoopValue) {
    Object.values(this.modules).forEach(module => {
      module.update(value);
    });
  }

  get playerStartPosition() {
    return this.description.playerOptions;
  }

  async toDescription(): Promise<MapDescription> {
    const textures = Object.fromEntries(
      await Promise.all(
        Object.entries(this.textures).map(async ([key, texture]) => {
          return [
            key,
            URL.createObjectURL(await imageBitmapToBlob(texture.image))
          ];
        })
      )
    );

    return {
      debug: this.moduleDebug,
      meta: {
        ...this.description.meta
      },
      playerOptions: {
        ...this.state.playerOptions,
        position: this.state.playerOptions.position.toArray(),
        rotation: this.state.playerOptions.rotation?.toArray()
      },
      surface: {
        textures: textures,
        heightMapInclude: this.description.surface.heightMapInclude ?? false,
        noise: this.description.surface.noise ?? {
          active: false,
          size: 2,
          intensity: 0.25,
          opacity: 0.5,
          monochrome: false
        }
      },
      units: Object.values(this.modules.units.getUnits()).map(unit =>
        unit.toDescription()
      ),
      factions: Object.values(this.modules.faction.getFactions())
        .filter(faction => !faction.builtin)
        .map(faction => faction.toDescription())
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

export interface Meta {
  name: string;
  description?: string | null;
}

export interface MapDescription {
  debug?: Partial<ModuleDebug>;
  meta: Meta;
  playerOptions: RawPlayerOptions;
  surface: {
    textures: {
      heightMap: string;
      backgroundTexture: string;
      foregroundTexture: string;
    };
    heightMapInclude?: boolean;
    noise?: MapNoise;
  };
  units: RawUnitDescription[];
  factions: FactionDescription[];
}

export interface MapNoise {
  active: boolean;
  size: number;
  intensity: number;
  opacity: number;
  monochrome: boolean;
}

export const DEFAULT_MAP_NOISE = Object.freeze<MapNoise>({
  active: false,
  size: 2,
  intensity: 0.25,
  opacity: 0.5,
  monochrome: false
});
