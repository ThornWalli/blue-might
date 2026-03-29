import type {
  RawUnitDescription,
  UnitConstructorOptions,
  UnitOptions
} from '@blue-might/app/lib/classes/Unit';
import {
  GROUND_ADJUSTMENT_MODE,
  type SetupContext
} from '@blue-might/app/lib/types/unit';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { Mesh, SkinnedMesh, Vector2 } from 'three';
import BuildingUnit, {
  type BuildingUnitModuleList,
  type BuildingUnitModules,
  type BuildingUnitOptions
} from '@blue-might/app/lib/classes/unit/Building';
import { TILE_TYPE } from '@blue-might/app/lib/utils/pathfinding';
import { setIgnorePathfinding } from '@blue-might/app/lib/classes/unitModule/Pathfinding';
import RescueUnitModule from '@blue-might/app/lib/classes/unitModule/Rescue';
import TransportUnitModule from '@blue-might/app/lib/classes/unitModule/Transport';
import RadarUnitModule from '@blue-might/app/lib/classes/unitModule/Radar';
import SupplyUnitModule from '@blue-might/app/lib/classes/unitModule/Supply';
import { addModules } from '@blue-might/app/lib/classes/Module';

import baseGlb from './assets/carrier_1.glb?url';

export type Options = BuildingUnitOptions;

interface CarrierUnitModules extends BuildingUnitModules {
  radar: RadarUnitModule;
  supply: SupplyUnitModule;
  rescue: RescueUnitModule;
  transport: TransportUnitModule;
}

type CarrierUnitModuleList = (
  | [typeof RadarUnitModule | typeof SupplyUnitModule]
  | typeof RescueUnitModule
  | typeof TransportUnitModule
)[] &
  BuildingUnitModuleList;

export interface RawUnitDescription_Carrier_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'carrier_1';
}

export default class Carrier_1<
  Modules extends CarrierUnitModules = CarrierUnitModules,
  ModuleList extends CarrierUnitModuleList = CarrierUnitModuleList
> extends BuildingUnit<Modules, ModuleList, Options> {
  static override KEY = 'carrier_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList?: ModuleList
  ) {
    moduleList = addModules(moduleList, [
      RadarUnitModule,
      SupplyUnitModule,
      RescueUnitModule,
      TransportUnitModule
    ]);
    super(
      {
        ...options,
        name: 'Carrier',
        moduleOptions: {
          ...options.moduleOptions,
          supply: {
            ...options.moduleOptions?.supply,
            supplyRadius: 0.5,
            sphereTarget: { name: 'landing_port_supply' }
          },
          damage: {
            enabled: false
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [{ name: 'base', default: true }, { name: 'head' }]
          },
          transport: {
            maxSlots: Infinity,
            entryPosition: new Vector2(0, 0.65)
          }
        }
      },
      moduleList
    );
    this.setGroundAdjustmentMode(GROUND_ADJUSTMENT_MODE.SEA);
  }

  override async afterSetup(_context: SetupContext) {
    await super.afterSetup(_context);
    this.setMaterialReady();
  }

  override getTileType() {
    return TILE_TYPE.UNIT_PLATFORM;
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);

    setIgnorePathfinding(object.getObjectByName('base')!, true);
    setIgnorePathfinding(object.getObjectByName('head')!, true);

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    return object;
  }
}
