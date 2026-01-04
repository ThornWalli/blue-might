/* eslint-disable complexity */
import type { Box3Helper, Object3D } from 'three';
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
import { ReplaySubject } from 'rxjs';

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
  }
}
OBJECT_USER_DATA.COLLISION_TYPE = 'collisionType';

interface CollisionUnitModuleObservables extends UnitModuleObservables {
  collision$: ReplaySubject<{ type: COLLISION_TYPE; target: Unit }>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CollisionUnitModuleState extends UnitModuleState {}

export enum COLLISION_TYPE {
  NONE = 0,
  SOFT = 1,
  BLOCKED = 2
}

export interface CollisionUnitModuleOptions extends UnitModuleOptions {
  disabled: boolean;
  type: COLLISION_TYPE;
  targets: {
    name: string;
    childIndex?: number;
    useChilds?: boolean; // Rekursiv Kinder einbeziehen
  }[];
}

export default class CollisionUnitModule<
  Options extends CollisionUnitModuleOptions = CollisionUnitModuleOptions,
  Observables extends CollisionUnitModuleObservables =
    CollisionUnitModuleObservables,
  State extends CollisionUnitModuleState = CollisionUnitModuleState
> extends UnitModule<Options, State, Observables> {
  static override TYPE = 'collision';
  private localOBBs: OBB[] = [];
  private worldOBBs: OBB[] = [];
  private debugHelpers: (LineSegments | Box3Helper | null)[] = [];

  constructor(unit: Unit, options: Options, state: State, debug?: boolean) {
    super(
      unit,
      {
        ...options,
        type: options.type ?? COLLISION_TYPE.BLOCKED,
        targets: options.targets ?? []
      },
      {
        ...state
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
    await super.afterSetup();
    this.setupLocalOBBs();
    this.refreshWorldOBBs();

    if (this.debug) {
      this.createDebugHelpers();
      this.refreshDebugHelpers();
    }
  }

  getCollisionType() {
    return this.options.type;
  }
  getWorldOBBs() {
    return this.worldOBBs;
  }

  enableCollision() {
    this.getCollisionObjects().forEach(object => {
      if ('_ignorePathfinding' in object.userData) {
        object.userData.ignorePathfinding = object.userData._ignorePathfinding;
        delete object.userData._ignorePathfinding;
      } else {
        object.userData.ignorePathfinding = false;
      }
    });
  }

  disableCollision() {
    this.getCollisionObjects().forEach(object => {
      if (!('_ignorePathfinding' in object.userData)) {
        object.userData._ignorePathfinding = object.userData.ignorePathfinding;
      }
      object.userData.ignorePathfinding = true;
    });
  }

  getTargets(): Object3D[] {
    const result: Object3D[] = [];
    this.options.targets.forEach(targetConfig => {
      const obj = this.getUnit().root.getObjectByName(targetConfig.name);
      if (obj) {
        if (targetConfig.childIndex !== undefined) {
          const child = obj.children[targetConfig.childIndex];
          if (child) result.push(child);
        } else if (targetConfig.useChilds) {
          // Rekursiv alle Kinder sammeln (flach oder tief, je nach Bedarf)
          obj.traverse(child => result.push(child));
          result.splice(result.indexOf(obj), 1);
        } else {
          result.push(obj);
        }
      }
    });
    return result;
  }

  setupLocalOBBs() {
    const objects = this.getCollisionObjects();
    this.localOBBs = objects.map(obj => {
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

  refreshWorldOBBs() {
    const unit = this.getUnit();
    const objects = this.getCollisionObjects();

    const unitWorldMatrix = new Matrix4().compose(
      unit.getPosition(),
      unit.getYawQuaternion(),
      unit.root.scale
    );

    this.worldOBBs = this.localOBBs.map((localOBB, index) => {
      const obj = objects[index]!;

      const objWorldMatrix = new Matrix4();
      if (obj === unit.root) {
        objWorldMatrix.copy(unitWorldMatrix);
      } else {
        obj.updateWorldMatrix(true, false); // Aktualisiert die lokale Matrix
        objWorldMatrix.multiplyMatrices(unitWorldMatrix, obj.matrix);
      }

      const worldOBB = new OBB();
      worldOBB.halfSize.copy(localOBB.halfSize);

      worldOBB.center.copy(localOBB.center).applyMatrix4(objWorldMatrix);
      worldOBB.rotation.setFromMatrix4(objWorldMatrix);

      return worldOBB;
    });
  }

  lastCollision: { type: COLLISION_TYPE; target: Unit } | null = null;

  checkCollision() {
    const unit = this.getUnit();
    const cm1 = unit.modules.collision;
    if (!cm1) return COLLISION_TYPE.NONE;

    cm1.refreshWorldOBBs();
    cm1.refreshDebugHelpers();

    const units = unit.getMap()?.modules.units.getUnits() ?? [];

    for (let i = 0; i < units.length; i++) {
      const target = units[i]!;
      if (target === unit) continue;

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

    return COLLISION_TYPE.NONE;
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

  getWorldOBB() {
    return this.worldOBBs[0] || new OBB();
  }

  getCollisionObjects(): Object3D[] {
    const objs = this.getTargets();
    if (!objs.length) {
      objs.push(this.getUnit().root);
    }
    objs.forEach(obj => {
      obj.userData[OBJECT_USER_DATA.COLLISION_TYPE] = this.options.type;
    });
    return objs;
  }
}
