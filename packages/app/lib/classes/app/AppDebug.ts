import PlayerAppModule from '../appModule/Player';
import BaseApp, {
  type AppConfig,
  type AppModuleList,
  type AppModules,
  type AppObservables,
  type AppState
} from '../BaseApp';
import type Renderer from '../Renderer';
import DebugAppModule from '../appModule/Debug';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppDebugObservables extends AppObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppDebugState extends AppState {}

interface AppDebugModules extends AppModules {
  player: PlayerAppModule;
  debug: DebugAppModule;
}

type AppDebugModuleList = AppModuleList &
  (typeof PlayerAppModule | typeof DebugAppModule)[];

export default class AppDebug extends BaseApp<
  AppDebugState,
  AppDebugObservables,
  AppDebugModules
> {
  constructor(
    config: AppConfig,
    renderer: Renderer,
    state: Partial<AppDebugState> = {},
    modules: AppDebugModuleList = []
  ) {
    modules.push(PlayerAppModule, DebugAppModule);
    super(config, renderer, state, modules);
  }
}
