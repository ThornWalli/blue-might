import PlayerAppModule from '../appModule/Player';
import BaseApp, {
  type AppConfig,
  type AppModuleList,
  type AppModules,
  type AppObservables,
  type AppState
} from '../BaseApp';
import type Renderer from '../Renderer';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppPlaygroundObservables extends AppObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppPlaygroundState extends AppState {}

interface AppPlaygroundModules extends AppModules {
  player: PlayerAppModule;
}

type AppPlaygroundModuleList = AppModuleList & (typeof PlayerAppModule)[];

export default class AppPlayground extends BaseApp<
  AppPlaygroundState,
  AppPlaygroundObservables,
  AppPlaygroundModules
> {
  constructor(
    config: AppConfig,
    renderer: Renderer,
    state: Partial<AppPlaygroundState> = {},
    modules: AppPlaygroundModuleList = []
  ) {
    modules.push(PlayerAppModule);
    super(config, renderer, state, modules);
  }

  override async setup() {
    await super.setup();

    this.subscription.add(
      this.modules.map.observables.beforeRestart$.subscribe(() => {
        const player = this.modules.player.getCurrentPlayer();
        player.reset();
      })
    );

    this.subscription.add(
      this.modules.map.observables.enterMap$.subscribe(map => {
        const playerOptions = map.getPlayerOptions();
        const faction = map.modules.faction.getFactionById(
          playerOptions.faction
        );
        if (faction) {
          this.modules.player
            .getCurrentPlayer()
            .modules.faction.setFaction(faction);
        } else {
          console.warn('Faction not found:', playerOptions.faction);
        }
      })
    );
  }

  // override async enterMap(description: MapDescription) {
  //   const map = await super.enterMap(description);
  //   const playerOptions = map.getPlayerOptions();
  //   const faction = map.modules.faction.getFactionById(playerOptions.faction);
  //   if (faction) {
  //     this.modules.player
  //       .getCurrentPlayer()
  //       .modules.faction.setFaction(faction);
  //   } else {
  //     console.warn('Faction not found:', playerOptions.faction);
  //   }
  //   return map;
  // }
  // override beforeRestartMap(): void {
  //   const player = this.modules.player.getCurrentPlayer();
  //   player.reset();
  // }
}
