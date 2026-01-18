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
import { isUnitDestroyed, isVehicle } from '../../utils/unit';
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
  target$: ReplaySubject<Unit | null>;
}

export interface AttackUnitModuleOptions extends UnitModuleOptions {
  /**
   * The radius of the attack range. Defaults to 4.
   */
  radius: number;
  changeByDistance: boolean;
  followTarget: boolean;
  attackTypes: ATTACK_TYPE[];
}

export interface AttackUnitModuleState extends UnitModuleState {
  target: Unit | null;
  followStartPosition: Vector3 | null;
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
  private debugSphere: Mesh | null = null;
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
      { ...state, followStartPosition: null },
      debug
    );

    //#region observables
    this.observables.target$ = new ReplaySubject<Unit | null>(1);
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
        this.destroy();
      })
    );
    this.subscription.add(
      unit.observables.position$.subscribe(position => {
        this.sphere.center.copy(position);
        this.debugSphere?.position.copy(position);
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

    if (this.debugSphere) {
      this.debugSphere.removeFromParent();
      disposeObject3D(this.debugSphere);
      this.debugSphere = null;
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
    if (this.options.changeByDistance || !this.state.target) {
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
      const attackRadius = this.options.radius / 2;

      // Patrol-bezogene Logik entfernt

      this.state.followStartPosition =
        this.state.followStartPosition || unit.getPosition().clone();

      // Berechne Distanz zum Ziel
      const distance = unit
        .getPosition()
        .distanceTo(this.state.target.getPosition());

      // Neue Prüfung: Stoppe Bewegung, wenn bereits in Reichweite (z.B. distance <= attackRadius)
      if (distance <= attackRadius) {
        // Unit ist nah genug – stoppe Bewegung und richte aus
        if (pathfinding.isMoving()) {
          pathfinding.abortMovement();
        }
        // Richte die Unit zum Ziel aus (angenommen, es gibt ein rotation-Modul; passe an)
        // const direction = new Vector3()
        //   .subVectors(this.state.target.getPosition(), unit.getPosition())
        //   .normalize();
        // Beispiel: Setze Rotation basierend auf Richtung (passe an dein Unit-System an)
        // unit.modules.rotation?.setRotation(direction); // Oder ähnlich, falls verfügbar
        // Falls kein separates Modul: unit.setRotation(Math.atan2(direction.x, direction.z)); // Beispiel für Yaw
        // unit.setYaw(Math.atan2(direction.x, direction.z));

        // console.log('Unit in range, aiming at target');
        return; // Keine weitere Bewegung
      }

      // Nur bewegen, wenn nicht in Reichweite und nicht bereits bewegend
      if (!pathfinding.isMoving()) {
        // Zielposition: Auf der Linie zum Ziel, in attackRadius Entfernung (erhöhe Abstand, um Schleifen zu vermeiden)
        const direction = new Vector3()
          .subVectors(this.state.target.getPosition(), unit.getPosition())
          .normalize();
        const targetPosition = this.state.target
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
    return distance > this.options.radius;
  }

  hasTarget() {
    return !!this.state.target;
  }

  getTarget() {
    return this.state.target;
  }

  private unitSubscription: Subscription | null = null;
  private setTarget(target?: Unit | null) {
    if (this.state.target === target) return;

    const unit = this.getUnit();
    const patrolModule = unit.modules.patrol as PatrolUnitModule | undefined;
    this.state.target = target ?? null;

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
            this.setTarget(undefined);
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
          this.setTarget(undefined);
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

    this.observables.target$.next(this.state.target);
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
    const debugSphere = new Mesh(
      new SphereGeometry(this.sphere.radius, 16, 16),
      new MeshLambertMaterial({ color: 0x00ff00, wireframe: true })
    );
    this.debugSphere = debugSphere;
    this.getUnit().getMap()?.app.getScene().add(this.debugSphere);
  }
}
