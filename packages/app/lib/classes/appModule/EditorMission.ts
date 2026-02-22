import { EMPTY, ReplaySubject, switchMap } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import type Mission from '../Mission';
import type { MissionDescription, TargetType } from '../Mission';
import type Unit from '../Unit';

interface Observables extends AppModuleObservables {
  mission$: ReplaySubject<Mission | null>;
  unit$: ReplaySubject<Unit | null>;
  targetType$: ReplaySubject<TargetType>;
}

interface State extends AppModuleState {
  unit: Unit | null;
  mission: Mission | null;
}
export default class EditorMissionAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorMission';

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.targetType$ = new ReplaySubject<TargetType>(1);
    this.observables.unit$ = new ReplaySubject<Unit | null>(1);
    this.observables.mission$ = new ReplaySubject<Mission | null>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();

    if ('editorUnits' in this.app.modules) {
      const unit$ = this.app.modules.editorUnits.observables.unit$;
      this.subscription.add(unit$.subscribe(u => this.setUnit(u)));
    }

    this.subscription.add(
      this.app.modules.map.observables.map$
        .pipe(
          switchMap(map => map?.modules.mission.observables.mission$ ?? EMPTY)
        )
        .subscribe(m => this.setMission(m))
    );
  }

  createMission() {
    const mission: MissionDescription = {
      name: 'New Mission',
      objective: '',
      location: '',
      situationReport: '',
      missionObjectives: ''
    };
    this.missionModule?.setMission(mission);
  }
  updateMission(value: MissionDescription) {
    this.state.mission?.setName(value.name);
    this.state.mission?.setObjective(value.objective);
    this.state.mission?.setLocation(value.location);
    this.state.mission?.setSituationReport(value.situationReport);
    this.state.mission?.setMissionObjectives(value.missionObjectives);
  }
  removeMission() {
    this.missionModule?.setMission(null);
  }

  removeTarget(targetId: string) {
    const mission = this.missionModule?.getMission();
    if (!mission) return;

    mission.setTargets(mission.getTargets().filter(t => t.unit !== targetId));

    this.observables.mission$.next(mission);
  }

  private get missionModule() {
    return this.app.modules.map.getMap()?.modules.mission;
  }

  public getMission() {
    return this.state.mission;
  }

  private setMission(mission: Mission | null) {
    this.state.mission = mission;
    this.observables.mission$.next(mission);
  }

  private setUnit(unit: Unit | null) {
    if (!this.state.mission) return;
    this.state.unit = unit;
    if (unit) {
      const target = this.state.mission.getTargetTypeFromUnit(unit.id)!;
      this.observables.targetType$.next(target);
    }
    this.observables.unit$.next(unit);
  }

  setTargetType(targetType: TargetType) {
    const map = this.app.modules.map.getMap();
    if (!map || !this.state.mission || !this.state.unit) return;
    map.modules.mission.addTarget(this.state.unit, targetType);
    this.observables.targetType$.next(targetType);
  }
}
