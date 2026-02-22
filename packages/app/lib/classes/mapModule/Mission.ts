import { ReplaySubject, Subscription } from 'rxjs';
import type { Units } from '@blue-might/units';

import MapModule, {
  type MapModuleObservables,
  type MapModuleOptions,
  type MapModuleState
} from '../MapModule';
import type Map from '../Map';
import type { MissionDescription, TargetType } from '../Mission';
import Mission from '../Mission';

declare module '../Map' {
  interface ModuleDebug {
    mission: boolean;
  }
}

interface Observables extends MapModuleObservables {
  mission$: ReplaySubject<Mission | null>;
  complete$: ReplaySubject<void>;
}

interface Options extends MapModuleOptions {
  mission?: MissionDescription;
}
interface State extends MapModuleState {
  mission: Mission | null;
  complete: boolean;
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
        mission: null,
        complete: false
      },
      debug
    );
    //#region observables
    this.observables.mission$ = new ReplaySubject<Mission | null>(1);
    this.observables.complete$ = new ReplaySubject<void>();
    //#endregion
  }

  override async afterSetup() {
    await super.afterSetup();

    this.subscription.add(
      this.map.modules.units.observables.ready$.subscribe(() => {
        if (this.options.mission) {
          this.setMission(this.options.mission);
        }
      })
    );
  }

  getMission() {
    return this.state.mission;
  }

  private registerTargetUnits(type: TargetType, unit: Units) {
    switch (type) {
      case 'rescue':
        if ('figure' in unit.modules) {
          this.targetSubscription?.add(
            unit.modules.figure.observables.rescueComplete$.subscribe(() => {
              this.checkStatus();
            })
          );
        }
        break;
      case 'attack':
        this.targetSubscription?.add(
          unit.modules.damage.observables.destroyed$.subscribe(() => {
            this.checkStatus();
          })
        );
        break;
    }
  }

  checkStatus() {
    const mission = this.state.mission;
    if (!mission) return;

    const map = this.map;
    // Create a map of all units
    const unitMap = new globalThis.Map(
      [
        ...map.modules.units.getUnits(),
        ...map.modules.units.getDestroyedUnits(),
        ...map.modules.units
          .getUnits()
          .map(u =>
            'transport' in u.modules ? u.modules.transport.getSlots() : []
          )
          .flat()
      ].map(u => [u.id, u])
    );

    const result = !groupTargetsByUnit(
      (mission.getTargets() ?? []).map(t => {
        return {
          type: t.type,
          unit: unitMap.get(t.unit)!
        };
      })
    ).find(r => r.count !== r.completes);

    console.log('checkStatus', result);
    if (!result) {
      this.state.complete = true;
      this.observables.complete$.next();
    }
  }

  private targetSubscription: Subscription | null = null;
  setMission(description: MissionDescription | null) {
    if (!description) {
      this.state.mission = null;
      this.observables.mission$.next(null);
      this.targetSubscription?.unsubscribe();
      return;
    }

    this.targetSubscription = new Subscription();
    const unitMap = new globalThis.Map(this.getUnits().map(u => [u.id, u]));
    const targets = (description.targets ?? []).map(target => {
      const { type, unit: unitId } = target;
      const unit = unitMap.get(unitId);
      if (unit) {
        this.registerTargetUnits(type, unit);
      }
      return target;
    });

    const preparedDescription: MissionDescription = {
      ...description,
      targets
    };

    this.state.mission = new Mission(preparedDescription);
    this.observables.mission$.next(this.state.mission);
  }

  private getUnits() {
    const map = this.map;
    return [
      ...map.modules.units.getUnits(),
      ...map.modules.units.getDestroyedUnits(),
      ...map.modules.units
        .getUnits()
        .map(u =>
          'transport' in u.modules ? u.modules.transport.getSlots() : []
        )
        .flat()
    ];
  }

  addTarget(unit: Units, targetType: TargetType) {
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

function groupTargetsByUnit(targets: { type: TargetType; unit: Units }[]) {
  const grouped: {
    name: string;
    type: TargetType;
    count: number;
    completes: number;
  }[] = [];
  for (const target of targets) {
    let existing = grouped.find(t => t.name === target.unit.name);
    if (!existing) {
      existing = {
        name: target.unit.name,
        type: target.type,
        count: 0,
        completes: 0
      };
      grouped.push(existing);
    }

    existing.count++;

    if (
      target.type === 'rescue' &&
      'figure' in target.unit.modules &&
      target.unit.modules.figure.isRescueComplete()
    ) {
      existing.completes++;
    }
    if (target.type === 'attack' && target.unit.modules.damage.isDestroyed()) {
      existing.completes++;
    }
  }
  return grouped;
}
