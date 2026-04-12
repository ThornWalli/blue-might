/* eslint-disable complexity */
import type { Box3Helper, Object3D, Sphere } from 'three';
import {
  Box3,
  BoxGeometry,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Vector3
} from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { merge, ReplaySubject } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import { OBJECT_USER_DATA } from '../../utils/object';

declare module '../Unit' {
  interface ModuleStates {
    collision: Partial<CollisionUnitModuleState>;
  }
  interface ModuleOptions {
    collision: Partial<CollisionUnitModuleOptions>;
  }
  interface ModuleDebug {
    collision: boolean;
  }
}

declare module '../../utils/object' {
  interface ObjectUserData {
    COLLISION_TYPE: string;
    IGNORE_COLLISION: string;
  }
}
OBJECT_USER_DATA.COLLISION_TYPE = 'collisionType';
OBJECT_USER_DATA.IGNORE_COLLISION = 'ignoreCollision';

interface CollisionUnitModuleObservables extends UnitModuleObservables {
  collision$: ReplaySubject<{ type: COLLISION_TYPE; target: Unit }>;
}

interface CollisionUnitModuleState extends UnitModuleState {
  enabled: boolean;
}

export enum COLLISION_TYPE {
  NONE = 0,
  SOFT = 1,
  BLOCKED = 2
}

export interface CollisionUnitModuleOptions extends UnitModuleOptions {
  enabled: boolean;
  type: COLLISION_TYPE;
  targets: {
    default?: boolean;
    name: string;
    parentRotation?: boolean;
    /**
     * @deprecated
     */
    childIndex?: number;
    /**
     * @deprecated
     */
    useChilds?: boolean; // Rekursiv Kinder einbeziehen
  }[];
}

export default class CollisionUnitModule<
  Options extends CollisionUnitModuleOptions = CollisionUnitModuleOptions,
  Observables extends CollisionUnitModuleObservables =
    CollisionUnitModuleObservables,
  State extends CollisionUnitModuleState = CollisionUnitModuleState
