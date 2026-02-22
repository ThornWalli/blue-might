/* eslint-disable @typescript-eslint/no-explicit-any */

import { Euler, Vector3, Object3D, Color } from 'three';
import { ReplaySubject, Subscription } from 'rxjs';
import type { UnitDescriptions } from '@blue-might/units';

import type { App } from '../types';
import type {
  FogOptions,
  MapDescription,
  Meta,
  PlayerOptions
} from '../types/map';

import type { AnimationLoopValue } from './Renderer';
import UnitsModule from './mapModule/Units';
import SurfaceModule from './mapModule/Surface';
import LightModule from './mapModule/Light';
import PathfindingModule from './mapModule/Pathfinding';
import ShootModule from './mapModule/Shoot';
import EffectModule from './mapModule/Effect';
import FactionModule from './mapModule/Faction';
import AirFlowModule from './mapModule/AirFlow';
import type Module from './Module';
import MissionModule from './mapModule/Mission';
import type { MapModuleOptions, MapModuleState } from './MapModule';
import type MapModule from './MapModule';

interface MapObservables {
  playerOptions$: ReplaySubject<PlayerOptions>;
  fogOptions$: ReplaySubject<FogOptions>;
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
  | typeof MissionModule
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
  mission: MissionModule;
}

interface MapState {
  playerOptions: PlayerOptions<UnitDescriptions>;
  fogOptions: FogOptions;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModuleDebug extends Record<any, boolean> {}

export interface ModuleOptions {
  [key: string]: MapModuleOptions;
}

export interface ModuleStates {
  [key: string]: MapModuleState;
}

export default class Map<
  Modules extends MapModules = MapModules,
  ModuleList extends MapModuleList = MapModuleList
> {
  //#region debug
  private moduleDebug: Partial<ModuleDebug> = {};

  getModuleDebug() {
    return this.moduleDebug;
  }
  setModuleDebug(debug: Partial<ModuleDebug>) {
    this.moduleDebug = { ...this.moduleDebug, ...debug };
  }
  //#endregion

  private destroyed = false;
  subscription = new Subscription();
  state: MapState;
  observables: MapObservables;
  protected moduleOptions: Partial<ModuleOptions>;
  protected moduleStates: Partial<ModuleStates>;
  modules: Modules = {} as Modules;
  root: Object3D;
  description: MapDescription;

  constructor(
    description: MapDescription,
    public app: App,
    protected moduleList: unknown[] = []
  ) {
    this.root = new Object3D();
    this.root.name = 'map';

    this.description = description;

    this.moduleOptions = description.moduleOptions ?? {};
    this.moduleStates = description.moduleStates ?? {};

    const fogOptions = description.fogOptions ?? {
      enabled: false,
      color: [0, 0, 0, 255],
      fogDistance: 30
    };

    this.state = {
      playerOptions: {
        ...description.playerOptions,
        position: new Vector3().fromArray(description.playerOptions.position),
        rotation: description.playerOptions.rotation
          ? new Euler().fromArray(description.playerOptions.rotation)
          : undefined,
        faction: description.playerOptions.faction
      },
      fogOptions: {
        ...fogOptions,
        color: new Color().fromArray(fogOptions.color)
      }
    };

    //#region observables
    this.observables = {
      playerOptions$: new ReplaySubject<PlayerOptions>(),
      fogOptions$: new ReplaySubject<FogOptions>()
    };
    this.observables.playerOptions$.next(this.state.playerOptions);
    this.observables.fogOptions$.next(this.state.fogOptions);
    //#endregion

    this.moduleDebug = { ...this.moduleDebug, ...description.moduleDebug };
  }

  async setup() {
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
      EffectModule,
      MissionModule
    );

    const moduleOptions = this.moduleOptions;
    const moduleStates = this.moduleStates;

    const preparedModules = (moduleList as ModuleList)
      .map(ModuleClass => {
        const types = ModuleClass.TYPES;

        const { options, state } = types.reduce<{
          options: any;
          state: any;
        }>(
          (acc, type) => {
            acc.options = {
              ...acc.options,
              ...(moduleOptions?.[type] ?? {})
            };
            acc.state = {
              ...acc.state,
              ...(moduleStates?.[type] ?? {})
            };
            return acc;
          },
          { options: {}, state: {} }
        );

        const moduleInstance = new ModuleClass(
          this,
          options,
          state,
          this.moduleDebug[ModuleClass.TYPE] ?? false
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

  destroy() {
    this.subscription.unsubscribe();
    this.app.getScene().remove(this.root);
    this.root.remove();

    this.modules.surface.destroy();
    this.modules.pathfinding.destroy();

    Object.values<Module>({
      ...(this.modules as unknown as (typeof Module)[]),
      surface: undefined,
      pathfinding: undefined
    })
      .filter(m => m !== undefined)
      .forEach(module => {
        module.destroy();
      });

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

  setFogOptions(fogOptions: FogOptions) {
    this.state.fogOptions = {
      ...fogOptions
    };
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
    return {
      meta: {
        ...this.description.meta
      },
      playerOptions: {
        ...this.state.playerOptions,
        position: this.state.playerOptions.position.toArray(),
        rotation: this.state.playerOptions.rotation?.toArray()
      },
      fogOptions: {
        ...this.state.fogOptions,
        color: this.state.fogOptions.color.toArray()
      },
      moduleOptions: Object.fromEntries(
        (
          await Promise.all(
            Object.entries(this.modules).map(async ([key, module]) => {
              const options = await (module as MapModule).getOptions();
              if (Object.values(options).filter(Boolean).length) {
                return [key, options];
              }
              return null;
            })
          )
        ).filter(v => v !== null)
      ),
      moduleStates: Object.fromEntries(
        (
          await Promise.all(
            Object.entries(this.modules).map(async ([key, module]) => {
              const options = await (module as MapModule).getState();
              if (Object.values(options).filter(Boolean).length) {
                return [key, options];
              }
              return null;
            })
          )
        ).filter(v => v !== null)
      ),
      moduleDebug: this.moduleDebug
    };
  }
}
