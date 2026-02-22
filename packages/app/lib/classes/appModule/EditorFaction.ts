import { ReplaySubject, switchMap } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import type { FactionDescription } from '../Faction';

interface Observables extends AppModuleObservables {
  factions$: ReplaySubject<FactionDescription[]>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends AppModuleState {}
export default class EditorFactionAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorFaction';

  get neutralFaction() {
    const map = this.app.modules.map.getMap();
    if (!map) throw new Error('Map not loaded');
    return map.modules.faction.neutralFaction;
  }

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.factions$ = new ReplaySubject<FactionDescription[]>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();

    this.subscription.add(
      this.app.modules.map.observables.map$
        .pipe(switchMap(map => map.modules.faction.observables.factions$))
        .subscribe(factions => this.observables.factions$.next(factions))
    );
  }
  getFactions(): FactionDescription[] {
    return this.app.modules.map.getMap()?.modules.faction.getFactions() ?? [];
  }

  setFactions(factions: FactionDescription[]) {
    this.app.modules.map.getMap()?.modules.faction.setFactions(factions);
  }
}
