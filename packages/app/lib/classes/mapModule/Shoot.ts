import type { Mesh } from 'three';
import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Object3D,
  Raycaster,
  Sphere,
  Vector2,
  Vector3
} from 'three';
import {
  createDustCone,
  type DustConeOptions
} from '@blue-might/app/lib/utils/dustCone';
import { getGlb } from '@blue-might/weapon/projectile';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';
import { loadGltf } from '../../utils/gltf';
import type Projectile from '../Projectile';

declare module '../Map' {
  interface ModuleDebug {
    shoot: boolean;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Observables extends MapModuleObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends MapModuleState {}

interface ShootDescription {
  projectile: Projectile;
  object: Object3D;
  ignoredObjects: Object3D[];
  startPosition: Vector3;
  /**
   * Geschwindigkeitsvektor anstatt nur Richtung und Speed
   */
  velocity: Vector3;
  isActive: boolean;
}

export default class ShootModule extends MapModule<State, Observables> {
  static override TYPE = 'shoot';
  private raycastFrameCounter = 0; // Neuer Zähler für Raycasting-Frequenz

  private tempSphere = new Sphere();
  private raycaster = new Raycaster();
  override state: State = {};
  private dustCones: Object3D[] = [];
  private shoots: ShootDescription[] = [];
  /**
   * Gravitation nach unten (m/s²), skaliere für dein Spiel
   */
  private gravity = new Vector3(0, -5, 0);
  /**
   * Luftwiderstand-Faktor (0.99 = 1% Verlust pro Frame), passe an
   */
  private airResistance = 0.1;

  // Temporäre Vektoren für die Physikberechnung, um .clone() zu reduzieren
  private tempVector = new Vector3();
  private tempGravity = new Vector3();
  private tempDrag = new Vector3();

  private dustConeOptions: DustConeOptions = {
    ditherThreshold: 0.1,
    size: new Vector2(0.2, 1),
    circleOpacity: 0.4,
    scale: 0.5,
    scaleSpeed: 0.025,
    color: 0x333333
  };

  private shootByProjectile: {
    [key: string]: Object3D;
  } = {};

  override destroy(): void {
    Object.values(this.shootByProjectile).forEach(obj => {
      disposeObject3D(obj);
    });

    this.shoots.forEach(shoot => disposeObject3D(shoot.object));

    super.destroy();
  }

  getDustConeOptions() {
    return this.dustConeOptions;
  }
  setDustConeOptions(options: Partial<typeof this.dustConeOptions>) {
    this.dustConeOptions = {
      ...this.dustConeOptions,
      ...options
    };
  }

  override async setup(): Promise<void> {
    this.raycaster.camera = this.map.app.renderer.modules.camera.getCamera();
  }

