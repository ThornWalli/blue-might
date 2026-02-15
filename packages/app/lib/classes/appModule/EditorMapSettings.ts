import { ReplaySubject } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import type { FogOptions, Meta } from '../../types/map';
import type { ModuleDebug } from '../Map';

interface Observables extends AppModuleObservables {
  meta$: ReplaySubject<Meta>;
  fogOptions$: ReplaySubject<FogOptions>;
  moduleDebug$: ReplaySubject<Partial<ModuleDebug>>;
}

interface State extends AppModuleState {
  meta: Meta | null;
  fogOptions?: FogOptions | null;
  moduleDebug: Partial<ModuleDebug>;
}
export default class EditorMapSettingsAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorMapSettings';
  override state: State = {
    meta: null,
    fogOptions: null,
    moduleDebug: {}
  };

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.meta$ = new ReplaySubject<Meta>(1);
    this.observables.fogOptions$ = new ReplaySubject<FogOptions>(1);
    this.observables.moduleDebug$ = new ReplaySubject<Partial<ModuleDebug>>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();
    this.subscription.add(
      this.app.modules.map.observables.map$.subscribe(map => {
        this.state.meta = map.getMeta();
        this.observables.meta$.next(this.state.meta);

        this.state.fogOptions = map.state.fogOptions;
        this.observables.fogOptions$.next(this.state.fogOptions);

        this.state.moduleDebug = map.getModuleDebug();
        this.observables.moduleDebug$.next(this.state.moduleDebug);
      })
    );
  }

  setMeta(meta: Meta) {
    this.app.modules.map.getMap()?.setMeta(meta);
    this.state.meta = meta;
    this.observables.meta$.next(meta);
  }

  setFogOptions(fogOptions: FogOptions) {
    this.app.modules.map.getMap()?.setFogOptions(fogOptions);
    this.state.fogOptions = fogOptions;
    this.observables.fogOptions$.next(fogOptions);
  }

  setModuleDebug(moduleDebug: ModuleDebug) {
    this.app.modules.map.getMap()?.setModuleDebug(moduleDebug);
    this.state.moduleDebug = moduleDebug;
    this.observables.moduleDebug$.next(moduleDebug);
  }
}
