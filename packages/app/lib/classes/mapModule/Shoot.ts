import type { Mesh } from 'three';
import { Object3D, Raycaster, Vector2, Vector3 } from 'three';
import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';
import { disposeObject3D, OBJECT_USER_DATA } from '../../utils/object';
import { loadGltf } from '../../utils/gltf';
import {
  createDustCone,
  type DustConeOptions
} from '@blue-might/app/lib/utils/dustCone';
import type Projectile from '../Projectile';
import { getGlb } from '@blue-might/weapon/projectile';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Observables extends MapModuleObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends MapModuleState {}

interface ShootDescription {
  projectile: Projectile;
  object: Object3D;
  ignoredObjects: Object3D[];
}

export default class ShootModule extends MapModule<State, Observables> {
  static override TYPE = 'shoot';
  private raycaster = new Raycaster();
  override state: State = {};
  private dustCones: Object3D[] = [];
  private shoots: ShootDescription[] = [];

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

  private getTargetObjects(ignoredObjects: Object3D[] = []) {
    const map = this.map;
    const objs = [map.modules.ground.getRoot()];
    let obj;
    map.modules.units.getUnits().forEach(u => {
      obj = u.getRoot();
      if (!ignoredObjects.includes(obj)) {
        objs.push(obj);
      }
    });
    return objs;
  }

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
    if (!this.shootByProjectile[projectile.id]) {
      this.shootByProjectile[projectile.id] =
        await this.createShootObj(projectile);
    }
    const newShoot = this.shootByProjectile[projectile.id]!.clone();

    const obj = new Object3D();
    obj.add(newShoot);
    obj.position.copy(position);

    spreadAmount = spreadAmount ?? 0;
    if (enableSpread) {
      const spread = new Vector3(
        (Math.random() - 0.5) * spreadAmount,
        (Math.random() - 0.5) * spreadAmount,
        (Math.random() - 0.5) * spreadAmount
      );
      direction.add(spread).normalize();
    }

    obj.userData.direction = direction;
    obj.lookAt(obj.position.clone().add(direction));

    this.addToScene(obj);
    this.shoots.push({
      projectile,
      object: obj,
      ignoredObjects: ignoredObjects ?? []
    });
  }

  override update(_v: AnimationLoopValue): void {
    const raycaster = this.raycaster;
    this.shoots = this.shoots.filter(shoot => {
      const { speed: shootSpeed } = shoot.projectile;
      const obj = shoot.object;
      const direction = obj.userData.direction as Vector3;
      const oldPosition = obj.position.clone();
      obj.position.add(direction.clone().multiplyScalar(shootSpeed));

      raycaster.set(oldPosition, direction);

      const intersections = raycaster.intersectObjects(
        this.getTargetObjects(shoot.ignoredObjects)
      );

      if (intersections.length > 0) {
        const intersection = intersections[0]!;
        const point = intersection.point;
        const normal = intersection.face?.normal;

        const distanceToIntersection = oldPosition.distanceTo(point);
        const moveDistance = direction.length() * shootSpeed;
        if (distanceToIntersection <= moveDistance) {
          if (intersection.object.userData[OBJECT_USER_DATA.MAIN_OBJECT]) {
            const unit = this.map.app.renderer.scene.getObjectById(
              intersection.object.userData[OBJECT_USER_DATA.MAIN_OBJECT]
            )?.userData.unit as Unit;
            this.hitUnit(unit, shoot);
          }
          this.spawnDustAt(point, normal, intersection.object);

          obj.parent?.remove(obj);
          return false;
        }
      }

      if (obj.position.length() > 20) {
        obj.parent?.remove(obj);
        return false;
      }
      return true;
    });

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
}
