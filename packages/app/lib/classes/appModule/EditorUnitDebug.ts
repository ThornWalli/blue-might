import { ReplaySubject } from 'rxjs';
import type { Units } from '@blue-might/units';

import type { App } from '../../types';
import type { AppModuleObservables, AppModuleState } from '../AppModule';
import AppModule from '../AppModule';
import type Unit from '../Unit';
import { EDITOR_MODE } from '../app/AppEditor';
import type { ModuleDebug } from '../Unit';

interface Observables extends AppModuleObservables {
  unit$: ReplaySubject<Units | null>;
  moduleDebug$: ReplaySubject<Partial<ModuleDebug>>;
}

interface State extends AppModuleState {
  unit: Units | null;
  moduleDebug: Partial<ModuleDebug>;
}

export default class EditorUnitDebugAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorUnitDebug';
  constructor(app: App) {
    super(app, {
      unit: null,
      moduleDebug: {}
    });
    //#region observables
    this.observables.unit$ = new ReplaySubject<Unit | null>(1);
    this.observables.moduleDebug$ = new ReplaySubject<Partial<ModuleDebug>>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();
    if ('editorUnits' in this.app.modules) {
      this.subscription.add(
        this.app.modules.editorUnits.observables.unit$.subscribe(u => {
          if ('isMode' in this.app && !this.app.isMode(EDITOR_MODE.DEFAULT))
            return;
          this.setUnit(u);
        })
      );
      //#endregion
    }
  }
  setUnit(unit: Unit | null) {
    if (this.state.unit === unit) return;
    this.state.unit = unit;
    this.state.moduleDebug = unit?.moduleDebug ?? {};
    this.observables.unit$.next(this.state.unit);
    this.observables.moduleDebug$.next(this.state.moduleDebug);
  }

  setModuleDebug(moduleDebug: Partial<ModuleDebug>) {
    this.state.moduleDebug = moduleDebug;
    this.state.unit?.setModuleDebug(moduleDebug);
    this.observables.moduleDebug$.next(this.state.moduleDebug);
  }
}
