import { ReplaySubject } from 'rxjs';

import type {
  PlayerModuleObservables,
  PlayerModuleOptions,
  PlayerModuleState
} from '../PlayerModule';
import PlayerModule from '../PlayerModule';
import type Player from '../Player';

interface Observables extends PlayerModuleObservables {
  lifes$: ReplaySubject<number>;
}

type Options = PlayerModuleOptions;

interface State extends PlayerModuleState {
  lifes: number;
}

export default class LifePlayerModule extends PlayerModule<
  Options,
  State,
  Observables
> {
  static override TYPE = 'life';

  constructor(player: Player, options: Options, state: State, debug?: boolean) {
    super(player, options, { ...state, lifes: state.lifes ?? 1 }, debug);

    //#region observables
    this.observables.lifes$ = new ReplaySubject<number>();
    this.observables.lifes$.next(this.state.lifes);
    //#endregion
  }

  getLifes() {
    return this.state.lifes;
  }

  setLifes(lifes: number) {
    if (this.state.lifes === lifes) return;
    this.state.lifes = lifes;
    this.observables.lifes$.next(lifes);
  }

  removeLife() {
    this.state.lifes = Math.max(0, this.state.lifes - 1);
    this.observables.lifes$.next(this.state.lifes);
  }
  hasLifes() {
    return this.state.lifes > 0;
  }

  isGameOver() {
    return this.state.lifes === 0;
  }
}
