import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Unit from '../Unit';
import UnitChunkManager from '../UnitChunkManager';
import {
  EMPTY,
  Subject,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  switchMap
} from 'rxjs';
import type { AnimationLoopValue } from '../Renderer';
import type Map from '../Map';
import type { Object3D } from 'three';
import { Group, Mesh, SkinnedMesh } from 'three';
import type { IntersectionListener } from '../rendererModule/Intersection';
import { OBJECT_USER_DATA } from '../../utils/object';

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
        this.map.app.renderer.observables.controlsChange$,
        this.map.app.modules.player.observables.currentPlayer$.pipe(
          switchMap(
            player => player?.modules.vehicle.observables.vehicle$ || EMPTY
          ),
          switchMap(({ current }) => current?.observables.position$ || EMPTY)
        )
      )
        .pipe(debounceTime(20))
        .subscribe(() => {
          this.state.visibleUnits = Array.from(
            this.chunkManager.updateVisibility(this.map.app.renderer.camera)
          );
        })
    );

    await this.setupUnits(this.map.description.units || []);

    this.listener.addMeshes(this.getUnits().map(unit => unit.root));

    this.subscription.add(
      this.listener.clickIntersect$.subscribe(intersect => {
        this.observables.select$?.next(
          intersect.object.userData[OBJECT_USER_DATA.UNIT] as Unit
        );
      })
    );
  }

  //#region methods

  getUnits() {
    return Array.from(this.state.units.values());
  }

  getUnitById(id: string) {
    return this.state.units.get(id);
  }

  async setupUnits(units: Unit[]) {
    await Promise.all(units.map(unit => this.add(unit)));
  }

  async add(unit: Unit) {
    const context = {
      unit,
      map: this.map
    };
    await unit.setup(context);
    await unit.afterSetup(context);

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

  override update(v: AnimationLoopValue) {
    this.state.visibleUnits.forEach(unit => unit.update(v));
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
