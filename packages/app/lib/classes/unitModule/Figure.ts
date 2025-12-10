import UnitModule, {
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';

type Options = UnitModuleOptions;
type State = UnitModuleState;

export default class FigureUnitModule extends UnitModule<Options, State> {
  static override TYPE = 'figure';
}
