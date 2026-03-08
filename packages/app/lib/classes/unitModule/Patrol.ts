import type { Object3D } from 'three';
import { BufferGeometry, Line, LineBasicMaterial, Vector3 } from 'three';
import { ReplaySubject, Subject } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import { disposeObject3D } from '../../utils/object';
import type SurfaceModule from '../mapModule/Surface';

import type PathfindingUnitModule from './Pathfinding';

export type PatrolPathSegment = [number, number];
export type PatrolPath = PatrolPathSegment[];

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
  active$: ReplaySubject<boolean>;
  start$: Subject<void>;
  stop$: Subject<void>;
  end$: Subject<void>;
  loop$: Subject<void>;
  abort$: Subject<void>;
  pause$: Subject<void>;
  completed$: Subject<void>;
}

export interface PatrolUnitModuleOptions extends UnitModuleOptions {
  active: boolean;
  path: PatrolPath;
  roundsLoop: boolean;
  rounds: number;
}

export interface PatrolUnitModuleState extends UnitModuleState {
  active: boolean;
  rounds: number;
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

  private startPatrolTimeout: number = 0;
  private patrolRecursiveTimeout: number = 0;

  constructor(
    unit: Unit,
    options: PatrolUnitModuleOptions,
    state: PatrolUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      {
        ...options,
        path: options.path ?? [],
        roundsLoop: options.roundsLoop ?? true,
        rounds: options.rounds ?? 1
      },
      { ...state, active: options.active ?? false, rounds: 0 },
      debug
    );

