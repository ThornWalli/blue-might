import type { Texture } from 'three';
import {
  BoxGeometry,
  Mesh,
  MeshLambertMaterial,
  NearestFilter,
  Object3D,
  PlaneGeometry
} from 'three';
import type {
  SetupContext,
  UnitConstructorOptions
} from '@blue-might/app/lib/classes/Unit';
import LandingPortUnit, {
  type LandingPortUnitModuleList,
  type LandingPortUnitModules,
  type LandingPortUnitOptions
} from '@blue-might/app/lib/classes/unit/LandingPort';
import assetLoader from '@blue-might/app/services/assetLoader';

import baseTexture from './texture.png?url';
import { LOADER } from '@blue-might/app/lib/classes/AssetLoader';

export type Options = LandingPortUnitOptions;
export type Modules = LandingPortUnitModules;
export type ModuleList = LandingPortUnitModuleList;

export default class LandingPort_1 extends LandingPortUnit {
  static override KEY = 'landing_port_1';
  constructor(
    options: Omit<UnitConstructorOptions<Options>, 'name'> = {},
    moduleList: ModuleList = [] as unknown as ModuleList
  ) {
    super(
      {
        ...options,
        name: 'Landing Port 1'
      },
      moduleList as ModuleList
    );
  }

  override afterSetup(_context: SetupContext): void {
    this.setMaterialReady();
  }

  override async createMesh(_context: SetupContext) {
    const texture = await assetLoader.add<Texture<ImageBitmap>>({
      value: baseTexture,
      loader: LOADER.TEXTURE
    });
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;

    const height = 0.025;
    const boxMesh = new Mesh(
      new BoxGeometry(1, height, 1),
      new MeshLambertMaterial({})
    );
    boxMesh.receiveShadow = true;
    boxMesh.position.set(0, height / 2, 0);

    const planeMesh = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshLambertMaterial({
        map: texture,
        transparent: true
      })
    );
    planeMesh.renderOrder = 100;
    planeMesh.rotateX(-Math.PI / 2);
    planeMesh.position.set(0, height + 0.001, 0);

    const obj = new Object3D();

    obj.add(boxMesh);
    obj.add(planeMesh);

    return obj;
  }
}
