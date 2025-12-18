import { ReplaySubject } from 'rxjs';
import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type Unit from '../Unit';
import type App from '../App';

interface Observables extends AppModuleObservables {
  selectUnit$: ReplaySubject<Unit | null>;
}

interface State extends AppModuleState {
  selectedUnit: Unit | null;
}

export default class SelectionAppModule extends AppModule<State, Observables> {
  static override TYPE = 'selection';

  constructor(app: App) {
    super(app, {} as State);

    //#region state
    this.state.selectedUnit = null;
    //#endregion

    //#region observables
    this.observables.selectUnit$ = new ReplaySubject<Unit | null>(1);
    //#endregion
  }

  override destroy(): void {
    super.destroy();
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

    if (this.state.selectedUnit) {
      this.state.selectedUnit.modules.selection?.unselect();
      this.state.selectedUnit = null;
    }

    if (unit) {
      unit.modules.selection?.select();
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
  remove() {
    this.app.modules.map
      .getMap()
      ?.modules.units.remove(this.state.selectedUnit!);
    this.setSelectedUnit(null);
  }
}
