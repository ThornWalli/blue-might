/* eslint-disable complexity */
import {
  Mesh,
  MeshLambertMaterial,
  Sphere,
  SphereGeometry,
  Vector3
} from 'three';
import { ReplaySubject, Subscription } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';
import { disposeObject3D } from '../../utils/object';
import { isUnitDestroyed } from '../../utils/unit';
import type { UnitModules, UnitOptions } from '../Unit';

import type PatrolUnitModule from './Patrol';
import type WeaponUnitModule from './Weapon';

declare module '../Unit' {
  interface ModuleStates {
    attack: Partial<AttackUnitModuleState>;
  }
  interface ModuleOptions {
    attack: Partial<AttackUnitModuleOptions>;
  }
  interface ModuleDebug {
    attack: boolean;
  }
}

export interface AttackUnitModuleObservables extends UnitModuleObservables {
  target$: ReplaySubject<Unit | null>;
}

export interface AttackUnitModuleOptions extends UnitModuleOptions {
  /**
   * The radius of the attack range. Defaults to 4.
   */
  radius: number;
  changeByDistance: boolean;
  followTarget: boolean;
}

export interface AttackUnitModuleState extends UnitModuleState {
  target: Unit | null;
  followStartPosition: Vector3 | null;
}

export default class AttackUnitModule extends UnitModule<
  AttackUnitModuleOptions,
  AttackUnitModuleState,
  AttackUnitModuleObservables
