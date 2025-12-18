import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import { Subject } from 'rxjs';
import { disposeObject3D } from '../../utils/object';
import type PathfindingUnitModule from './Pathfinding';

interface Observables extends UnitModuleObservables {
  start$: Subject<void>;
  stop$: Subject<void>;
  end$: Subject<void>;
  loop$: Subject<void>;
  abort$: Subject<void>;
}

interface Options extends UnitModuleOptions {
  path: [number, number][];
}

interface State extends UnitModuleState {
  active: boolean;
}

export default class PatrolUnitModule extends UnitModule<
  Options,
  State,
  Observables
> {
  static override TYPE = 'patrol';

  constructor(unit: Unit, options: Options, state: State, debug: boolean) {
    super(
      unit,
      { ...options, path: options.path ?? [] },
      { ...state, active: state.active },
      debug
    );

    //#region observables
    this.observables.start$ = new Subject<void>();
    this.observables.stop$ = new Subject<void>();
    this.observables.end$ = new Subject<void>();
    this.observables.loop$ = new Subject<void>();
    this.observables.abort$ = new Subject<void>();
    //#endregion
  }

  override async afterSetup() {
    await super.afterSetup();

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        this.observables.abort$.next();
        this.stopPatrol();
      });
    }

    if (this.state.active) {
      window.setTimeout(() => {
        this.startPatrol();
        if (this.debug && this.hasPath()) {
          this.setupDebug();
        }
      }, 1000);
    }
  }

  override destroy(): void {
    this.stopPatrol();
    if (this.debugLine) {
      disposeObject3D(this.debugLine);
    }
    super.destroy();
  }

  private getWorldPath() {
    const map = this.getUnit().getMap()!;
    return this.options.path.map(point => {
      const y = map.modules.ground.getAvgHeightAt(point[0], point[1]);
      return new Vector3(point[0], y, point[1]);
    });
  }

  hasPath(): boolean {
    return this.options.path.length > 0;
  }

  async startPatrol() {
    if (!this.hasPath()) {
      console.warn('PatrolUnitModule: No path defined for patrol');
      return;
    }
    this.patrolLoop();
    this.observables.start$.next();
  }

  stopPatrol() {
    this.state.active = false;
    this.observables.stop$.next();
  }

  private async patrolLoop() {
    const pathfinding = this.getUnit().modules.pathfinding;
    const worldPath = this.getWorldPath();

    // Abbruch-Subscription
    const abortSubscription = this.observables.abort$.subscribe(() => {
      this.stopPatrol();
    });

    try {
      await this.patrolRecursive(worldPath, 0, pathfinding);
      this.observables.end$.next();
    } finally {
      abortSubscription.unsubscribe();
    }
  }

  private async patrolRecursive(
    worldPath: Vector3[],
    index: number,
    pathfinding: PathfindingUnitModule
  ) {
    if (!this.state.active || index >= worldPath.length) {
      // Ende der Patrol oder Abbruch
      return;
    }

    const point = worldPath[index]!;
    try {
      if (!(await pathfinding.move(point))) {
        return;
      }
    } catch (error) {
      console.error('PatrolUnitModule: Move failed', error);
      this.stopPatrol();
      return;
    }

    // Rekursiver Aufruf für den nächsten Punkt
    await this.patrolRecursive(worldPath, index + 1, pathfinding);

    // Nach einem vollen Loop: Starte von vorne (für unendliche Patrol)
    if (index === worldPath.length - 1) {
      this.observables.loop$.next();
      await this.patrolRecursive(worldPath, 0, pathfinding);
    }
  }

  //#region debug
  private debugLine: Line | null = null;
  private setupDebug() {
    const scene = this.getUnit().getMap()?.app.renderer.scene;
    let worldPath = this.getWorldPath();
    worldPath = [...worldPath, worldPath[0]!];

    const geometry = new BufferGeometry().setFromPoints(
      worldPath.map(p => new Vector3(p.x, p.y + 0.1, p.z))
    );
    this.debugLine = new Line(
      geometry,
      new LineBasicMaterial({
        color: 0xffff00,
        linewidth: 2
      })
    );
    scene?.add(this.debugLine);
  }

  //#endregion
}
