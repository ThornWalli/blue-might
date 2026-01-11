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
      this.getUnit().modules.damage.observables.destroyed$.subscribe(
        async () => {
          await this.stopPatrol();
          this.destroy();
        }
      )
    );

    if (import.meta.hot) {
      import.meta.hot.dispose(() => {
        this.observables.stop$.next();
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
  resumePatrol() {
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
      this.patrolLoopFromIndex(this.currentIndex);
    } else {
      const pathfinding = this.getUnit().modules.pathfinding;

      pathfinding
        .move(this.pausedPosition!)
        .then(() => {
          this.currentIndex = this.pausedIndex!;
          this.patrolLoopFromIndex(this.currentIndex);
        })
        .catch(error => {
          console.error('Failed to move to paused position:', error);

          this.currentIndex = this.pausedIndex!;
          this.patrolLoopFromIndex(this.currentIndex);
        });
    }
    // FIX: Setze resuming = false erst am Ende
    this.resuming = false;
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
        map.modules.ground.getTerrainHeightAt(point[0], point[1])
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
      const success = await pathfinding.move(worldPath[index]!);
      if (success) {
        this.patrolFaileds = 0; // Reset bei Erfolg
        // ...existing code...
      } else {
        this.patrolFaileds++;
        if (this.patrolFaileds >= 3) {
          console.error('Patrol failed 3 times, stopping');
          this.stopPatrol();
          return;
        }
        // Versuche nächsten Punkt
        this.patrolRecursive(
          worldPath,
          (index + 1) % worldPath.length,
          pathfinding
        );
      }
    } catch (error) {
      console.error('Patrol move error:', error);
      this.patrolFaileds++;
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
