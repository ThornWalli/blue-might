/* eslint-disable complexity */
import {
  Mesh,
  MeshLambertMaterial,
  Sphere,
  SphereGeometry,
  Vector3
} from 'three';
import { ReplaySubject, Subscription } from 'rxjs';
import type { Units } from '@blue-might/units';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';
import { disposeObject3D } from '../../utils/object';
import { getUnitDistance, isUnitDestroyed, isVehicle } from '../../utils/unit';
import type { UnitModules } from '../Unit';

import type PatrolUnitModule from './Patrol';
import type WeaponUnitModule from './Weapon';
import type PlayerUnitModule from './Player';
import type GroundVehicleUnitModule from './movable/GroundVehicle';
import type AirVehicleUnitModule from './movable/AirVehicle';
import type SeaVehicleUnitModule from './movable/SeaVehicle';

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

export enum ATTACK_TYPE {
  SEA = 'sea',
  AIR = 'air',
  GROUND = 'ground'
}

export interface AttackUnitModuleObservables extends UnitModuleObservables {
  targetUnit$: ReplaySubject<Unit | null>;
}

export interface AttackUnitModuleOptions extends UnitModuleOptions {
  /**
   * The radius of the attack range. Defaults to 4.
   */
  radius: number;
  /**
   * Wenn nicht gesetzt, wird 1/2 vom Radius verwendet.
   */
  attackRadius?: number;
  changeByDistance: boolean;
  followTarget: boolean;
  attackTypes: ATTACK_TYPE[];
}

export interface AttackUnitModuleState extends UnitModuleState {
  targetUnit: Unit | null;
  followStartPosition: Vector3 | null;
  targetYaw: number | null; // Neu: Speichere den Ziel-Yaw für Interpolation
}

export default class AttackUnitModule extends UnitModule<
  AttackUnitModuleOptions,
  AttackUnitModuleState,
  AttackUnitModuleObservables,
  Unit<
    {
      weapon: WeaponUnitModule;
      player: PlayerUnitModule;
      patrol: PatrolUnitModule;
    } & UnitModules
  >
