import type App from '../App';
import Player, {
  type PlayerConstructorOptions,
  type PlayerModuleList,
  type PlayerModules
} from '../Player';

export type Modules = PlayerModules;

export type ModuleList = PlayerModuleList;

export class HumanPlayer extends Player<Modules, ModuleList> {
  constructor(
    app: App,
    options: PlayerConstructorOptions,
    moduleList: ModuleList[] = []
  ) {
    super(app, options, moduleList);
  }
}
