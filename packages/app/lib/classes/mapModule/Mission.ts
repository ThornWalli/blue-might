import { ReplaySubject } from 'rxjs';

import MapModule, {
  type MapModuleObservables,
  type MapModuleOptions,
  type MapModuleState
} from '../MapModule';
import type Map from '../Map';
import type { MissionDescription, TargetType } from '../Mission';
import Mission from '../Mission';
import type Unit from '../Unit';

declare module '../Map' {
  interface ModuleDebug {
    mission: boolean;
  }
}

interface Observables extends MapModuleObservables {
  mission$: ReplaySubject<Mission | null>;
}

interface Options extends MapModuleOptions {
  mission?: MissionDescription;
}
interface State extends MapModuleState {
  mission: Mission | null;
}

export default class MissionModule extends MapModule<
  Options,
  State,
  Observables
> {
  static override TYPE = 'mission';

  constructor(map: Map, options: Options, state: State, debug: boolean) {
    super(
      map,
      {
        ...options
      },
      {
        ...state,
        mission: null
      },
      debug
    );
    //#region observables
    this.observables.mission$ = new ReplaySubject<Mission | null>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();

    if (this.options.mission) {
      this.setMission(this.options.mission);
    }
  }

  getMission() {
    return this.state.mission;
  }

  setMission(description: MissionDescription | null) {
    if (!description) {
      this.state.mission = null;
      this.observables.mission$.next(null);
      return;
    }

    const preparedDescription: MissionDescription = {
      ...description,
      targets: description.targets ?? []
    };

    this.state.mission = new Mission(preparedDescription);
    this.observables.mission$.next(this.state.mission);
  }

  addTarget(unit: Unit, targetType: TargetType) {
    if (!this.state.mission) return;

    const targets = this.state.mission
      .getTargets()
      .filter(target => target.unit !== unit.id);

    targets.push({
      unit: unit.id,
      type: targetType
    });

    this.state.mission.setTargets(targets);
  }

  override async getOptions() {
    return {
      mission: this.state.mission?.toDescription()
    };
  }
}