    //#region observables
    this.observables.active$ = new ReplaySubject<boolean>(1);
    this.observables.active$.next(this.state.active);
    this.observables.start$ = new Subject<void>();
    this.observables.stop$ = new Subject<void>();
    this.observables.end$ = new Subject<void>();
    this.observables.loop$ = new Subject<void>();
    this.observables.abort$ = new Subject<void>();
    this.observables.pause$ = new Subject<void>();
    this.observables.completed$ = new Subject<void>();
    //#endregion
  }

  override async afterSetup() {
    await super.afterSetup();

    this.subscription.add(
      this.getUnit().modules.damage.observables.destroyed$.subscribe(
        async () => {
          await this.stopPatrol();
          this.subscription.unsubscribe();
        }
      )
    );

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        this.observables.stop$.next();
        this.stopPatrol();
      });
    }

    this.subscription.add(
      this.observables.active$.subscribe(active => {
        if (active) {
          this.startPatrolTimeout = window.setTimeout(() => {
            this.startPatrol();
            if (this.debug && this.hasPath()) {
              this.setupDebug();
            }
          }, 1000);
        } else {
          this.stopPatrol();
          window.clearTimeout(this.startPatrolTimeout);
        }
      })
    );
  }

  override async destroy() {
    window.clearTimeout(this.startPatrolTimeout);
    window.clearTimeout(this.patrolRecursiveTimeout);
    await this.stopPatrol();
    if (this.debugLine) {
      disposeObject3D(this.debugLine);
    }
    super.destroy();
  }

  async pausePatrol() {
    if (this.state.active) {
      console.log('Pausing patrol at index:', this.currentIndex);
      await this.getUnit().modules.pathfinding.abortMovement();
      this.state.active = false;
      this.pausedIndex = this.currentIndex;
      this.pausedPosition = this.getUnit().getPosition().clone();
      this.observables.pause$.next();
    } else {
      console.log('Patrol already paused');
    }
  }

  resuming = false;
  async resumePatrol() {
    console.log('Resuming patrol from index:', this.pausedIndex);

    if (this.state.active) return;

    if (this.resuming) {
      console.log('Already resuming, skipping');
      return;
    }
    this.resuming = true;

    if (!this.hasPath()) {
      console.warn('No path for patrol, cannot resume');
      this.resuming = false;
      return;
    }

    this.state.active = true;

    const currentPos = this.getUnit().getPosition();
    const distToPaused = this.pausedPosition
      ? currentPos.distanceTo(this.pausedPosition)
      : 0;

    if (this.pausedPosition && distToPaused > 5) {
      this.currentIndex = this.pausedIndex!;
      this.patrolLoop(this.currentIndex);
    } else {
      const pathfinding = this.getUnit().modules.pathfinding;
      try {
        await pathfinding.move(this.pausedPosition!);
        this.currentIndex = this.pausedIndex!;
        this.patrolLoop(this.currentIndex);
      } catch (error) {
        console.error('Failed to move to paused position:', error);

        this.currentIndex = this.pausedIndex!;
        this.patrolLoop(this.currentIndex);
      }
    }
    // FIX: Setze resuming = false erst am Ende
    this.resuming = false;
  }

  private getWorldPath() {
    const map = this.getUnit().getMap()!;
    return this.options.path.map(point => {
      const y = Math.max(
        map.modules.surface.getWaterLevel(),
        map.modules.surface.getTerrainHeightAt(point[0], point[1])
      );
      return new Vector3(point[0], y, point[1]);
    });
  }

  getPath(): PatrolPath {
    return this.options.path;
  }

  setPath(path: PatrolPath) {
    this.options.path = path;
  }

  hasPath(): boolean {
    return this.options.path.length > 0;
  }
  getRounds() {
    return this.options.rounds;
  }
  setRounds(rounds: number) {
    this.options.rounds = rounds;
    this.state.rounds = 0;
  }

  getRoundsLoop() {
    return this.options.roundsLoop;
  }
  setRoundsLoop(loop: boolean) {
    this.options.roundsLoop = loop;
  }

  async startPatrol() {
    if (!this.hasPath()) {
      console.warn('PatrolUnitModule: No path defined for patrol');
      return;
    }
    this.patrolLoop();
    this.observables.start$.next();
  }

  async setActive(active: boolean) {
    if (this.state.active === active) return;
    if (!active) {
      await this.stopPatrol();
    }
    this.state.active = active;
    this.observables.active$.next(this.state.active);
  }

  async stopPatrol() {
    if (this.state.active) {
      this.state.active = false;
      await this.getUnit().modules.pathfinding.abortMovement();
      this.observables.stop$.next();
    }
  }

  private async patrolLoop(startIndex: number = 0) {
    const pathfinding = this.getUnit().modules.pathfinding;
    const worldPath = this.getWorldPath();

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

  patrolFaileds = 3;
  private async patrolRecursive(
    worldPath: Vector3[],
    index: number,
    pathfinding: PathfindingUnitModule
  ) {
    debugger;
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
      const success = await pathfinding.move(worldPath[index]!);
      if (success) {
        this.patrolFaileds = 0;
      } else {
        this.patrolFaileds++;
        if (this.patrolFaileds >= 10) {
          console.error('Patrol failed 10 times, stopping');
          await this.stopPatrol();
          return;
        }
        window.clearTimeout(this.patrolRecursiveTimeout);
        this.patrolRecursiveTimeout = window.setTimeout(() => {
          // Versuche nächsten Punkt
          this.patrolRecursive(
            worldPath,
            (index + 1) % worldPath.length,
            pathfinding
          );
        }, 1000);
      }
    } catch (error) {
      console.error('Patrol move error:', error);
      this.patrolFaileds++;
      await this.stopPatrol();
      return;
    }

    // Nach einem vollen Loop: Starte von vorne (für unendliche Patrol)

    if (index === worldPath.length - 1) {
      this.state.rounds++;
      if (
        !this.options.roundsLoop &&
        this.state.rounds >= this.options.rounds
      ) {
        console.log('Completed patrol round:', this.state.rounds + 1);
        await this.getUnit().modules.pathfinding.abortMovement();
        this.state.active = false;
        this.observables.completed$.next();
      } else {
        this.observables.loop$.next();
        await this.patrolRecursive(worldPath, 0, pathfinding);
      }
    } else {
      // Rekursiver Aufruf für den nächsten Punkt
      await this.patrolRecursive(worldPath, index + 1, pathfinding);
    }
  }

  //#region debug
  private debugLine: Object3D | null = null;
  private setupDebug() {
    const groundModule = this.getUnit().getMap()!.modules.surface;
    const debugLine = createLine(getWorldPath(groundModule, this.getPath()));
    this.debugLine = debugLine;
    const scene = this.getUnit().getMap()?.app.getScene();
    scene?.add(this.debugLine);
  }

  //#endregion

  override getOptions() {
    return {
      rounds: this.options.rounds,
      roundsLoop: this.options.roundsLoop,
      active: this.options.active,
      path: this.getPath()
    };
  }
}

export function getWorldPath(groundModule: SurfaceModule, path: PatrolPath) {
  return path.map(point => {
    const y = Math.max(
      groundModule.getWaterLevel(),
      groundModule.getSurfaceHeightAt(point[0], point[1])
    );
    return new Vector3(point[0], y, point[1]);
  });
}

export function createLine(worldPath: Vector3[]) {
  worldPath = [...worldPath, worldPath[0]!];

  const geometry = new BufferGeometry().setFromPoints(
    worldPath.map(p => new Vector3(p.x, p.y + 0.1, p.z))
  );

  const line = new Line(
    geometry,
    new LineBasicMaterial({
      color: 0xffff00,
      linewidth: 2
    })
  );
  return line;
}
