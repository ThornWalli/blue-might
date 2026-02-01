import { ReplaySubject } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import type { Meta } from '../Map';

interface Observables extends AppModuleObservables {
  meta$: ReplaySubject<Meta>;
}

interface State extends AppModuleState {
  meta: Meta | null;
}
export default class EditorMapSettingsAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorMapSettings';
  override state: State = {
    meta: null
  };

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.meta$ = new ReplaySubject<Meta>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();
    this.subscription.add(
      this.app.modules.map.observables.map$.subscribe(map => {
        this.state.meta = map.getMeta();
      })
    );
  }

  setMeta(meta: Meta) {
    this.app.modules.map.getMap()?.setMeta(meta);
    this.state.meta = meta;
    this.observables.meta$.next(meta);
  }
}
