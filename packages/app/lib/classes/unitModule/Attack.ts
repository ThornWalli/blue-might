/* eslint-disable complexity */
import { Mesh, MeshLambertMaterial, SphereGeometry, Vector3 } from 'three';
import {
  distinctUntilChanged,
  ReplaySubject,
  Subscription,
  map,
  switchMap,
  EMPTY
} from 'rxjs';
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
import { ControlAction } from '../playerModule/Controls';

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
  targetUnits$: ReplaySubject<{ unit: Unit; distance: number }[]>;
  targetUnit$: ReplaySubject<Unit | null>;
}

export interface AttackUnitModuleOptions extends UnitModuleOptions {
  /**
   * The radius of the attack range.
   * @default 6
   */
  radius: number;
  /**
   * The radius of the attack area.
   * @default 4/5
   */
  attackRadiusRatio: number;
  changeByDistance: boolean;
  /**
   * Whether the unit should follow the target.
   * @default true
   */
  followTarget: boolean;
  attackTypes: ATTACK_TYPE[];
}

export interface AttackUnitModuleState extends UnitModuleState {
  targetUnits: { unit: Unit; distance: number }[];
  targetIndex: number;
  followStartPosition: Vector3 | null;
  targetYaw: number | null;
}

export default class AttackUnitModule extends UnitModule<
  AttackUnitModuleOptions,
  AttackUnitModuleState,
  AttackUnitModuleObservables,
  Units
