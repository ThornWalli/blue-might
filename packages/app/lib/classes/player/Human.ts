import Player, {
  type PlayerConstructorOptions,
  type PlayerModuleList,
  type PlayerModules
} from '../Player';
import ControlsModule from '../playerModule/Controls';

export interface Modules extends PlayerModules {
  controls: ControlsModule;
}

export type ModuleList = [typeof ControlsModule] & PlayerModuleList;

export class HumanPlayer extends Player<Modules, ModuleList> {
  constructor(options: PlayerConstructorOptions, moduleList: unknown[] = []) {
    moduleList.push(ControlsModule);
    super(options, moduleList);
  }
}
