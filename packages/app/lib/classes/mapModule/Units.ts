import {
  ReplaySubject,
  Subject,
  distinctUntilChanged,
  map,
  merge,
  throttleTime
} from 'rxjs';
import type { Object3D, Vector3Tuple } from 'three';
import { Euler, Group, Mesh, SkinnedMesh, Vector3 } from 'three';
import * as units from '@blue-might/units';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import Unit from '../Unit';
import UnitChunkManager from '../UnitChunkManager';
import type { AnimationLoopValue } from '../Renderer';
import type Map from '../Map';
import type { IntersectionListener } from '../rendererModule/Intersection';
import { OBJECT_USER_DATA } from '../../utils/object';
import BuildingUnit from '../unit/Building';
import type { UnitDescription } from '../Unit';

declare module '../Map' {
  interface ModuleDebug {
    units: boolean;
  }
}

interface Observables extends MapModuleObservables {
  addUnit$: Subject<Unit>;
  removeUnit$: Subject<Unit>;
  select$: Subject<Unit>;
  ready$: ReplaySubject<void>;
}

interface State extends MapModuleState {
  visibleUnits: Unit[];
  units: globalThis.Map<string, Unit>;
}

export default class UnitsModule extends MapModule<State, Observables> {
  static override TYPE = 'units';

  chunkManager: UnitChunkManager = new UnitChunkManager();

  override state: State = {
    visibleUnits: [],
    units: new globalThis.Map<string, Unit>()
  };

  root: Group;
  listener: IntersectionListener;

  constructor(room: Map, debug: boolean) {
    super(room, debug);
    //#region observables
    this.observables.addUnit$ = new Subject<Unit>();
    this.observables.removeUnit$ = new Subject<Unit>();
    this.observables.select$ = new Subject<Unit>();
    this.observables.ready$ = new ReplaySubject<void>();
    //#endregion

    this.root = new Group();
    this.listener =
      this.map.app.renderer.modules.intersection.registerListener();
  }

  override destroy() {
    if (this.listener) {
      this.map.app.renderer.modules.intersection.unregisterListener(
        this.listener
      );
    }
    this.state.units.forEach(unit => unit.destroy());
    this.state.units.clear();
    this.state.visibleUnits = [];

    super.destroy();
  }

  override async setup() {
    await super.setup();

    this.map.addToRoot(this.root);

    this.subscription.add(
      merge(
        this.observables.addUnit$,
        this.map.app.renderer.modules.controls.observables.change$
      )
        .pipe(throttleTime(1000))
        .subscribe(() => {
          this.state.visibleUnits = Array.from(
            this.chunkManager.updateVisibility(
              this.map.app.renderer.modules.camera.getCamera()
            )
          );
        })
    );

    this.subscription.add(
      this.listener.clickIntersect$.subscribe(intersect => {
        this.observables.select$?.next(
          intersect.object.userData[OBJECT_USER_DATA.UNIT] as Unit
        );
      })
    );
  }

  override async afterSetup() {
    await super.afterSetup();

    await this.setupUnits(
      resolveUnits(
        this.map.description.units.map(unit => ({
          ...unit,
          position: Array.isArray(unit.position)
            ? new Vector3().fromArray(unit.position)
            : new Vector3(),
          rotation: Array.isArray(unit.rotation)
            ? new Euler().fromArray(unit.rotation)
            : new Euler()
        }))
      ) || []
    );

    this.listener.addMeshes(this.getUnits().map(unit => unit.root));
  }

  async setupUnits(units: Unit[]) {
    const { buildings, others } = units.reduce<{
      buildings: BuildingUnit[];
      others: Unit[];
    }>(
      (result, unit) => {
        if (unit instanceof BuildingUnit) {
          result.buildings.push(unit);
        } else {
          result.others.push(unit);
        }
        return result;
      },
      {
        buildings: [],
        others: []
      }
    );

    await Promise.all(buildings.map(unit => this.add(unit)));
    window.setTimeout(async () => {
      window.requestAnimationFrame(async () => {
        await Promise.all(others.map(unit => this.add(unit)));
        this.observables.ready$.next();
      });
    }, 0);
  }

  //#region methods

  override update(v: AnimationLoopValue) {
    this.getUnits().forEach(unit => {
      if (!unit.isDestroyed()) {
        if (this.state.visibleUnits.includes(unit)) {
          unit.renderUpdate(v);
        }
        unit.update(v);
      }
    });
  }

  getUnits() {
    return Array.from(this.state.units.values());
  }

  getUnitsInRadius(position: Vector3, radius: number) {
    return this.chunkManager.getUnitsInRadius(position, radius);
  }

  getUnitById(id: string) {
    return this.state.units.get(id);
  }

  async add<U extends Unit>(unit: U) {
    const context = {
      unit,
      map: this.map
    };

    if (!unit.ready) {
      await unit.setup(context);
      await unit.afterSetup(context);

      unit.ready = true;

      unit.subscription.add(
        unit.observables.position$
          .pipe(
            map(pos => pos.clone().floor()),
            distinctUntilChanged((prev, next) => prev.equals(next))
          )
          .subscribe(() => {
            this.chunkManager.assignToChunk(unit);
            this.updateVisibility();
          })
      );
      unit.subscription.add(
        unit.observables.destroyed$.subscribe(() => this.remove(unit))
      );
    }

    this.state.units.set(unit.id, unit);
    this.root.add(unit.root);

    await Promise.all(
      Object.values(unit.modules).map(module => module.addToScene(this.root))
    );

    this.listener!.addMeshes(getMeshes(unit.root));

    this.observables.addUnit$.next(unit);

    return unit;
  }

  updateVisibility() {
    this.state.visibleUnits = Array.from(
      this.chunkManager.updateVisibility(
        this.map.app.renderer.modules.camera.getCamera()
      )
    );
  }

  remove(unit: Unit) {
    this.listener!.removeMeshes(getMeshes(unit.root));
    this.state.units.delete(unit.id);
    this.chunkManager.removeFromChunk(unit);
    this.root.remove(unit.root);
  }

  getById<U extends Unit = Unit>(id: string): U | undefined {
    return this.state.units.get(id) as U | undefined;
  }

  //#endregion
}

function getMeshes(obj: Object3D): Mesh[] {
  const meshes: Mesh[] = [
    obj instanceof Mesh || obj instanceof SkinnedMesh ? obj : []
  ].flat();
  obj.traverse(child => {
    if (child instanceof Mesh || child instanceof SkinnedMesh) {
      meshes.push(child);
    }
  });
  return meshes;
}
const unitMap = new globalThis.Map(
  Object.values(units).map(
    unit => [unit.KEY, unit as unknown as typeof Unit] as [string, typeof Unit]
  )
);

function resolveUnits(units: UnitDescription[]): Unit[] {
  return units.map(unit => {
    const { key, ...rest } = unit;
    const UnitClass = unitMap.get(unit.key)!;
    if (unit instanceof Unit) {
      return unit;
    }
    return new UnitClass({
      ...rest,
      position:
        rest.position instanceof Vector3
          ? rest.position
          : new Vector3().fromArray(
              (rest.position ?? [0, 0, 0]) as Vector3Tuple
            ),
      rotation:
        rest.rotation instanceof Euler
          ? rest.rotation
          : new Euler().fromArray((rest.rotation ?? [0, 0, 0]) as Vector3Tuple)
    });
  });
}
