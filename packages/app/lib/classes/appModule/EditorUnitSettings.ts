import { distinctUntilChanged, ReplaySubject } from 'rxjs';
import type { Units } from '@blue-might/units';

import type { App } from '../../types';
import type { AppModuleObservables, AppModuleState } from '../AppModule';
import AppModule from '../AppModule';
import type Unit from '../Unit';
import { EDITOR_MODE } from '../app/AppEditor';
import type { FactionIdentifier } from '../Faction';

interface Observables extends AppModuleObservables {
  unit$: ReplaySubject<Units | null>;
}

interface State extends AppModuleState {
  unit: Units | null;
}

export default class EditorUnitSettingsAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorUnitSettings';
  constructor(app: App) {
    super(app, {
      unit: null
    });
    //#region observables
    this.observables.unit$ = new ReplaySubject<Unit | null>(1);
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
      if ('mode$' in this.app.observables) {
        this.subscription.add(
          this.app.observables.mode$
            .pipe(distinctUntilChanged())
            .subscribe(mode => {
              if (mode === EDITOR_MODE.UNITS) {
                this.setUnit(null);
              }
            })
        );
      }
    }
  }
  setUnit(unit: Unit | null) {
    if (this.state.unit === unit) return;
    this.state.unit = unit;
    this.observables.unit$.next(this.state.unit);
  }

  setFaction(factionId: FactionIdentifier | null) {
    this.state.unit?.modules.faction.setFaction(factionId);
  }

  setInitialDamage(damage: number) {
    if (!this.state.unit) return;
    this.state.unit.modules.damage.setInitialDamage(damage);
  }

  //#region figure
  setNeedRescue(needRescue: boolean) {
    if (this.state.unit && 'figure' in this.state.unit.modules) {
      this.state.unit.modules.figure.setNeedRescue(needRescue);
    }
  }
  //#endregion
}
