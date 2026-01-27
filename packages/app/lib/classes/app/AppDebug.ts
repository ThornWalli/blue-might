import { EMPTY, filter, map, switchMap } from 'rxjs';

import type PlayerAppModule from '../appModule/Player';
import BaseApp, {
  type AppConfig,
  type AppModuleList,
  type AppModules,
  type AppObservables,
  type AppState
} from '../BaseApp';
import type Renderer from '../Renderer';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppDebugObservables extends AppObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppDebugState extends AppState {}

interface AppPlaygroundModules extends AppModules {
  player: PlayerAppModule;
}

export default class AppDebug extends BaseApp<
  AppDebugState,
  AppDebugObservables,
  AppPlaygroundModules
> {
  constructor(
    config: AppConfig,
    renderer: Renderer,
    state: Partial<AppDebugState> = {},
    modules: AppModuleList = []
  ) {
    super(config, renderer, state, modules);

    this.subscription.add(
      this.modules.player.observables.currentPlayer$
        .pipe(
          switchMap(
            player => player.modules.vehicle?.observables.unit$ ?? EMPTY
          ),
          filter(Boolean),
          switchMap(
            vehicle =>
              vehicle?.observables.ready$.pipe(map(() => vehicle)) ?? EMPTY
          )
        )
        .subscribe(vehicle => {
          this.modules.unitFocus.followFocus(vehicle);
        })
    );
  }
}
