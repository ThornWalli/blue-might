import { ReplaySubject } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import type { Meta } from '../../types/map';
import type { ModuleDebug } from '../Map';

interface Observables extends AppModuleObservables {
  meta$: ReplaySubject<Meta>;
  moduleDebug$: ReplaySubject<Partial<ModuleDebug>>;
}

interface State extends AppModuleState {
  meta: Meta | null;
  moduleDebug: Partial<ModuleDebug>;
}
export default class EditorMapSettingsAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorMapSettings';
  override state: State = {
    meta: null,
    moduleDebug: {}
  };

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.meta$ = new ReplaySubject<Meta>(1);
    this.observables.moduleDebug$ = new ReplaySubject<Partial<ModuleDebug>>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();
    this.subscription.add(
      this.app.modules.map.observables.map$.subscribe(map => {
        this.state.meta = map.getMeta();
        this.state.moduleDebug = map.getModuleDebug();
        this.observables.meta$.next(this.state.meta);
        this.observables.moduleDebug$.next(this.state.moduleDebug);
      })
    );
  }

  setMeta(meta: Meta) {
    this.app.modules.map.getMap()?.setMeta(meta);
    this.state.meta = meta;
    this.observables.meta$.next(meta);
  }

  setModuleDebug(moduleDebug: ModuleDebug) {
    this.app.modules.map.getMap()?.setModuleDebug(moduleDebug);
    this.state.moduleDebug = moduleDebug;
    this.observables.moduleDebug$.next(moduleDebug);
  }
}
