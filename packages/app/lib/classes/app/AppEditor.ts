import { ReplaySubject } from 'rxjs';

import EditorFactionAppModule from '../appModule/EditorFaction';
import EditorGridAppModule from '../appModule/EditorGrid';
import EditorPatrolAppModule from '../appModule/EditorPatrol';
import EditorUnitsAppModule from '../appModule/EditorUnits';
import type {
  AppConfig,
  AppModuleList,
  AppModules,
  AppObservables,
  AppState
} from '../BaseApp';
import BaseApp from '../BaseApp';
import type Renderer from '../Renderer';
import EditorPlayerAppModule from '../appModule/EditorPlayer';
import EditorSurfaceAppModule from '../appModule/EditorSurface';
import EditorUnitSettingsAppModule from '../appModule/EditorUnitSettings';
import EditorMapSettingsAppModule from '../appModule/EditorMapSettings';
import EditorUnitDebugAppModule from '../appModule/EditorUnitDebug';
import EditorMissionAppModule from '../appModule/EditorMission';

interface AppEditorObservables extends AppObservables {
  mode$: ReplaySubject<EDITOR_MODE>;
}

interface AppEditorState extends AppState {
  mode: EDITOR_MODE;
}

interface AppEditorModules extends AppModules {
  editorMapSettings: EditorMapSettingsAppModule;
  editorGrid: EditorGridAppModule;
  editorSurface: EditorSurfaceAppModule;
  editorUnits: EditorUnitsAppModule;
  editorPatrol: EditorPatrolAppModule;
  editorFaction: EditorFactionAppModule;
  editorPlayer: EditorPlayerAppModule;
  editorUnitSettings: EditorUnitSettingsAppModule;
  editorUnitDebug: EditorUnitDebugAppModule;
  editorMission: EditorMissionAppModule;
}

type AppEditorModuleList = AppModuleList &
  (
    | typeof EditorMapSettingsAppModule
    | typeof EditorGridAppModule
    | typeof EditorSurfaceAppModule
    | typeof EditorUnitsAppModule
    | typeof EditorPatrolAppModule
    | typeof EditorFactionAppModule
    | typeof EditorPlayerAppModule
    | typeof EditorUnitSettingsAppModule
    | typeof EditorUnitDebugAppModule
    | typeof EditorMissionAppModule
  )[];

export enum EDITOR_MODE {
  DEFAULT = 'default',
  UNITS = 'units',
  PATROL = 'patrol',
  PLAYER = 'player'
}

export default class AppEditor extends BaseApp<
  AppEditorState,
  AppEditorObservables,
  AppEditorModules
> {
  constructor(
    config: AppConfig,
    renderer: Renderer,
    state: Partial<AppEditorState> = {},
    modules: AppEditorModuleList = []
  ) {
    modules.push(
      EditorMapSettingsAppModule,
      EditorGridAppModule,
      EditorSurfaceAppModule,
      EditorUnitsAppModule,
      EditorPatrolAppModule,
      EditorFactionAppModule,
      EditorPlayerAppModule,
      EditorUnitSettingsAppModule,
      EditorUnitDebugAppModule,
      EditorMissionAppModule
    );
    super(
      config,
      renderer,
      {
        ...state,
        mode: EDITOR_MODE.DEFAULT
      },
      modules
    );
    //#region observables
    this.observables.mode$ = new ReplaySubject<EDITOR_MODE>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();
  }

  getMode() {
    return this.state.mode;
  }

  isMode(mode: EDITOR_MODE) {
    return this.state.mode === mode;
  }

  setMode(mode: EDITOR_MODE) {
    if (this.state.mode === mode) return;
    this.state.mode = mode;
    this.observables.mode$.next(mode);
  }
}
