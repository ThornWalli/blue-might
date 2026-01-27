import { ReplaySubject } from 'rxjs';
import { BoxGeometry, Mesh, MeshBasicMaterial, Object3D } from 'three';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import type Unit from '../Unit';
import type { UnitModules } from '../Unit';
import type PatrolUnitModule from '../unitModule/Patrol';
import {
  createLine,
  getWorldPath,
  type PatrolPath
} from '../unitModule/Patrol';
import { disposeObject3D } from '../../utils/object';

type U = Unit<UnitModules & { patrol: PatrolUnitModule }>;

interface Observables extends AppModuleObservables {
  unit$: ReplaySubject<U | null>;
  index$: ReplaySubject<number>;
  path$: ReplaySubject<PatrolPath>;
  active$: ReplaySubject<boolean>;
}

interface State extends AppModuleState {
  unit: U | null;
  index: number;
}
export default class EditorPatrolAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorPatrol';
  override state: State = {
    unit: null,
    index: 0
  };

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.unit$ = new ReplaySubject<U | null>(1);
    this.observables.index$ = new ReplaySubject<number>(1);
    this.observables.path$ = new ReplaySubject<PatrolPath>(1);
    this.observables.active$ = new ReplaySubject<boolean>(1);
    //#endregion
  }

  override destroy() {
    if (this.helperObj) {
      disposeObject3D(this.helperObj);
      this.helperObj = null;
    }
  }

  override async setup() {
    await super.setup();
    if ('editorUnits' in this.app.modules) {
      const unit$ = this.app.modules.editorUnits.observables.unit$;
      this.subscription.add(
        unit$.subscribe(u => {
          this.setUnit(u as U | null);
        })
      );
    }
    this.subscription.add(
      this.observables.path$.subscribe(path => {
        this.updateLine(path);
      })
    );
    this.subscription.add(
      this.observables.index$.subscribe(index => {
        this.markers.forEach((marker, i) => {
          const material = (marker as Mesh).material as MeshBasicMaterial;
          material.color.set(getMarkerColor(i === index));
        });
      })
    );
  }

  helperObj: Object3D | null = null;
  markers: Object3D[] = [];
  updateLine(path: PatrolPath = []) {
    if (this.helperObj) {
      disposeObject3D(this.helperObj);
      this.helperObj = null;
      this.markers = [];
    }
    if (path.length) {
      const worldPath = getWorldPath(
        this.app.modules.map.getMap()!.modules.surface,
        path
      );
      const obj = new Object3D();

      if (path.length > 1) {
        const line = createLine(worldPath);
        obj.add(line);
      }

      worldPath.forEach((point, index) => {
        const marker = new Mesh(
          new BoxGeometry(0.1, 0.1, 0.1),
          new MeshBasicMaterial({
            color: getMarkerColor(this.state.index === index)
          })
        );
        marker.position.set(point.x, point.y + 0.2, point.z);
        this.markers.push(marker);
        obj.add(marker);
      });
      this.helperObj = obj;
      this.app.getScene().add(obj);
    }
  }
  setUnit(unit: U | null) {
    if (this.state.unit === unit) return;
    if (!unit?.modules.patrol) unit = null;

    this.state.unit = unit;
    this.observables.unit$.next(this.state.unit);
    this.updateLine(this.getPath());
  }

  getPath() {
    return this.state.unit?.modules.patrol.getPath() ?? [];
  }

  setPath(path: PatrolPath) {
    if (this.state.unit) {
      this.state.unit.modules.patrol.setPath(path);
      this.observables.path$.next(this.getPath());
    }
  }

  setIndex(index: number) {
    if (this.state.index === index) return;
    this.state.index = index;
    this.observables.index$.next(this.state.index);
  }
}

function getMarkerColor(value: boolean) {
  return value ? 0x00ff00 : 0xff0000;
}