> {
  static override TYPE = 'attack';

  private sphere: Sphere;
  private debugSphere: Mesh | null = null;
  setFollowTarget(enabled: boolean) {
    this.options.followTarget = enabled;
  }

  constructor(
    unit: Unit,
    options: AttackUnitModuleOptions,
    state: AttackUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      {
        ...options,
        radius: options.radius ?? 6,
        followTarget: options.followTarget ?? false
      },
      { ...state, followStartPosition: null },
      debug
    );

    //#region observables
    this.observables.target$ = new ReplaySubject<Unit | null>(1);
    this.observables.target$.next(null);
    //#endregion

    this.sphere = new Sphere(new Vector3(), this.options.radius);
  }

  override async setup() {
    await super.setup();

    const unit = this.getUnit();
    this.subscription.add(
      unit.modules.damage.observables.destroyed$.subscribe(() => {
        this.unitSubscription?.unsubscribe();
        this.subscription.remove(this.unitSubscription!);
        this.unitSubscription = null;
      })
    );
    this.subscription.add(
      unit.observables.position$.subscribe(position => {
        this.sphere.center.copy(position);
        this.debugSphere?.position.copy(position);
      })
    );

    if (this.debug) {
      this.setupDebug();
    }
  }

  override destroy() {
    if (this.debugSphere) {
      this.debugSphere.removeFromParent();
      disposeObject3D(this.debugSphere);
      this.debugSphere = null;
    }

    super.destroy();
  }

  lastUpdateTime = 0;
  override update({ time }: AnimationLoopValue): void {
    const unit = this.getUnit() as Unit<
      UnitOptions,
      UnitModules & {
        weapon: WeaponUnitModule;
        patrol: PatrolUnitModule;
      }
    >;
    if (isUnitDestroyed(unit) || !unit.modules.weapon?.isAutoAimActive()) {
      return;
    }
    if ((time - this.lastUpdateTime) / 1000 < 2 / 3) {
      return;
    }
    this.lastUpdateTime = time;

    // Wenn bereits ein Ziel vorhanden und die Option "changeByDistance" deaktiviert ist wird nicht automatisch ein neues Ziel gesucht.
    if (this.options.changeByDistance || !this.state.target) {
      const unitsInRadius = (
        unit
          .getMap()
          ?.modules.units.chunkManager.getUnitsInRadius(
            unit.getPosition(),
            this.options.radius
          ) ?? []
      ).filter(u => !isUnitDestroyed(u));

      const intersectingUnits: Unit[] = [];
      for (const targetUnit of unitsInRadius) {
        if (targetUnit === unit) continue;
        if (!this.isAttackAllowed(targetUnit)) {
          continue;
        }
        const intersected = this.intersect(targetUnit);
        if (intersected) {
          intersectingUnits.push(intersected);
        }
      }

      (this.debugSphere?.material as MeshLambertMaterial)?.color.set(0x00ff00);
      if (intersectingUnits.length) {
        if (this.state.target !== intersectingUnits[0]) {
          this.setTarget(intersectingUnits[0]);
        }
        (this.debugSphere?.material as MeshLambertMaterial)?.color.set(
          0xff0000
        );
      }
    }

    if (this.options.followTarget && this.state.target) {
      const pathfinding = unit.modules.pathfinding;
      const attackRadius = (this.options.radius * 3) / 4; // this.options.radius ?? 10; // Angriffsreichweite

      const patrolModule = unit.modules.patrol;
      if (patrolModule) {
        patrolModule.pausePatrol();
        this.state.followStartPosition = null;
      }

      this.state.followStartPosition =
        this.state.followStartPosition || unit.getPosition().clone();

      // Berechne Distanz zum Ziel
      const distance = unit
        .getPosition()
        .distanceTo(this.state.target.getPosition());

      if (
        (!this.isTargetOuterRange() || distance > attackRadius * 1.25) &&
        !pathfinding.isMoving()
      ) {
        // Zielposition: Auf der Linie zum Ziel, in attackRadius Entfernung
        const direction = new Vector3()
          .subVectors(this.state.target.getPosition(), unit.getPosition())
          .normalize();
        const targetPosition = this.state.target
          .getPosition()
          .clone()
          .sub(direction.multiplyScalar(attackRadius * 0.25));

        // Für Boote: Stelle sicher, dass targetPosition auf Sea Level ist
        // if (unit.hasModuleType(SeaVehicleUnitModule)) {
        //   const seaLevel = unit.getMap()?.modules.ground.getSeaLevel() ?? 0;
        //   targetPosition.y = seaLevel;
        // }

        // Starte Bewegung

        console.log('Starting movement to:', this.state.followStartPosition);

        pathfinding.move(targetPosition);
      }
    }
  }

  private intersect(unit: Unit) {
    const collisionModule = unit.modules.collision;
    if (collisionModule) {
      // Hole die Welt-Bounding Box der Ziel-Unit
      const targetBox = collisionModule.getWorldOBB();
      if (targetBox.intersectsSphere(this.sphere)) {
        return unit;
      }
    } else {
      // Fallback: Prüfe Distanz zur Position, wenn kein Kollisionsmodul vorhanden
      const distance = this.getUnit()
        .getPosition()
        .distanceTo(unit.getPosition());
      if (distance <= this.options.radius) {
        return unit;
      }
    }
  }

  isTargetOuterRange() {
    if (!this.state.target || !this.state.followStartPosition) return false;
    const distance = this.state.followStartPosition.distanceTo(
      this.state.target.getPosition()
    );
    console.log(distance);
    return distance > 6;
  }

  private unitSubscription: Subscription | null = null;
  private setTarget(target?: Unit | null) {
    const unit = this.getUnit() as Unit<
      UnitOptions,
      UnitModules & {
        patrol: PatrolUnitModule;
      }
    >;
    this.state.target = target ?? null;
    if (target) {
      this.unitSubscription?.unsubscribe();
      this.unitSubscription = new Subscription();
      this.unitSubscription.add(
        target.observables.position$.subscribe(() => {
          const outerDistance = this.isTargetOuterRange();
          if (outerDistance) {
            console.log('outer distance', this.state.followStartPosition);
          }
          if (
            outerDistance ||
            (!this.state.target && !this.intersect(target))
          ) {
            this.setTarget(undefined);
            this.unitSubscription?.unsubscribe();

            this.subscription.remove(this.unitSubscription!);
            if (outerDistance && this.state.followStartPosition) {
              unit.modules.pathfinding.abortMovement().then(async () => {
                await unit.modules.pathfinding.move(
                  this.state.followStartPosition!
                );
                this.state.followStartPosition = null;
                const patrolModule = unit.modules.patrol;
                if (patrolModule) {
                  patrolModule.resumePatrol();
                }
              });
            }
          }
        })
      );
      this.unitSubscription.add(
        target.modules.damage.observables.destroyed$.subscribe(() => {
          this.setTarget(undefined);
          this.state.followStartPosition = null;
          this.unitSubscription?.unsubscribe();
          this.subscription.remove(this.unitSubscription!);
        })
      );

      this.subscription.add(this.unitSubscription);
    } else {
      this.state.followStartPosition = null;
    }
    this.observables.target$.next(this.state.target);
    console.log('New attack target:', target);
  }

  private isAttackAllowed(target: Unit): boolean {
    const unit = this.getUnit();
    const isDestroyed = target.modules.damage?.isDestroyed();
    const isFriend = unit.modules.faction.isFriendlyFaction(
      target.modules.faction.getFaction()
    );
    return !isDestroyed && !isFriend;
  }

  private setupDebug() {
    const debugSphere = new Mesh(
      new SphereGeometry(this.sphere.radius, 16, 16),
      new MeshLambertMaterial({ color: 0x00ff00, wireframe: true })
    );
    this.debugSphere = debugSphere;
    this.getUnit().getMap()?.app.getScene().add(this.debugSphere);
  }
}
