import { ReplaySubject } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import type { AnimationLoopValue } from '../Renderer';

interface Observables extends AppModuleObservables {
  time$: ReplaySubject<number>;
  mapTime$: ReplaySubject<number>;
}

interface State extends AppModuleState {
  lastTime: number;
  mapOffsetTime: number;
}
export default class TimeAppModule extends AppModule<State, Observables> {
  static override TYPE = 'time';
  override state: State = {
    lastTime: 0,
    mapOffsetTime: 0
  };

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.time$ = new ReplaySubject<number>(1);
    this.observables.mapTime$ = new ReplaySubject<number>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();

    this.subscription.add(
      this.app.modules.map.observables.map$.subscribe(() => {
        this.state.mapOffsetTime = this.state.lastTime;
      })
    );
  }

  override update({ delta }: AnimationLoopValue) {
    this.setTime(this.getTime() + delta);
  }

  getTime() {
    return this.state.lastTime;
  }

  getMapTime() {
    return this.state.lastTime;
  }

  private setTime(time: number) {
    this.state.lastTime = time;
    this.observables.time$.next(time);
    this.observables.mapTime$.next(time - this.state.mapOffsetTime);
  }

  reset() {
    this.state = {
      lastTime: 0,
      mapOffsetTime: 0
    };
    this.observables.time$.next(0);
    this.observables.mapTime$.next(0);
  }
}