> extends UnitModule<Options, State, Observables> {
  isIntersect(position: Vector3): boolean {
    this.refreshWorldOBBs();
    for (const obb of this.worldOBBs) {
      // Transformiere die Position in den lokalen Raum der OBB
      const localPos = position
        .clone()
        .sub(obb.center)
        .applyMatrix3(obb.rotation.clone().transpose());
      if (
        Math.abs(localPos.x) <= obb.halfSize.x &&
        Math.abs(localPos.y) <= obb.halfSize.y &&
        Math.abs(localPos.z) <= obb.halfSize.z
      ) {
        return true;
      }
    }
    return false;
  }
  static override TYPE = 'collision';
  private localOBBs: OBB[] = [];
  private worldOBBs: OBB[] = [];
  private debugHelpers: (LineSegments | Box3Helper | null)[] = [];
  private lastCollision: { type: COLLISION_TYPE; target: Unit } | null = null;

  constructor(unit: Unit, options: Options, state: State, debug?: boolean) {
    super(
      unit,
      {
        ...options,
        enabled: options.enabled ?? true,
        type: options.type ?? COLLISION_TYPE.BLOCKED,
        targets: options.targets ?? []
      },
      {
        ...state,
        enabled: state.enabled ?? true
      },
      debug
    );

    //#region observables
    this.observables.collision$ = new ReplaySubject<{
      type: COLLISION_TYPE;
      target: Unit;
    }>(1);
    //#endregion
  }

  override destroy() {
    this.debugHelpers.forEach(helper => {
      if (helper) {
        helper.geometry.dispose();
        (helper.material as LineBasicMaterial).dispose();
        helper.removeFromParent();
      }
    });
    super.destroy();
  }

  override async afterSetup() {
    if (!this.options.enabled) return;
    await super.afterSetup();
    this.setupLocalOBBs();
    this.refreshWorldOBBs();

    if (this.debug) {
      this.createDebugHelpers();
      this.refreshDebugHelpers();
    }

    const unit = this.getUnit();
    this.subscription.add(
      merge(unit.observables.position$, unit.observables.rotation$).subscribe(
        () => {
          this.refreshWorldOBBs();
          if (this.debug) {
            this.refreshDebugHelpers();
          }
        }
      )
    );
  }

  private getCollisionType() {
    return this.options.type;
  }

  private getWorldOBBs() {
    return this.worldOBBs;
  }

  private isEnabled() {
    return this.state.enabled;
  }

  public enableCollision() {
    this.state.enabled = true;
    this.getCollisionObjects().forEach(({ obj }) => {
      obj.traverse(child => {
        child.userData[OBJECT_USER_DATA.IGNORE_COLLISION] = false;
      });
    });
  }

  public disableCollision() {
    this.state.enabled = false;
    this.getCollisionObjects().forEach(({ obj }) => {
      obj.traverse(child => {
        child.userData[OBJECT_USER_DATA.IGNORE_COLLISION] = true;
      });
    });
  }

  private getTargets(): { obj: Object3D; parentRotation?: boolean }[] {
    const result: { obj: Object3D; parentRotation?: boolean }[] = [];
    this.options.targets.forEach(targetConfig => {
      const obj = this.getUnit().root.getObjectByName(targetConfig.name);
      if (obj) {
        if (targetConfig.childIndex !== undefined) {
          const child = obj.children[targetConfig.childIndex];
          if (child)
            result.push({
              obj: child,
              parentRotation: targetConfig.parentRotation
            });
        } else if (targetConfig.useChilds) {
          // Rekursiv alle Kinder sammeln (flach oder tief, je nach Bedarf)
          obj.traverse(child => result.push({ obj: child }));
          result.splice(
            result.findIndex(item => item.obj === obj),
            1
          );
        } else {
          result.push({ obj, parentRotation: targetConfig.parentRotation });
        }
      }
    });
    return result;
  }

  private setupLocalOBBs() {
    const objects = this.getCollisionObjects();
    this.localOBBs = objects.map(({ obj }) => {
      obj.updateMatrixWorld(true);
      const aabb = new Box3().setFromObject(obj);
      const size = new Vector3();
      aabb.getSize(size);
      const center = new Vector3();
      aabb.getCenter(center);

      const obb = new OBB();
      obb.halfSize.copy(size).multiplyScalar(0.5);

      const invMatrix = obj.matrixWorld.clone().invert();
      obb.center.copy(center).applyMatrix4(invMatrix);

      obb.rotation.identity();
      return obb;
    });
  }

  public refreshWorldOBBs() {
    const unit = this.getUnit();
    const objects = this.getCollisionObjects();

    const unitWorldMatrix = new Matrix4().compose(
      unit.getPosition(),
      unit.getYawQuaternion(),
      unit.root.scale
    );

    this.worldOBBs = this.localOBBs.map((localOBB, index) => {
      const { obj, parentRotation } = objects[index]!;

      const objWorldMatrix = new Matrix4();
      if (obj === unit.root) {
        objWorldMatrix.copy(unitWorldMatrix);
      } else {
        objWorldMatrix.copy(obj.parent!.matrixWorld);
        obj.updateWorldMatrix(true, false); // Aktualisiert die lokale Matrix
        objWorldMatrix.multiplyMatrices(unitWorldMatrix, obj.matrix);
      }

      const worldOBB = new OBB();
      worldOBB.halfSize.copy(localOBB.halfSize);

      worldOBB.center.copy(localOBB.center).applyMatrix4(objWorldMatrix);
      worldOBB.rotation.setFromMatrix4(objWorldMatrix);

      if (parentRotation) {
        const quaternion = obj.parent!.quaternion;
        const matrix = new Matrix4();
        matrix.makeRotationFromQuaternion(quaternion);
        worldOBB.rotation.setFromMatrix4(matrix);
      }

      return worldOBB;
    });
  }

  public checkCollision(box?: Box3 | Sphere) {
    if (!this.options.enabled) return COLLISION_TYPE.NONE;

    const unit = this.getUnit();
    const cm1 = unit.modules.collision;
    if (!cm1) return COLLISION_TYPE.NONE;

    cm1.refreshWorldOBBs();
    cm1.refreshDebugHelpers();

    if (box) {
      for (const obb1 of cm1.worldOBBs) {
        let result = false;
        if (box instanceof Box3) {
          result = obb1.intersectsBox3(box);
        } else {
          result = obb1.intersectsSphere(box);
        }
        if (result) return COLLISION_TYPE.BLOCKED;
      }
    } else {
      const units = unit.getMap()?.modules.units.getUnits() ?? [];

      for (let i = 0; i < units.length; i++) {
        const target = units[i]!;

        if (target === unit || !target.modules.collision.isEnabled()) continue;

        const cm2 = target.modules.collision;
        if (!cm2) continue;

        cm2.refreshWorldOBBs();
        cm2.refreshDebugHelpers();

        // Prüfe alle OBBs von cm1 gegen alle OBBs von cm2
        for (const obb1 of cm1.worldOBBs) {
          for (const obb2 of cm2.worldOBBs) {
            if (obb1.intersectsOBB(obb2)) {
              const type = cm2.getCollisionType();
              if (
                this.lastCollision?.target !== target &&
                this.lastCollision?.type !== type
              ) {
                this.observables.collision$.next({ type, target });
              }
              this.lastCollision = { type, target };
              return type;
            }
          }
        }
      }
    }
    return COLLISION_TYPE.NONE;
  }

  public getWorldOBB() {
    return this.worldOBBs[0] || new OBB();
  }

  public getCollisionObjects() {
    const objs = this.getTargets();
    if (!objs.length) {
      objs.push({ obj: this.getUnit().root });
    }
    objs.forEach(({ obj }) => {
      obj.userData[OBJECT_USER_DATA.COLLISION_TYPE] = this.options.type;
    });

    return objs;
  }

  public getDefaultCollisionObject() {
    const target = this.options.targets.find(target => target.default);
    let obj: Object3D | undefined;
    if (!target) {
      obj = this.getCollisionObjects()[0]?.obj;
    } else {
      obj = this.getUnit().root.getObjectByName(target?.name);
    }
    return obj;
  }

  //#region debug
  createDebugHelpers() {
    const unit = this.getUnit();
    const map = unit.getMap();
    if (!map) return;

    this.debugHelpers = this.worldOBBs.map(() => {
      const geometry = new BoxGeometry(1, 1, 1);
      const edges = new EdgesGeometry(geometry);
      const helper = new LineSegments(
        edges,
        new LineBasicMaterial({ color: 0xff0000 })
      );
      map.app.getScene().add(helper);
      return helper;
    });
  }
  refreshDebugHelpers() {
    this.debugHelpers.forEach((helper, index) => {
      if (!helper || !this.worldOBBs[index]) return;

      helper.position.copy(this.worldOBBs[index].center);
      helper.rotation.setFromRotationMatrix(
        new Matrix4().setFromMatrix3(this.worldOBBs[index].rotation)
      );
      helper.scale.copy(
        this.worldOBBs[index].halfSize.clone().multiplyScalar(2)
      );
      helper.updateMatrixWorld(true);
    });
  }

  //#endregion
}
