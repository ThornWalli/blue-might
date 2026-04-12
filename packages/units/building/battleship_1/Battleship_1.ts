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
import { LoopRepeat, Mesh, SkinnedMesh, Vector2 } from 'three';
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

import baseGlb from './assets/battleship_1.glb?url';

export type Options = BuildingUnitOptions;

interface BattleshipUnitModules extends BuildingUnitModules {
  radar: RadarUnitModule;
  supply: SupplyUnitModule;
  rescue: RescueUnitModule;
  transport: TransportUnitModule;
}

type BattleshipUnitModuleList = (
  | [typeof RadarUnitModule | typeof SupplyUnitModule]
  | typeof RescueUnitModule
  | typeof TransportUnitModule
)[] &
  BuildingUnitModuleList;

export interface RawUnitDescription_Battleship_1<
  O extends UnitOptions = Options
> extends RawUnitDescription<UnitConstructorOptions<O>> {
  key: 'battleship_1';
}

export default class Battleship_1<
  Modules extends BattleshipUnitModules = BattleshipUnitModules,
  ModuleList extends BattleshipUnitModuleList = BattleshipUnitModuleList
> extends BuildingUnit<Modules, ModuleList, Options> {
  static override KEY = 'battleship_1';
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
        name: 'Battleship',
        moduleOptions: {
          ...options.moduleOptions,
          supply: {
            ...options.moduleOptions?.supply,
            supplyRadius: 0.5,
            sphereTarget: { name: 'landing_port_supply' }
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [{ name: 'base', default: true }]
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

    //#region Animation

    const action = this.modules.animation.getAction('radar');
    if (action) {
      action.clampWhenFinished = false;
      action.setLoop(LoopRepeat, Infinity);
      action.setDuration(2);
    }

    this.modules.animation.playAction('radar');

    this.subscription.add(
      this.modules.damage.observables.destroyed$.subscribe(() => {
        this.modules.animation.stopAction('radar');
      })
    );

    //#endregion
  }

  override getTileType() {
    return TILE_TYPE.UNIT_PLATFORM;
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);

    setIgnorePathfinding(object.getObjectByName('base')!, true);

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    return object;
  }
}
