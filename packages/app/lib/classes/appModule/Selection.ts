import { ReplaySubject, Subscription } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type Unit from '../Unit';
import type BaseApp from '../BaseApp';

interface Observables extends AppModuleObservables {
  selectUnit$: ReplaySubject<Unit | null>;
}

interface State extends AppModuleState {
  selectedUnit: Unit | null;
}

export default class SelectionAppModule extends AppModule<State, Observables> {
  static override TYPE = 'selection';
  private unitSubscription: Subscription = new Subscription();

  constructor(app: BaseApp) {
    super(app, {} as State);

    //#region state
    this.state.selectedUnit = null;
    //#endregion

    //#region observables
    this.observables.selectUnit$ = new ReplaySubject<Unit | null>(1);
    //#endregion
  }

  override destroy(): void {
    this.unitSubscription.unsubscribe();
  }

  getSelectedUnit() {
    return this.state.selectedUnit;
  }

  clearSelection() {
    this.state.selectedUnit = null;
    this.observables.selectUnit$.next(null);
  }
  setSelectedUnit(unit: Unit | null) {
    if (unit && !unit.modules.selection) {
      throw new Error('Unit does not have selection module');
    }

    // const player = this.app.modules.player.getCurrentPlayer()!;
    // const playerUnit = player?.state.unit;

    // if (!playerUnit) {
    //   this.state.selectedUnit = null;
    //   this.observables.selectUnit$.next(null);
    //   return;
    // }

    // if (!unit && playerUnit?.id === this.state.selectedUnit?.id) {
    //   return;
    // }

    this.unitSubscription.unsubscribe();
    this.unitSubscription = new Subscription();

    if (this.state.selectedUnit) {
      this.state.selectedUnit.modules.selection?.unselect();
      this.state.selectedUnit = null;
    }

    if (unit) {
      unit.modules.selection?.select();
      this.unitSubscription.add(
        unit.observables.destroyed$.subscribe(() => {
          if (this.state.selectedUnit?.id === unit.id) {
            this.setSelectedUnit(null);
          }
        })
      );
      this.state.selectedUnit = unit;
    } else {
      this.state.selectedUnit = null;
    }

    unit?.modules.selection?.select();
    this.observables.selectUnit$.next(unit);
  }

  /**
   * Hebt die selektierung auf.
   */
  apply() {
    this.setSelectedUnit(null);
  }
  abort() {
    this.setSelectedUnit(null);
  }
}
