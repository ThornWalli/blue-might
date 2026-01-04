import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three';
import { Subject } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import { disposeObject3D } from '../../utils/object';

import type PathfindingUnitModule from './Pathfinding';

declare module '../Unit' {
  interface ModuleStates {
    patrol: Partial<PatrolUnitModuleState>;
  }
  interface ModuleOptions {
    patrol: Partial<PatrolUnitModuleOptions>;
  }
  interface ModuleDebug {
    patrol: boolean;
  }
}

interface Observables extends UnitModuleObservables {
  start$: Subject<void>;
  stop$: Subject<void>;
  end$: Subject<void>;
  loop$: Subject<void>;
  abort$: Subject<void>;
  pause$: Subject<void>;
}

export interface PatrolUnitModuleOptions extends UnitModuleOptions {
  path: [number, number][];
}

export interface PatrolUnitModuleState extends UnitModuleState {
  active: boolean;
}

export default class PatrolUnitModule extends UnitModule<
  PatrolUnitModuleOptions,
  PatrolUnitModuleState,
  Observables
> {
  static override PREVIEW = false;
  static override TYPE = 'patrol';

  private currentIndex: number = 0;
  private pausedIndex: number | null = null;
  private pausedPosition: Vector3 | null = null;

  constructor(
    unit: Unit,
    options: PatrolUnitModuleOptions,
    state: PatrolUnitModuleState,
    debug: boolean
  ) {
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
    this.observables.pause$ = new Subject<void>();
    //#endregion
  }

  override async afterSetup() {
    await super.afterSetup();

    this.subscription.add(
      this.getUnit().modules.damage.observables.destroyed$.subscribe(() => {
        this.stopPatrol();
      })
    );

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

  async pausePatrol() {
    if (this.state.active) {
      this.state.active = false;
      await this.getUnit().modules.pathfinding.abortMovement();
      this.observables.pause$.next();
      this.pausedIndex = this.currentIndex;
      this.pausedPosition = this.getUnit().getPosition().clone();
    }
  }

  resuming = false;
  resumePatrol() {
    if (this.resuming) return;
    if (this.hasPath()) {
      if (this.pausedPosition && this.pausedIndex !== null && this.hasPath()) {
        this.resuming = true;
        const pathfinding = this.getUnit().modules.pathfinding;

        pathfinding.move(this.pausedPosition).then(() => {
          this.state.active = true;
          this.patrolLoopFromIndex(this.pausedIndex!);
          this.pausedIndex = null;
          this.pausedPosition = null;
          this.resuming = false;
        });
      }
    }
  }

  private async patrolLoopFromIndex(startIndex: number) {
    const pathfinding = this.getUnit().modules.pathfinding;
    const worldPath = this.getWorldPath();

    // Abbruch-Subscription
    const abortSubscription = this.observables.abort$.subscribe(() => {
      this.stopPatrol();
    });

    try {
      await this.patrolRecursive(worldPath, startIndex, pathfinding);
      this.observables.end$.next();
    } finally {
      abortSubscription.unsubscribe();
    }
  }

  private getWorldPath() {
    const map = this.getUnit().getMap()!;
    return this.options.path.map(point => {
      const y = Math.max(
        map.modules.ground.getSeaLevel(),
        map.modules.ground.getAvgHeightAt(point[0], point[1])
      );
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

  async stopPatrol() {
    if (this.state.active) {
      this.state.active = false;
      await this.getUnit().modules.pathfinding.abortMovement();
      this.observables.stop$.next();
    }
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

  patrolFaileds = 3;
  private async patrolRecursive(
    worldPath: Vector3[],
    index: number,
    pathfinding: PathfindingUnitModule
  ) {
    this.currentIndex = index;

    if (!this.state.active || index >= worldPath.length) {
      return;
    }

    const point = worldPath[index]!;
    const currentPos = this.getUnit().getPosition();

    // Prüfe, ob die Einheit bereits nahe genug am Zielpunkt ist
    if (currentPos.distanceTo(point) < 0.1) {
      // Bereits dort, gehe direkt zum nächsten Punkt
      await this.patrolRecursive(worldPath, index + 1, pathfinding);
      return;
    }

    try {
      if (!(await pathfinding.move(point))) {
        if (this.patrolFaileds > 0) {
          this.patrolFaileds--;
          console.log(
            `Patrol failed, retrying... (${this.patrolFaileds} attempts left)`
          );
          window.setTimeout(() => {
            this.patrolRecursive(worldPath, index, pathfinding);
          }, 2500);
        } else {
          this.patrolFaileds = 3;
          this.stopPatrol();
        }
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

  // private async patrolRecursive(
  //   worldPath: Vector3[],
  //   index: number,
  //   pathfinding: PathfindingUnitModule
  // ) {
  //   this.currentIndex = index;

  //   if (!this.state.active || index >= worldPath.length) {
  //     return;
  //   }

  //   let nextIndex = index;
  //   if (nextIndex >= worldPath.length) {
  //     nextIndex = 0;
  //     this.observables.loop$.next();
  //   }

  //   const point = worldPath[index]!;
  //   debugger;
  //   try {
  //     if (!(await pathfinding.move(point))) {
  //       this.stopPatrol();
  //       return;
  //     }
  //   } catch (error) {
  //     console.error('PatrolUnitModule: Move failed', error);
  //     this.stopPatrol();
  //     return;
  //   }

  //   // Rekursiver Aufruf für den nächsten Punkt
  //   await this.patrolRecursive(worldPath, index + 1, pathfinding);

  //   // Nach einem vollen Loop: Starte von vorne (für unendliche Patrol)
  //   if (index === worldPath.length - 1) {
  //     this.observables.loop$.next();
  //     await this.patrolRecursive(worldPath, 0, pathfinding);
  //   }
  // }

  //#region debug
  private debugLine: Line | null = null;
  private setupDebug() {
    const scene = this.getUnit().getMap()?.app.getScene();
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