> {
  static override TYPE = 'attack';

  private sphere: Sphere;
  private debugObjects?: {
    radiusSphere: Mesh;
    attackRadiusSphere: Mesh;
  } | null;
  private resumeTimeout: NodeJS.Timeout | null = null; // Neuer Timeout für Patrol-Resume mit Delay

  setFollowTarget(enabled: boolean) {
    this.options.followTarget = enabled;
  }

  constructor(
    unit: Unit<
      {
        weapon: WeaponUnitModule;
        player: PlayerUnitModule;
        patrol: PatrolUnitModule;
      } & UnitModules
    >,
    options: AttackUnitModuleOptions,
    state: AttackUnitModuleState,
    debug: boolean
  ) {
    super(
      unit,
      {
        ...options,
        radius: options.radius ?? 6,
        followTarget: options.followTarget ?? false,
        attackTypes: options.attackTypes ?? []
      },
      { ...state, followStartPosition: null, targetYaw: null },
      debug
    );

    //#region observables
    this.observables.targetUnit$ = new ReplaySubject<Unit | null>(1);
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
        this.subscription.unsubscribe();
      })
    );
    this.subscription.add(
      unit.observables.position$.subscribe(position => {
        this.sphere.center.copy(position);
        Object.values(this.debugObjects ?? {}).forEach(debugObject =>
          debugObject?.position.copy(position)
        );
      })
    );

    this.subscription.add(
      unit.modules.player.observables.player$.subscribe(player => {
        if (isVehicle(this.getUnit())) {
          this.setFollowTarget(!player);
        } else {
          this.setFollowTarget(false);
        }
      })
    );

    if (this.debug) {
      this.setupDebug();
    }
  }

  override destroy() {
    if (this.resumeTimeout) {
      clearTimeout(this.resumeTimeout);
      this.resumeTimeout = null;
    }

    if (this.debugObjects) {
      Object.values(this.debugObjects)
        .filter(v => v !== null)
        .forEach(debugObject => {
          debugObject.removeFromParent();
          disposeObject3D(debugObject);
        });
      this.debugObjects = null;
    }

    super.destroy();
  }

  private lastUpdateTime = 0;
  override update({ time }: AnimationLoopValue): void {
    const unit = this.getUnit();
    if (
      this.destroyed ||
      isUnitDestroyed(unit) ||
      !unit.modules.weapon?.isAutoAimActive()
    ) {
      return;
    }
    if ((time - this.lastUpdateTime) / 1000 < 1) {
      return;
    }
    this.lastUpdateTime = time;

    // Wenn bereits ein Ziel vorhanden und die Option "changeByDistance" deaktiviert ist wird nicht automatisch ein neues Ziel gesucht.
    if (this.options.changeByDistance || !this.state.targetUnit) {
      const unitsInRadius = (
        unit
          .getMap()
          ?.modules.units.chunkManager.getUnitsInRadius(
            unit.getPosition(),
            this.options.radius
          ) ?? []
      ).filter(u => this.isAttackAllowed(u));

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

      const result = intersectingUnits.shift();
      if (result && this.state.targetUnit !== result) {
        this.setTargetUnit(result);
      }

      this.updateRadiusDebug(intersectingUnits);
    }

    if (this.options.followTarget && this.state.targetUnit) {
      const pathfinding = unit.modules.pathfinding;
      const attackRadius = this.options.attackRadius ?? this.options.radius / 2;

      this.state.followStartPosition =
        this.state.followStartPosition || unit.getPosition().clone();

      // Berechne Distanz zum Ziel
      const distance = getUnitDistance(unit, this.state.targetUnit);

      // Neue Prüfung: Stoppe Bewegung, wenn bereits in Reichweite

      const intersect = distance <= attackRadius;
      this.updateAttackRadiusDebug(intersect);

      if (intersect) {
        // Unit ist nah genug – stoppe Bewegung
        if (pathfinding.isMoving()) {
          pathfinding.abortMovement();
        }

        // Richte die Unit animiert zum Ziel aus (nur wenn stillstehend)
        if (!pathfinding.isMoving()) {
          const direction = new Vector3()
            .subVectors(this.state.targetUnit.getPosition(), unit.getPosition())
            .normalize();
          const targetYaw = Math.atan2(direction.x, direction.z);

          // Setze targetYaw, falls noch nicht gesetzt
          if (this.state.targetYaw === null) {
            this.state.targetYaw = targetYaw;
          }

          // Interpoliere den aktuellen Yaw zum Ziel-Yaw (animierte Ausrichtung)
          const currentYaw = unit.getYaw();
          let deltaYaw = targetYaw - currentYaw;

          // Normalisiere den Winkelunterschied auf -PI bis PI (verhindert Springen bei 360°-Übergängen)
          deltaYaw = ((deltaYaw + Math.PI) % (2 * Math.PI)) - Math.PI;

          const rotationSpeed = 0.1; // Passe an: 0.1 = 10% pro Frame; höher = schneller, niedriger = langsamer
          const interpolatedYaw = currentYaw + deltaYaw * rotationSpeed;

          unit.setYaw(interpolatedYaw);

          // Stoppe Interpolation, wenn nah genug am Ziel (verhindert Endlosschleifen)
          if (Math.abs(deltaYaw) < 0.01) {
            // Toleranz: 0.01 Radiant ≈ 0.57°
            this.state.targetYaw = null; // Reset für nächstes Ziel
          }
        }

        return; // Keine weitere Bewegung
      }

      // Reset targetYaw, wenn nicht mehr in Reichweite
      this.state.targetYaw = null;

      // Nur bewegen, wenn nicht in Reichweite und nicht bereits bewegend
      if (!pathfinding.isMoving()) {
        // Zielposition: Auf der Linie zum Ziel, in attackRadius Entfernung (erhöhe Abstand, um Schleifen zu vermeiden)
        const direction = new Vector3()
          .subVectors(this.state.targetUnit.getPosition(), unit.getPosition())
          .normalize();
        const targetPosition = this.state.targetUnit
          .getPosition()
          .clone()
          .sub(direction.multiplyScalar(attackRadius)); // Erhöht auf attackRadius statt *0.5, um weiter weg zu bleiben

        // console.log(
        //   'Starting movement to:',
        //   this.state.followStartPosition,
        //   targetPosition
        // );

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
      const distance = getUnitDistance(this.getUnit(), unit);
      if (distance <= this.options.radius) {
        return unit;
      }
    }
  }

  isTargetOuterRange() {
    if (!this.state.targetUnit || !this.state.followStartPosition) return false;
    const distance = this.state.followStartPosition.distanceTo(
      this.state.targetUnit.getPosition()
    );
    return distance > this.options.radius;
  }

  hasTarget() {
    return !!this.state.targetUnit;
  }

  getTarget() {
    return this.state.targetUnit;
  }

  private unitSubscription: Subscription | null = null;
  private setTargetUnit(target?: Unit | null) {
    if (this.state.targetUnit === target) return;

    const unit = this.getUnit();
    const patrolModule = unit.modules.patrol;
    this.state.targetUnit = target ?? null;

    if (target) {
      // Clear any existing resume timeout when setting a new target
      if (this.resumeTimeout) {
        clearTimeout(this.resumeTimeout);
        this.resumeTimeout = null;
      }
      // Pause Patrol when target is found
      if (patrolModule?.state.active) {
        patrolModule.pausePatrol();
      }

      this.unitSubscription?.unsubscribe();
      this.unitSubscription = new Subscription();
      this.unitSubscription.add(
        target.observables.position$.subscribe(() => {
          const stillInRange = this.intersect(target);
          const outerDistance = this.isTargetOuterRange();
          if (outerDistance || !stillInRange) {
            // console.log('Target out of range or lost');
            this.setTargetUnit(undefined);
            this.unitSubscription?.unsubscribe();
            this.subscription.remove(this.unitSubscription!);
            if (this.state.followStartPosition) {
              const pathfinding = this.getUnit().modules.pathfinding;
              pathfinding.abortMovement().then(async () => {
                // console.log(
                //   'Moving back to followStartPosition:',
                //   this.state.followStartPosition
                // );
                try {
                  await pathfinding.move(this.state.followStartPosition!);
                  // console.log('Move back successful, resuming patrol');

                  if (!patrolModule?.state.active) {
                    patrolModule?.resumePatrol();
                  }
                  this.state.followStartPosition = null;
                } catch (error) {
                  console.error('Move back failed:', error);
                  if (!patrolModule?.state.active) {
                    patrolModule?.resumePatrol();
                  }
                  this.state.followStartPosition = null;
                }
              });
            } else {
              console.warn('No followStartPosition, resuming patrol directly');
              if (!patrolModule?.state.active) {
                patrolModule?.resumePatrol();
              }
            }
          }
        })
      );
      this.unitSubscription.add(
        target.modules.damage.observables.destroyed$.subscribe(() => {
          this.setTargetUnit(undefined);
          this.unitSubscription?.unsubscribe();
          this.subscription.remove(this.unitSubscription!);
        })
      );

      this.subscription.add(this.unitSubscription);
    } else {
      // Target lost: Set timeout to resume Patrol after delay
      if (this.resumeTimeout) {
        clearTimeout(this.resumeTimeout);
      }
      this.resumeTimeout = setTimeout(() => {
        if (!patrolModule?.state.active) {
          patrolModule?.resumePatrol();
        }
        this.resumeTimeout = null;
      }, 5000); // 5 Sekunden Delay

      console.log('Setting target to undefined, resuming patrol if paused');
      this.state.followStartPosition = null;
      if (!patrolModule?.state.active) {
        patrolModule?.resumePatrol();
      }
    }

    this.observables.targetUnit$.next(this.state.targetUnit);
    console.log('New attack target:', target);
  }

  private isAttackAllowed(target: Unit): boolean {
    const unit = this.getUnit();
    const isDestroyed = target.modules.damage?.isDestroyed();
    const isFriend = unit.modules.faction.isFriendlyFaction(
      target.modules.faction.getFaction()
    );

    const modules = (
      target as unknown as Unit<
        UnitModules & {
          airVehicle: AirVehicleUnitModule;
          groundVehicle: GroundVehicleUnitModule;
          seaVehicle: SeaVehicleUnitModule;
        }
      >
    ).modules;

    let result = true;
    if (
      this.options.attackTypes.includes(ATTACK_TYPE.AIR) &&
      !modules.airVehicle
    ) {
      result = false;
    } else if (
      this.options.attackTypes.includes(ATTACK_TYPE.GROUND) &&
      !modules.groundVehicle
    ) {
      result = false;
    } else if (
      this.options.attackTypes.includes(ATTACK_TYPE.SEA) &&
      !modules.seaVehicle
    ) {
      result = false;
    }
    return result && !isDestroyed && !isFriend;
  }

  private setupDebug() {
    this.debugObjects = {
      radiusSphere: new Mesh(
        new SphereGeometry(this.sphere.radius, 16, 16),
        new MeshLambertMaterial({ color: 0x00ff00, wireframe: true })
      ),
      attackRadiusSphere: new Mesh(
        new SphereGeometry(
          this.options.attackRadius ?? this.options.radius / 2,
          16,
          16
        ),
        new MeshLambertMaterial({ color: 0xff0000, wireframe: true })
      )
    };
    this.getUnit()
      .getMap()
      ?.app.getScene()
      .add(...Object.values(this.debugObjects));
  }

  updateRadiusDebug(units: Units[]) {
    const radiusSphere = this.debugObjects?.radiusSphere;
    if (radiusSphere) {
      const color = (radiusSphere.material as MeshLambertMaterial)?.color;
      color.set(0x00ff00);
      if (units.length) {
        color.set(0xff0000);
      }
    }
  }

  updateAttackRadiusDebug(intersect: boolean) {
    const attackRadiusSphere = this.debugObjects?.attackRadiusSphere;
    if (attackRadiusSphere) {
      const color = (attackRadiusSphere.material as MeshLambertMaterial)?.color;
      color.set(0x00ff00);

      if (intersect) {
        color.set(0xff0000);
      }
    }
  }
}
