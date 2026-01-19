import {
  combineLatest,
  EMPTY,
  filter,
  map,
  ReplaySubject,
  Subject,
  switchMap
} from 'rxjs';
import { Vector3 } from 'three';
import * as units from '@blue-might/units';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type Player from '../Player';
import type App from '../App';
import { HumanPlayer } from '../player/Human';
import { isAirVehicle, isGroundVehicle } from '../../utils/unit';
import type MovableUnit from '../unit/Movable';
import type { UnitDescription } from '../Unit';

const unitMap = new Map(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.values(units).map(unit => [unit.KEY, unit] as [string, any])
);

interface Observables extends AppModuleObservables {
  currentPlayer$: ReplaySubject<Player>;
  addPlayer$: Subject<Player>;
  removePlayer$: Subject<Player>;
}

interface State extends AppModuleState {
  currentPlayer?: Player;
  players: Player[];
}
export default class PlayerAppModule extends AppModule<State, Observables> {
  static override TYPE = 'player';

  constructor(app: App) {
    super(app, { players: [] });
    //#region observables
    this.observables.currentPlayer$ = new ReplaySubject<Player>(1);
    this.observables.addPlayer$ = new Subject<Player>();
    this.observables.removePlayer$ = new Subject<Player>();
    //#endregion
  }

  override destroy() {
    this.state.players.forEach(player => player.destroy());

    super.destroy();
  }

  getPlayerById(id: string) {
    return this.state.players.find(player => player.id === id);
  }

  getCurrentPlayer() {
    if (!this.state.currentPlayer) {
      throw new Error('Current player is not set');
    }
    return this.state.currentPlayer;
  }

  setCurrentPlayer(player: Player) {
    if (this.state.currentPlayer === player) return;
    this.state.currentPlayer = player;
    this.observables.currentPlayer$.next(player);
  }

  getPlayers() {
    return this.state.players;
  }

  async addPlayer(player: Player) {
    this.state.players.push(player);
    if (player instanceof HumanPlayer) {
      this.setCurrentPlayer(player);
    }
    await player.setup();
    this.observables.addPlayer$.next(player);
    return player;
  }

  removePlayer(player: Player) {
    this.state.players = this.state.players.filter(p => p.id !== player.id);
    this.observables.removePlayer$.next(player);
    player.destroy();
  }

  override async setup() {
    await super.setup();

    const app = this.app;

    /**
     * Setup player life on unit destroyed
     */
    this.subscription.add(
      this.observables.currentPlayer$
        .pipe(
          switchMap(
            player =>
              player?.modules.vehicle.observables.unit$.pipe(
                map(unit => unit && { unit, player })
              ) ?? EMPTY
          ),
          filter(Boolean)
        )
        .subscribe(({ unit, player }) => {
          this.subscription.add(
            unit.modules.damage.observables.destroyed$.subscribe(() => {
              player.modules.life.removeLife();
            })
          );
        })
    );

    /**
     * Setup player unit when map and player are ready
     */
    this.subscription.add(
      combineLatest([
        app.modules.map.observables.map$,
        this.observables.currentPlayer$
      ])
        .pipe(filter(([map, player]) => !!map && !!player))
        .subscribe(async () => {
          this.setupPlayerUnit();
        })
    );
  }

  private async setupPlayerUnit() {
    const player = this.getCurrentPlayer();
    const map = this.app.modules.map.getMap()!;
    const description = map.playerOptions.unit as unknown as UnitDescription;
    const unit = new (await getUnitClass<typeof MovableUnit>(
      map.playerOptions.unit.key
    ))({
      ...description,
      position: map.playerOptions.position.clone(),
      rotation: map.playerOptions.rotation?.clone(),
      moduleOptions: {
        faction: {
          faction: player.modules.faction.getFaction()
        }
      }
    });
    player.modules.vehicle.setUnit(unit);
    map.modules.units.add(unit);

    return unit;
  }

  /**
   * Cleans up the player's start position (e.g., removes temporary objects)
   */
  cleanUpStartPosition() {
    const player = this.getCurrentPlayer();
    const map = this.app.modules.map.getMap()!;
    const startPosition = map.playerOptions.position;

    const unitsByRadius = map.modules.units.getUnitsInRadius(
      new Vector3(startPosition.x, 0, startPosition.y),
      1
    );

    unitsByRadius
      .filter(
        unit =>
          player.modules.vehicle.getUnit() === unit ||
          isGroundVehicle(unit) ||
          isAirVehicle(unit)
      )
      .forEach(unit => {
        unit.destroy();
      });
  }

  async respawnPlayer() {
    await this.cleanUpStartPosition();
    await this.setupPlayerUnit();
  }
}

async function getUnitClass<C>(key: string) {
  return (await unitMap.get(key as keyof typeof units)) as unknown as C;
}
