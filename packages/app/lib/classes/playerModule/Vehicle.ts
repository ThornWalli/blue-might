import { filter, ReplaySubject } from 'rxjs';
import { Soldat_1, type VehicleUnits } from '@blue-might/units';
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
  unit$: ReplaySubject<VehicleUnits | null>;
}

type Options = PlayerModuleOptions;

type U = VehicleUnits;

interface State extends PlayerModuleState {
  unit: U | null;
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
    this.observables.unit$ = new ReplaySubject<VehicleUnits | null>();
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
    if (this.state.unit !== this.state.figureUnit) {
      this.leaveUnit();
    } else {
      const unit =
        (this.player.app.modules.map
          .getMap()
          ?.modules.units.getUnitsInRadius(this.getUnit()!.getPosition(), 1)
          .filter(
            unit =>
              'player' in unit.modules &&
              !isFigure(unit) &&
              unit !== this.state.figureUnit
          )
          .shift() as U) ?? null;
      this.enterUnit(unit);
    }
  }

  enterUnit(unit: U) {
    if (this.state.unit !== this.state.figureUnit)
      throw new Error('Already in a vehicle unit');

    const lastUnit = this.state.unit;

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
    if (!this.state.unit.modules.player.canLeave()) return;

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

  getActiveUnit() {
    return this.state.unit || this.state.figureUnit;
  }

  getFigureUnit() {
    return this.state.figureUnit;
  }

  getUnit() {
    return this.state.unit;
  }

  setVehicleUnit(vehicle: U | VehicleUnits | null) {
    if (this.state.unit === vehicle) return;

    if (vehicle?.modules && 'player' in vehicle.modules) {
      const last = this.state.unit;
      last?.modules.player.setPlayer(null);

      this.state.unit = vehicle as U;

      vehicle?.modules.player.setPlayer(this.player);

      this.observables.unit$.next(vehicle);
    } else {
      console.log(
        'Vehicle is null or has no player module, setting to null',
        vehicle
      );
      throw new Error('Unit is not controllable');
    }
  }
}
