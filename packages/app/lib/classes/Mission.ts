import type { UnitIdentifier } from '../types/unit';
import type { TargetType } from '../types/mission';

export interface MissionDescription {
  name: string;
  objective: string;
  location: string;
  situationReport: string;
  missionObjectives: string;
  targets?: {
    type: TargetType;
    unit: UnitIdentifier;
    optional: boolean;
  }[];
}

export default class Mission {
  private name: string;
  private objective: string;
  private location: string;
  private situationReport: string;
  private missionObjectives: string;
  private targets: {
    type: TargetType;
    optional: boolean;
    unit: UnitIdentifier;
  }[];
  constructor(description: MissionDescription) {
    this.name = description.name;
    this.objective = description.objective;
    this.location = description.location;
    this.situationReport = description.situationReport;
    this.missionObjectives = description.missionObjectives;
    this.targets = description.targets ?? [];
  }

  public getName() {
    return this.name;
  }
  public setName(name: string) {
    this.name = name;
  }

  public getObjective() {
    return this.objective;
  }
  public setObjective(objective: string) {
    this.objective = objective;
  }

  public getLocation() {
    return this.location;
  }
  public setLocation(location: string) {
    this.location = location;
  }

  public getSituationReport() {
    return this.situationReport;
  }
  public setSituationReport(situationReport: string) {
    this.situationReport = situationReport;
  }

  public getMissionObjectives() {
    return this.missionObjectives;
  }
  public setMissionObjectives(missionObjectives: string) {
    this.missionObjectives = missionObjectives;
  }

  public getTargets() {
    return this.targets;
  }
  public setTargets(
    targets: { type: TargetType; unit: UnitIdentifier; optional: boolean }[]
  ) {
    this.targets = targets;
  }

  public getTarget(unitId: UnitIdentifier) {
    return this.targets.find(target => target.unit === unitId);
  }

  public toDescription(): MissionDescription {
    return {
      name: this.name,
      objective: this.objective,
      location: this.location,
      situationReport: this.situationReport,
      missionObjectives: this.missionObjectives,
      targets: [...this.targets]
    };
  }
}
