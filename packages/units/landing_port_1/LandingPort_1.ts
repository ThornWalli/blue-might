import type { Texture } from 'three';
import { Mesh, MeshLambertMaterial, NearestFilter, PlaneGeometry } from 'three';
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

    const mesh = new Mesh(
      new PlaneGeometry(1, 1),
      new MeshLambertMaterial({
        // color: 0x00ff00,
        map: texture,
        transparent: true,
        wireframe: false
      })
    );

    mesh.rotateX(-Math.PI / 2);
    mesh.position.set(0, 0.001, 0);

    return mesh;
  }
}
