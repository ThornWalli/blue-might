import { Object3D } from 'three';
import { ReplaySubject } from 'rxjs';

import type Player from '../Player';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleSetupContext,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';

declare module '../Unit' {
  interface ModuleStates {
    player: Partial<PlayerUnitModuleState>;
  }
  interface ModuleOptions {
    player: Partial<PlayerUnitModuleOptions>;
  }
  interface ModuleDebug {
    player: boolean;
  }
}

interface Observables extends UnitModuleObservables {
  player$: ReplaySubject<Player | null>;
}
export type PlayerUnitModuleOptions = UnitModuleOptions;
export type PlayerUnitModuleState = UnitModuleState;

export default class PlayerUnitModule extends UnitModule<
  PlayerUnitModuleOptions,
  PlayerUnitModuleState,
  Observables
> {
  hasPlayer() {
    return this._player !== null;
  }
  static override TYPE = 'player';

  root: Object3D;
  private _player: Player | null = null;

  constructor(
    unit: Unit,
    options: PlayerUnitModuleOptions,
    state: PlayerUnitModuleState,
    debug: boolean
  ) {
    super(unit, options, state, debug);

    //#region observables
    this.observables.player$ = new ReplaySubject<Player | null>(1);
    this.observables.player$.next(this._player);
    //#endregion

    this.root = new Object3D();
  }

  override async setupMesh(context: UnitModuleSetupContext) {
    const mesh = await super.setupMesh(context);
    this.root.add(mesh);
    return this.root;
  }

  getPlayer() {
    return this._player;
  }
  setPlayer(player: Player | null) {
    this._player = player;
    this.observables.player$.next(this._player);
  }

  isCurrentPlayer() {
    return this._player?.equal(
      this.getUnit()?.getMap()?.app.modules.player.getCurrentPlayer()
    );
  }
}