> {
  static override TYPE = 'attack';

  private debugObjects?: {
    radiusSphere: Mesh;
    attackRadiusSphere: Mesh | null;
  } | null;
  private resumeTimeout: number | null = null;

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
        attackRadiusRatio: options.attackRadiusRatio ?? 4 / 5,
        followTarget: options.followTarget ?? true,
        attackTypes: options.attackTypes ?? []
      },
      {
        ...state,
        targetUnits: [],
        targetIndex: -1,
        followStartPosition: null,
        targetYaw: null
      },
      debug
    );

    //#region observables
    this.observables.targetUnits$ = new ReplaySubject<
      { unit: Unit; distance: number }[]
    >(1);
    this.observables.targetUnit$ = new ReplaySubject<Unit | null>(1);
    //#endregion
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
        // this.sphere.center.copy(position);
        Object.values(this.debugObjects ?? {}).forEach(debugObject =>
          debugObject?.position.copy(position)
        );
      })
    );

    if ('player' in unit.modules) {
      const player$ = unit.modules.player.observables.player$;
      this.subscription.add(
        player$.subscribe(player => {
          if (isVehicle(this.getUnit())) {
            this.setFollowTarget(!player);
          } else {
            this.setFollowTarget(false);
          }
        })
      );

      this.subscription.add(
        player$
          .pipe(
            switchMap(
              player => player?.modules.controls.observables.controls$ ?? EMPTY
            )
          )
          .subscribe(controls => {
            if (controls[ControlAction.SWITCH_TARGET]) {
              this.switchTarget();
            }
          })
      );
    }

    if ('radar' in unit.modules) {
      this.subscription.add(
        unit.modules.radar.observables.units$
          .pipe(
            map(units =>
              units.filter(({ unit }) => this.isAttackAllowed(unit))
            ),
            distinctUntilChanged(
              (a, b) =>
                a.map(u => u.unit.id).join() === b.map(u => u.unit.id).join()
            )
          )
          .subscribe(v => {
            // Wenn targetUnits ändert, wird index auf 0 gesetzt
            this.state.targetUnits = v;
            this.state.targetIndex = -1;
            this.observables.targetUnits$.next(v);
            this.observables.targetUnit$.next(null);
          })
      );
    } else {
      console.error('No radar module found');
    }

    if (this.debug) {
      this.setupDebug();
    }
  }

  getTargetUnit() {
    return this.state.targetUnits[this.state.targetIndex]?.unit ?? null;
  }

  switchTarget() {
    if (this.state.targetUnits.length === 0) return;
    const index = (this.state.targetIndex + 1) % this.state.targetUnits.length;
    this.setTargetUnit(index);
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
      ('weapon' in unit.modules && !unit.modules.weapon?.isAutoAimActive())
    ) {
      return;
    }
    if ((time - this.lastUpdateTime) / 1000 < 1) {
      return;
    }
    this.lastUpdateTime = time;

    // Wenn bereits ein Ziel vorhanden und die Option "changeByDistance" deaktiviert ist wird nicht automatisch ein neues Ziel gesucht.
    if (this.options.changeByDistance || !this.getTargetUnit()) {
      // const intersectingUnits: Unit[] = [];

      let u: Unit | null = null;
      // Unit with smallest distance
      if (this.state.targetIndex < 0 && this.state.targetUnits[0]) {
        u = this.setTargetUnit(0);
      }

      // TODO: ist das so alles richtig mit dem TargetIndex?

      // if (
      //   this.state.targetUnits[0] &&
      //   this.state.targetUnits[0].distance < this.options.radius
      // ) {
      //   intersectingUnits.push(this.state.targetUnits[0].unit);
      // }

      this.updateRadiusDebug(u);

      // const result = intersectingUnits.shift();
      // if (result && this.state.targetUnit !== result) {
      //   this.setTargetUnit(result);
      // }
    }

    const targetUnit = this.getTargetUnit();
    if (this.options.followTarget && targetUnit) {
      const pathfinding = unit.modules.pathfinding;
      const attackRadius = this.getAttackRadius();

      this.state.followStartPosition =
        this.state.followStartPosition || unit.getPosition().clone();

      // Berechne Distanz zum Ziel
      const distance = getUnitDistance(unit, targetUnit);

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
            .subVectors(targetUnit.getPosition(), unit.getPosition())
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

          const rotationSpeed = 0.01; // Passe an: 0.1 = 10% pro Frame; höher = schneller, niedriger = langsamer
          const interpolatedYaw = currentYaw + deltaYaw * rotationSpeed;

          unit.setYaw(interpolatedYaw);

          // Stoppe Interpolation, wenn nah genug am Ziel.
          // Toleranz: 0.01 Radiant ≈ 0.57°
          if (Math.abs(deltaYaw) < 0.01) {
            // Reset für nächstes Ziel
            this.state.targetYaw = null;
          }
        }

        // Keine weitere Bewegung
        return;
      }

      // Reset targetYaw, wenn nicht mehr in Reichweite
      this.state.targetYaw = null;

      // Nur bewegen, wenn nicht in Reichweite und nicht bereits bewegend
      if (!pathfinding.isMoving()) {
        const direction = new Vector3()
          .subVectors(targetUnit.getPosition(), unit.getPosition())
          .normalize();
        const targetPosition = targetUnit
          .getPosition()
          .clone()
          .sub(direction.multiplyScalar(attackRadius));

        // console.log(
        //   'Starting movement to:',
        //   this.state.followStartPosition,
        //   targetPosition
        // );

        pathfinding.move(targetPosition);
      }
    }
  }

  isTargetOuterRange() {
    const targetUnit = this.getTargetUnit();
    if (!targetUnit || !this.state.followStartPosition) return false;
    const distance = this.state.followStartPosition.distanceTo(
      targetUnit.getPosition()
    );
    return distance > this.options.radius;
  }

  hasTarget() {
    return !!this.getTargetUnit();
  }

  getTarget() {
    return this.getTargetUnit();
  }

  isCurrentTarget(unit: Unit) {
    return this.getTargetUnit()?.equals(unit);
  }

  private unitSubscription: Subscription | null = null;
  private setTargetUnit(targetIndex: number | null) {
    if (this.state.targetIndex === targetIndex) return this.getTargetUnit();

    if (targetIndex === null || targetIndex === -1) {
      this.state.targetIndex = -1;
      return null;
    }

    const unit = this.getUnit();
    const patrolModule = 'patrol' in unit.modules ? unit.modules.patrol : null;
    this.state.targetIndex = targetIndex;

    if (!this.state.targetUnits[targetIndex]!.unit) {
      throw new Error(`Target unit at index ${targetIndex} not found`);
    }

    const targetUnit = this.state.targetUnits[targetIndex]!.unit;

    if (targetUnit) {
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
        targetUnit.observables.position$.subscribe(() => {
          const stillInRange = this.state.targetUnits.find(
            ({ unit }) => unit === targetUnit
          );
          const outerDistance = this.isTargetOuterRange();
          if (outerDistance || !stillInRange) {
            // console.log('Target out of range or lost');
            this.setTargetUnit(null);
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
        targetUnit.modules.damage.observables.destroyed$.subscribe(() => {
          this.unitSubscription?.unsubscribe();
          this.subscription.remove(this.unitSubscription!);

          // !!!! wird vermutlich niht gebraucht, weil schon mit ausstausch der targetUnits Unit weg ist.
          //     debugger;
          //     // Ziel zerstört, nächstes Ziel auswählen
          //     const nextTargetIndex = this.state.targetUnits.length ? 0 : null;
          //     this.state.targetIndex = -1;
          //     this.setTargetUnit(nextTargetIndex);
        })
      );

      this.subscription.add(this.unitSubscription);
    } else {
      // Target lost: Set timeout to resume Patrol after delay
      if (this.resumeTimeout) {
        clearTimeout(this.resumeTimeout);
      }
      this.resumeTimeout = window.setTimeout(() => {
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

    this.observables.targetUnit$.next(targetUnit);
    console.log('New attack target:', targetUnit, targetIndex);

    return targetUnit;
  }

  getFollowRadius() {
    return this.options.radius;
  }
  getAttackRadius() {
    return this.options.attackRadiusRatio * this.options.radius;
  }

  public isAttackAllowed(target: Unit): boolean {
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
        new SphereGeometry(this.options.radius, 16, 16),
        new MeshLambertMaterial({ color: 0x00ff00, wireframe: true })
      ),
      attackRadiusSphere: new Mesh(
        new SphereGeometry(this.getAttackRadius(), 16, 16),
        new MeshLambertMaterial({ color: 0x00ff00, wireframe: true })
      )
    };
    this.getUnit()
      .getMap()
      ?.app.getScene()
      .add(...Object.values(this.debugObjects).filter(o => o !== null));
  }

  updateRadiusDebug(unit: Unit | null) {
    const radiusSphere = this.debugObjects?.radiusSphere;
    if (radiusSphere) {
      const color = (radiusSphere.material as MeshLambertMaterial)?.color;
      color.set(0x00ff00);
      if (unit) {
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
