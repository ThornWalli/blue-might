import { ReplaySubject, Subject } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type Player from '../Player';
import type App from '../App';
import { HumanPlayer } from '../player/Human';

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
    this.observables.currentPlayer$ = new ReplaySubject<Player>(0);
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
}