  private async createShootObj(projectile: Projectile) {
    const { object: shootObject } = await loadGltf(await getGlb(projectile.id));
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

  // private getTargetObjects(ignoredObjects: Object3D[] = []) {
  //   const map = this.map;
  //   const objs = [map.modules.ground.getRoot()];
  //   let obj;
  //   map.modules.units.getUnits().forEach(u => {
  //     obj = u.getRoot();
  //     if (!ignoredObjects.includes(obj)) {
  //       objs.push(obj);
  //     }
  //   });
  //   return objs;
  // }

  async createShoot(
    position: Vector3,
    direction: Vector3 = new Vector3(0, 0, 1),
    projectile: Projectile,
    {
      enableSpread,
      spreadAmount,
      ignoredObjects
    }: {
      enableSpread?: boolean;
      spreadAmount?: number;
      ignoredObjects?: Object3D[];
    } = { enableSpread: false, spreadAmount: 0, ignoredObjects: [] }
  ) {
    const activeCount = this.shoots.filter(s => s.isActive).length;
    if (activeCount >= 50) {
      // Anpassbar
      return; // Ignoriere neuen Schuss
    }

    if (!this.shootByProjectile[projectile.id]) {
      this.shootByProjectile[projectile.id] =
        await this.createShootObj(projectile);
    }

    // Versuche, ein Objekt aus dem Pool wiederzuverwenden
    let shootDesc = this.shoots.find(
      s => !s.isActive && s.projectile.id === projectile.id
    );

    if (shootDesc) {
      // Wiederverwenden eines vorhandenen Objekts
      shootDesc.object.visible = true;
    } else {
      // Erstelle ein neues Objekt, wenn der Pool leer ist
      const newShootObject = this.shootByProjectile[projectile.id]!.clone();
      const obj = new Object3D();
      obj.add(newShootObject);
      this.addToScene(obj);

      shootDesc = {
        projectile,
        object: obj,
        ignoredObjects: [],
        startPosition: new Vector3(),
        velocity: new Vector3(),
        isActive: false
      };
      this.shoots.push(shootDesc);
    }

    const obj = shootDesc.object;
    obj.position.copy(position);

    if (enableSpread) {
      setSpread(this.tempVector, direction, spreadAmount);
    }

    obj.lookAt(obj.position.clone().add(direction));

    // Aktiviere und konfiguriere das Projektil
    shootDesc.isActive = true;
    shootDesc.ignoredObjects = ignoredObjects ?? [];
    shootDesc.startPosition.copy(position);
    shootDesc.velocity.copy(direction).multiplyScalar(projectile.speed);
  }
  // eslint-disable-next-line complexity
  override update({ delta }: AnimationLoopValue): void {
    const raycaster = this.raycaster;
    this.raycastFrameCounter++;

    // 1. Baue die Liste der Ziele nur einmal pro Frame auf
    const allPossibleTargets = [this.map.modules.ground.getRoot()];
    this.map.modules.units
      .getUnits()
      .forEach(u => allPossibleTargets.push(u.getRoot()));

    for (const shoot of this.shoots) {
      if (!shoot.isActive) {
        continue;
      }

      // 2. Physikberechnung mit wiederverwendeten Vektoren
      this.tempGravity.copy(this.gravity).multiplyScalar(delta);
      shoot.velocity.add(this.tempGravity);

      this.tempDrag
        .copy(shoot.velocity)
        .multiplyScalar(this.airResistance * delta);
      shoot.velocity.sub(this.tempDrag);

      const obj = shoot.object;
      const oldPosition = this.tempVector.copy(obj.position);

      const moveVector = this.tempGravity
        .copy(shoot.velocity)
        .multiplyScalar(delta);
      obj.position.add(moveVector);

      obj.lookAt(obj.position.clone().add(shoot.velocity));

      let hit = false;

      // Bounding-Sphere-Prüfung (Radius z. B. 1.0 anpassen)
      this.tempSphere.set(obj.position, 1.0);
      let needsRaycast = false;
      for (const target of allPossibleTargets) {
        if (
          target !== obj &&
          this.tempSphere.intersectsSphere(
            //target.boundingSphere ||
            new Sphere(target.position, 2.0)
          )
        ) {
          needsRaycast = true;
          break;
        }
      }

      if (needsRaycast && this.raycastFrameCounter % 3 === 0) {
        const direction = this.tempDrag.copy(shoot.velocity).normalize();
        raycaster.set(oldPosition, direction);

        // 3. Raycast gegen eine gefilterte Liste von Zielen
        const intersections = raycaster.intersectObjects(
          this.getTargetObjects(allPossibleTargets, shoot.ignoredObjects)
        );

        if (intersections.length > 0) {
          const intersection = intersections[0]!;
          const point = intersection.point;
          const normal = intersection.face?.normal;

          const distanceToIntersection = oldPosition.distanceTo(point);
          const moveDistance = moveVector.length();
          if (distanceToIntersection <= moveDistance) {
            if (intersection.object.userData[OBJECT_USER_DATA.MAIN_OBJECT]) {
              const unit = this.map.app
                .getScene()
                .getObjectById(
                  intersection.object.userData[OBJECT_USER_DATA.MAIN_OBJECT]
                )?.userData.unit as Unit;
              this.hitUnit(unit, shoot);
            }
            this.spawnDustAt(point, normal, intersection.object);
            hit = true;
          }
        }
      }

      const distanceFromStart = obj.position.distanceTo(shoot.startPosition);
      if (hit || distanceFromStart > 20) {
        // Deaktiviere das Projektil und gib es an den Pool zurück
        shoot.isActive = false;
        shoot.object.visible = false;
      }
      if (this.raycastFrameCounter > 10) {
        this.raycastFrameCounter = 0;
      }
    }

    this.dustCones = this.dustCones.filter(cone => {
      const scale = cone.userData.scale ?? 1;
      cone.scale.x = 0.6 + scale * 0.4;
      cone.scale.z = 0.6 + scale * 0.4;
      cone.scale.y = scale;
      cone.userData.scale = scale - this.dustConeOptions.scaleSpeed;

      if (scale <= 0) {
        this.removeFromScene(cone);
        disposeObject3D(cone);
        return false;
      }
      return true;
    });
  }

  private hitUnit(unit: Unit, shoot: ShootDescription) {
    unit.modules.damage.hit(shoot.projectile);
  }

  private spawnDustAt(
    position: Vector3,
    normal?: Vector3,
    hitObject?: Object3D
  ) {
    const dustCone = createDustCone(this.dustConeOptions);
    dustCone.position.copy(position);
    dustCone.position.add(
      normal?.clone().multiplyScalar(0.001) ?? new Vector3(0, 0.001, 0)
    );

    if (normal && hitObject !== this.map.modules.ground.getRoot()) {
      dustCone.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), normal);
    }

    this.addToScene(dustCone);
    this.dustCones.push(dustCone);
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
