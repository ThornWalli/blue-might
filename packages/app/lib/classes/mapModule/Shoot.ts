import type { Mesh } from 'three';
import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Object3D,
  Raycaster,
  Sphere,
  Vector3
} from 'three';

import MapModule, {
  type MapModuleObservables,
  type MapModuleOptions,
  type MapModuleState
} from '../MapModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';
import { loadGltf } from '../../utils/gltf';
import type Projectile from '../Projectile';
import type { WeaponSlot } from '../WeaponSlot';

import { SMOKE_TYPE } from './../unitModule/Damage';

declare module '../Map' {
  interface ModuleDebug {
    shoot: boolean;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Options extends MapModuleOptions {}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Observables extends MapModuleObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends MapModuleState {}

export interface ShootDescription {
  slot: WeaponSlot;
  projectile: Projectile;
  object: Object3D;
  ignoredObjects: Object3D[];
  startPosition: Vector3;
  isActive: boolean;
  enableSmoke?: boolean;
  position: Vector3;
  targetPosition: Vector3 | null;
  /**
   * Lebensdauer in Sekunden
   */
  lifetime: number;
  /**
   * Geschwindigkeitsvektor anstatt nur Richtung und Speed
   */
  velocity: Vector3;
}

export default class ShootModule extends MapModule<
  Options,
  State,
  Observables
> {
  static override TYPE = 'shoot';
  private raycastFrameCounter = 0;
  private raycaster = new Raycaster();

  private shoots: ShootDescription[] = [];
  /**
   * Gravitation nach unten (m/s²), skaliere für dein Spiel
   */
  readonly gravity = new Vector3(0, -5, 0);
  /**
   * Luftwiderstand-Faktor (0.99 = 1% Verlust pro Frame), passe an
   */
  readonly airResistance = 0.1;

  private temp = {
    sphere: new Sphere(),
    vector: new Vector3(),
    gravity: new Vector3(),
    drag: new Vector3(),
    hitSphere: new Sphere() // Neu für Area Hit
  };

  private shootByProjectile: {
    [key: string]: Object3D;
  } = {};

  override destroy() {
    Object.values(this.shootByProjectile).forEach(obj => {
      disposeObject3D(obj);
    });

    this.shoots.forEach(shoot => disposeObject3D(shoot.object));

    super.destroy();
  }

  override async setup(): Promise<void> {
    this.raycaster.camera = this.map.app.renderer.modules.camera.getCamera();
  }

  private async createShootObj(projectile: Projectile) {
    const { object: shootObject } = await loadGltf(await projectile.getGlb());
    shootObject.scale.set(0.4, 0.4, 0.4);
    shootObject.traverse(child => {
      if ((child as Mesh).isMesh) {
        (child as Mesh).castShadow = true;
      }
    });
    return shootObject;
  }

  private getTargetObjects(
    allTargets: Object3D[],
    ignoredObjects: Object3D[] = []
  ) {
    if (ignoredObjects.length === 0) {
      return allTargets;
    }
    return allTargets.filter(obj => !ignoredObjects.includes(obj));
  }

  async createShoot(
    sourcePosition: Vector3,
    sourceDirection: Vector3 = new Vector3(0, 0, 1),
    targetPosition: Vector3 | null,
    slot: WeaponSlot,
    {
      enableSpread,
      spreadAmount,
      ignoredObjects
    }: {
      enableSpread?: boolean;
      spreadAmount?: number;
      ignoredObjects?: Object3D[];
    } = { enableSpread: true, spreadAmount: 0, ignoredObjects: [] }
  ) {
    const activeCount = this.shoots.filter(s => s.isActive).length;
    if (activeCount >= 50) {
      return;
    }
    const projectile = slot.weapon.projectile;

    if (!this.shootByProjectile[projectile.id]) {
      this.shootByProjectile[projectile.id] =
        await this.createShootObj(projectile);
    }

    // Versuche, ein Objekt aus dem Pool wiederzuverwenden
    let shootDesc = this.shoots.find(
      s => !s.isActive && s.projectile.id === projectile.id
    );

    if (shootDesc) {
      shootDesc.lifetime = projectile.maxLifetime;
      shootDesc.object.visible = true;
    } else {
      // Erstelle ein neues Objekt, wenn der Pool leer ist
      const newShootObject = this.shootByProjectile[projectile.id]!.clone();
      const object = new Object3D();
      object.add(newShootObject);
      this.addToScene(object);
      shootDesc = {
        slot,
        projectile,
        object,
        ignoredObjects: [],
        startPosition: new Vector3(),
        velocity: new Vector3(),
        position: new Vector3(),
        targetPosition: targetPosition ?? null,
        lifetime: projectile.maxLifetime,
        isActive: false
      };
      this.shoots.push(shootDesc);
    }
    if (enableSpread) {
      setSpread(this.temp.vector, sourceDirection, spreadAmount);
    }

    const obj = shootDesc.object;
    obj.position.copy(sourcePosition);

    shootDesc.position.copy(sourcePosition);
    shootDesc.velocity.copy(sourceDirection).multiplyScalar(projectile.speed);

    obj.lookAt(
      obj.position.x + sourceDirection.x,
      obj.position.y + sourceDirection.y,
      obj.position.z + sourceDirection.z
    );

    // Aktiviere und konfiguriere das Projektil
    shootDesc.isActive = true;
    shootDesc.enableSmoke = projectile.hasSmoke();
    shootDesc.ignoredObjects = ignoredObjects ?? [];
    shootDesc.startPosition.copy(sourcePosition);

    return shootDesc;
  }

  // eslint-disable-next-line complexity
  override update(animationLoopValue: AnimationLoopValue): void {
    const { delta } = animationLoopValue;
    const raycaster = this.raycaster;
    this.raycastFrameCounter++;

    // Baue die Liste der Ziele nur einmal pro Frame auf
    const allPossibleTargets = [this.map.modules.surface.getRoot()];
    this.map.modules.units
      .getUnits()
      .forEach(u => allPossibleTargets.push(u.getRoot()));

    for (const shoot of this.shoots) {
      if (!shoot.isActive) {
        continue;
      }

      shoot.lifetime -= delta;

      if (shoot.lifetime < 0) {
        shoot.isActive = false;
        shoot.object.visible = false;
        continue;
      }

      shoot.projectile.update({
        ...animationLoopValue,
        gravity: this.gravity,
        velocity: shoot.velocity,
        position: shoot.position,
        targetPosition: shoot.targetPosition ?? null
      });

      shoot.object.position.copy(shoot.position);

      shoot.object.lookAt(
        shoot.object.position.x + shoot.velocity.x,
        shoot.object.position.y + shoot.velocity.y,
        shoot.object.position.z + shoot.velocity.z
      );

      const obj = shoot.object;
      const oldPosition = this.temp.vector.copy(obj.position);

      if (shoot.projectile.hasSmoke() && shoot.enableSmoke) {
        this.map.modules.effect.addSmoke(shoot.object.position.clone(), {
          type: SMOKE_TYPE.MEDIUM,
          life: 0.8,
          static: true
        });
      }

      let hit = false;

      this.temp.sphere.set(obj.position, 1.0);
      let needsRaycast = false;
      for (const target of allPossibleTargets) {
        if (
          target !== obj &&
          this.temp.sphere.intersectsSphere(new Sphere(target.position, 2.0))
        ) {
          needsRaycast = true;
          break;
        }
      }

      if (needsRaycast) {
        const direction = this.temp.drag.copy(shoot.velocity).normalize();
        raycaster.set(oldPosition, direction);

        const intersections = raycaster.intersectObjects(
          this.getTargetObjects(allPossibleTargets, shoot.ignoredObjects)
        );

        if (intersections.length > 0) {
          const intersection = intersections[0]!;
          const point = intersection.point;
          const normal = intersection.face?.normal;
          const distanceToIntersection = oldPosition.distanceTo(point);

          const moveDistance = shoot.velocity.length() * delta;
          if (distanceToIntersection <= moveDistance) {
            hit = true;

            if (shoot.projectile.hasExplosion()) {
              this.map.modules.effect.addExplosion(point, 1);
            }
            if (shoot.projectile.hasDust()) {
              if (intersection.object.name === 'water') {
                console.log('WATER HIT');
                this.map.modules.effect.addWaterCone(
                  point,
                  normal,
                  intersection.object
                );
              } else {
                this.map.modules.effect.addDustCone(
                  point,
                  normal,
                  intersection.object
                );
              }
            }
            if (shoot.projectile.hasSmoke()) {
              this.map.modules.effect.addSmoke(point);
            }
            if (shoot.projectile.hasFire()) {
              this.map.modules.effect.addFire(point);
            }

            if (shoot.projectile.radius > 0) {
              this.hitByProjectileRadius(shoot, point);
            } else {
              if (intersection.object.userData[OBJECT_USER_DATA.MAIN_OBJECT]) {
                const unit = this.map.app
                  .getScene()
                  .getObjectById(
                    intersection.object.userData[OBJECT_USER_DATA.MAIN_OBJECT]
                  )?.userData.unit as Unit;
                this.hitUnit(unit, shoot, 0);
              }
            }
          }
        }
      }

      if (!hit && obj.position.y <= this.map.modules.surface.getSeaLevel()) {
        hit = true;
        if (shoot.projectile.hasExplosion()) {
          const position = new Vector3()
            .copy(obj.position)
            .setY(
              this.map.modules.surface.getSurfaceHeightAt(
                obj.position.x,
                obj.position.z
              )
            );
          this.map.modules.effect.addExplosion(position, 1);
          this.hitByProjectileRadius(shoot, position);
        }
      }

      const distanceFromStart = obj.position.distanceTo(shoot.startPosition);
      if (hit || distanceFromStart > 50) {
        shoot.isActive = false;
        shoot.object.visible = false;
      }
      if (this.raycastFrameCounter > 10) {
        this.raycastFrameCounter = 0;
      }
    }
  }

  private hitByProjectileRadius(shoot: ShootDescription, position: Vector3) {
    const projectileRadius = shoot.projectile.radius || 0;
    if (projectileRadius > 0) {
      this.temp.hitSphere.set(position, projectileRadius);
      const hitUnits: { unit: Unit; distance: number }[] = [];

      this.map.modules.units.getUnits().forEach(unit => {
        const unitRoot = unit.getRoot();
        if (this.temp.hitSphere.containsPoint(unitRoot.position)) {
          const distance = position.distanceTo(unitRoot.position);
          hitUnits.push({ unit, distance });
        }
      });

      hitUnits.sort((a, b) => a.distance - b.distance);
      hitUnits.forEach(({ unit, distance }) => {
        this.hitUnit(unit, shoot, distance);
      });
    }
  }

  private hitUnit(unit: Unit, shoot: ShootDescription, _distance: number = 0) {
    // // Berechne Schaden basierend auf Distanz (z.B. linearer Falloff)
    // const baseDamage = shoot.projectile.strength || 0;
    // const maxRadius = shoot.projectile.radius || 1;
    // const damageMultiplier = Math.max(0, 1 - distance / maxRadius); // Voller Schaden bei 0, 0 bei maxRadius
    // const adjustedDamage = baseDamage * damageMultiplier;
    // console.log(`Hit unit ${unit.id} with ${adjustedDamage} damage`);
    unit.modules.damage.hit(shoot.projectile);
  }

  createDebugVisualizePath(
    position: Vector3,
    direction: Vector3,
    projectile: Projectile
  ) {
    const points: Vector3[] = [];
    const simPosition = position.clone();
    const simVelocity = direction.clone().multiplyScalar(projectile.speed);

    // Simuliere die Flugbahn für eine bestimmte Anzahl von Schritten
    const simulationSteps = 200;
    const timeStep = 0.05; // Fester Zeitschritt für die Simulation

    for (let i = 0; i < simulationSteps; i++) {
      // Wende die gleiche Physik wie in der update-Methode an
      simVelocity.add(this.gravity.clone().multiplyScalar(timeStep));
      const drag = simVelocity
        .clone()
        .multiplyScalar(this.airResistance * timeStep);
      simVelocity.sub(drag);

      simPosition.add(simVelocity.clone().multiplyScalar(timeStep));
      points.push(simPosition.clone());

      // Stoppe die Simulation, wenn das Projektil unter den Boden fällt
      if (simPosition.y < 0) {
        break;
      }
    }

    const geometry = new BufferGeometry().setFromPoints(points);
    const material = new LineBasicMaterial({ color: 0xff0000 }); // Rote Linie
    return new Line(geometry, material);
  }
}

function setSpread(
  tempVector: Vector3,
  direction: Vector3,
  spread: number = 0
) {
  spread = Math.max(0, spread ?? 0);
  tempVector.set(
    (Math.random() - 0.5) * spread,
    (Math.random() - 0.5) * spread,
    (Math.random() - 0.5) * spread
  );
  direction.add(tempVector).normalize();
}
