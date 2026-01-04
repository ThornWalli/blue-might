import { Mesh, SkinnedMesh } from 'three';
import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import LandingPortUnit, {
  type LandingPortUnitModuleList,
  type LandingPortUnitModules,
  type LandingPortUnitOptions
} from '@blue-might/app/lib/classes/unit/LandingPort';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';
import { replaceColors } from '@blue-might/app/lib/utils/object';
import SupplyUnitModule from '@blue-might/app/lib/classes/unitModule/Supply';
import { setIgnorePathfinding } from '@blue-might/app/lib/classes/unitModule/Pathfinding';

import baseGlb from './assets/sea_landing_port_supply_station.glb?url';

export type Options = LandingPortUnitOptions;
export interface Modules extends LandingPortUnitModules {
  supply: SupplyUnitModule;
}
export type ModuleList = LandingPortUnitModuleList & [typeof SupplyUnitModule];

export default class SeaLandingPortSupplyStation extends LandingPortUnit<
  Options,
  Modules,
  ModuleList
> {
  static override KEY = 'sea_landing_port_supply_station';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: unknown[] = []
  ) {
    moduleList.push(SupplyUnitModule);
    super(
      {
        ...options,
        name: 'Sea Landing Port Supply Station',
        moduleOptions: {
          ...options.moduleOptions,
          damage: {
            enabled: false
          },
          supply: {
            ...options.moduleOptions?.supply,
            radius: 0.5,
            sphereTarget: {
              name: 'base'
            }
          },
          collision: {
            ...options.moduleOptions?.collision,
            targets: [
              { name: 'base' },
              { name: 'additional_1', useChilds: false },
              { name: 'additional_2', useChilds: false },
              { name: 'plattform', useChilds: false },
              { name: 'stand', useChilds: false }
            ]
          }
        }
      },
      moduleList as ModuleList
    );
  }

  override async afterSetup(_context: SetupContext): Promise<void> {
    await super.afterSetup(_context);

    // this.subscription.add(
    //   this.modules.landingPort.observables.landedUnit.subscribe(unit =>
    //     this.modules.supply.setSupplyUnit(unit)
    //   )
    // );

    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const { object, animations } = await loadGltf(baseGlb);

    this.modules.animation.setAnimations(animations);

    setIgnorePathfinding(object.getObjectByName('base')!, true);
    setIgnorePathfinding(object.getObjectByName('plattform')!, true);

    object.traverse(child => {
      if (child instanceof Mesh || child instanceof SkinnedMesh) {
        child.receiveShadow = true;
        replaceColors(
          [
            [
              'primary',
              this.modules.faction.getFaction()?.colors[0] ?? 0xf2f2f2
            ],
            [
              'secondary',
              this.modules.faction.getFaction()?.colors[1] ?? 0xf2f2f2
            ]
          ],
          child
        );
      }
    });

    return object;
  }
}
