import { filter, ReplaySubject } from 'rxjs';
import { Soldat_1, type Units } from '@blue-might/units';
import { Vector3 } from 'three';

import type {
  PlayerModuleObservables,
  PlayerModuleOptions,
  PlayerModuleState
} from '../PlayerModule';
import PlayerModule from '../PlayerModule';
import type Player from '../Player';
import type FigureUnit from '../unit/Figure';
import { isFigure } from '../../utils/unit';

import { ControlAction } from './Controls';

interface Observables extends PlayerModuleObservables {
  unit$: ReplaySubject<Units | null>;
  currentUnit$: ReplaySubject<Units>;
}

type Options = PlayerModuleOptions;

interface State extends PlayerModuleState {
  unit: Units | null;
  figureUnit: FigureUnit | null;
}

export default class VehiclePlayerModule extends PlayerModule<
  Options,
  State,
  Observables
> {
  hasVehicle() {
    return this.state.unit !== null;
  }
  static override TYPE = 'vehicle';

  constructor(player: Player, options: Options, state: State, debug?: boolean) {
    super(
      player,
      options,
      {
        ...state,
        unit: state.unit ?? null,
        figureUnit: state.figureUnit ?? null
      },
      debug
    );

    //#region observables
    this.observables.unit$ = new ReplaySubject<Units | null>(1);
    this.observables.currentUnit$ = new ReplaySubject<Units>(1);
    //#endregion
  }

  createFigureUnit({ faction }: { faction: string }) {
    const figureUnit = new Soldat_1();
    figureUnit.modules.player.setPlayer(this.player);
    figureUnit.modules.faction.setFaction(faction);
    return figureUnit;
  }

  override async setup() {
    await super.setup();

    this.subscription.add(
      this.player.modules.faction.observables.faction$
        .pipe(filter(Boolean))
        .subscribe(faction => {
          this.state.figureUnit = this.createFigureUnit({
            faction: faction?.id
          });
        })
    );
    this.subscription.add(
      this.player.modules.controls.observables.controls$.subscribe(controls => {
        if (controls[ControlAction.VEHICLE_SWITCH]) {
          this.toggleUnit();
        }
      })
    );
  }

  toggleUnit() {
    if (this.state.unit && this.state.unit !== this.state.figureUnit) {
      this.leaveUnit();
    } else {
      const unit =
        (this.player.app.modules.map
          .getMap()
          ?.modules.units.getUnitsInRadius(
            this.getCurrentUnit().getPosition(),
            1
          )
          .filter(
            ({ unit }) =>
              'player' in unit.modules &&
              !isFigure(unit) &&
              unit !== this.state.figureUnit
          )
          .shift()?.unit as Units) ?? null;
      if (unit) {
        this.enterUnit(unit);
      }
    }
  }

  enterUnit(unit: Units) {
    if (this.state.unit && this.state.unit !== this.state.figureUnit)
      throw new Error('Already in a vehicle unit');

    const lastUnit = this.getCurrentUnit();

    this.setVehicleUnit(unit);

    // remove Figure from map
    if (lastUnit && lastUnit === this.state.figureUnit) {
      const map = this.player.app.modules.map.getMap()!;
      map.modules.units.remove(lastUnit);
    }
  }

  async leaveUnit() {
    if (!this.state.unit) throw new Error('No vehicle unit to exit from');

    // can leave?
    if (
      'player' in this.state.unit.modules &&
      !this.state.unit.modules.player.canLeave()
    )
      return;

    const map = this.player.app.modules.map.getMap()!;
    // Neben unit positionieren, gefühlt ausstieg. Leiht versetzt.
    const t = this.state.figureUnit!;
    t.setPosition(
      this.state.unit
        .getPosition()
        .clone()
        .addScaledVector(new Vector3(0.5, 0, 0), 1)
    );
    const unit = await map.modules.units.add(t)!;
    this.state.figureUnit = unit;
    this.setVehicleUnit(null);
  }

  getCurrentUnit() {
    return this.state.unit || (this.state.figureUnit as Units);
  }

  getFigureUnit() {
    return this.state.figureUnit;
  }

  getUnit() {
    return this.state.unit;
  }

  setVehicleUnit(vehicle: Units | null) {
    if (this.state.unit === vehicle) return;
    const last = this.state.unit;

    if (last && 'player' in last.modules) {
      last.modules.player.setPlayer(null);
    }
    if (!vehicle) {
      this.state.unit = null;
      this.observables.unit$.next(null);
      const currentUnit = this.getCurrentUnit();
      if (currentUnit) {
        this.observables.currentUnit$.next(currentUnit);
      }
      return;
    }
    if (vehicle?.modules && 'player' in vehicle.modules) {
      this.state.unit = vehicle;

      vehicle?.modules.player.setPlayer(this.player);

      this.observables.unit$.next(vehicle);
      const currentUnit = this.getCurrentUnit();
      if (currentUnit) {
        this.observables.currentUnit$.next(currentUnit);
      }
    } else {
      console.log(
        'Vehicle is null or has no player module, setting to null',
        vehicle
      );
      throw new Error('Unit is not controllable');
    }
  }
}
