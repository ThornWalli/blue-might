import { Object3D } from 'three';
import UnitModule, {
  type UnitModuleOptions,
  type UnitModuleSetupContext,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';

type Options = UnitModuleOptions;
type State = UnitModuleState;

export default class LandingPortUnitModule extends UnitModule<Options, State> {
  static override TYPE = 'landing_port';

  root: Object3D;

  constructor(unit: Unit, options: Options, state: State, debug: boolean) {
    super(unit, options, state, debug);

    this.root = new Object3D();
  }

  override async setupMesh(context: UnitModuleSetupContext) {
    const mesh = await super.setupMesh(context);
    this.root.add(mesh);
    return this.root;
  }
}
