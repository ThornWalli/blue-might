import { Subject, debounceTime, distinctUntilChanged, map, merge } from 'rxjs';
import type { Object3D } from 'three';
import { Group, Mesh, SkinnedMesh } from 'three';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Unit from '../Unit';
import UnitChunkManager from '../UnitChunkManager';
import type { AnimationLoopValue } from '../Renderer';
import type Map from '../Map';
import type { IntersectionListener } from '../rendererModule/Intersection';
import { OBJECT_USER_DATA } from '../../utils/object';
import BuildingUnit from '../unit/Building';

declare module '../Map' {
  interface ModuleDebug {
    units: boolean;
  }
}

interface Observables extends MapModuleObservables {
  addUnit$: Subject<Unit>;
  removeUnit$: Subject<Unit>;
  select$: Subject<Unit>;
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
    //#endregion

    this.root = new Group();
    this.listener =
      this.map.app.renderer.modules.intersection.registerListener();
  }

  override destroy(): void {
    super.destroy();
    this.state.units.forEach(unit => unit.destroy());
    this.state.units.clear();
    this.state.visibleUnits = [];
  }

  override async setup() {
    await super.setup();

    this.map.addToRoot(this.root);

    this.subscription.add(
      merge(
        this.observables.addUnit$.pipe(map(() => null)),
        this.map.app.renderer.modules.controls.observables.change$
        // this.map.app.modules.player.observables.currentPlayer$.pipe(
        //   switchMap(
        //     player => player?.modules.vehicle.observables.vehicle$ || EMPTY
        //   ),
        //   switchMap(({ current }) => current?.observables.visible$ || EMPTY)
        // )
      )
        .pipe(debounceTime(200))
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

    await this.setupUnits(this.map.description.units || []);

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
    await Promise.all(others.map(unit => this.add(unit)));
  }

  //#region methods

  override update(v: AnimationLoopValue) {
    this.getUnits().forEach(unit => {
      if (this.state.visibleUnits.includes(unit)) {
        unit.renderUpdate(v);
      }
      unit.update(v);
    });
  }

  getUnits() {
    return Array.from(this.state.units.values());
  }

  getUnitById(id: string) {
    return this.state.units.get(id);
  }

  async add(unit: Unit) {
    const context = {
      unit,
      map: this.map
    };
    await unit.setup(context);
    await unit.afterSetup(context);

    // const position = unit.getPosition().clone();
    // // position.setY(
    // //   this.map.modules.ground.getSurfaceHeightAt(position.x, position.z, [unit])
    // // );
    // unit.setPosition(position);
    // console.log(unit, 'Position:', position);

    unit.subscription.add(
      unit.observables.position$
        .pipe(
          map(pos => pos.clone().floor()),
          distinctUntilChanged((prev, next) => prev.equals(next))
        )
        .subscribe(() => {
          this.chunkManager.assignToChunk(unit);
        })
    );
    this.state.units.set(unit.id, unit);
    this.root.add(unit.root);

    await Promise.all(
      Object.values(unit.modules).map(module => module.addToScene(this.root))
    );

    this.listener!.addMeshes(getMeshes(unit.root));

    this.observables.addUnit$.next(unit);
  }

  remove(unit: Unit) {
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
