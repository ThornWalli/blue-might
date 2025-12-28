import type { Box3Helper } from 'three';
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

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CollisionUnitModuleObservables extends UnitModuleObservables {}

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
  targetName: string;
  targetChildIndex?: number;
}

export default class CollisionUnitModule<
  Options extends CollisionUnitModuleOptions = CollisionUnitModuleOptions,
  Observables extends CollisionUnitModuleObservables =
    CollisionUnitModuleObservables,
  State extends CollisionUnitModuleState = CollisionUnitModuleState
> extends UnitModule<Options, State, Observables> {
  static override TYPE = 'collision';
  private localOBB = new OBB();
  private worldOBB = new OBB();
  private debugHelper: LineSegments | Box3Helper | null = null;

  constructor(unit: Unit, options: Options, state: State, debug?: boolean) {
    super(
      unit,
      {
        ...options,
        type: options.type ?? COLLISION_TYPE.BLOCKED
      },
      {
        ...state
      },
      debug
    );
  }

  override destroy() {
    if (this.debugHelper) {
      this.debugHelper.geometry.dispose();
      (this.debugHelper.material as LineBasicMaterial).dispose();
      this.debugHelper.removeFromParent();
    }
    super.destroy();
  }

  override async setup() {
    if (this.debug) {
      this.createDebugHelper();
    }
  }

  override async afterSetup() {
    this.setupLocalOBB();
    this.refreshWorldOBB();
    this.refreshDebugHelper();
  }

  getCollisionType() {
    return this.options.type;
  }
  getWorldOBB() {
    return this.worldOBB;
  }

  enableCollision() {
    this.getCollisionObject().userData.ignorePathfinding = false;
  }

  disableCollision() {
    this.getCollisionObject().userData.ignorePathfinding = true;
  }

  getTarget() {
    const { targetName, targetChildIndex } = this
      .options as CollisionUnitModuleOptions;
    const target = this.getUnit().root.getObjectByName(targetName);

    if (targetChildIndex !== undefined) {
      const children = target?.children[targetChildIndex] || null;
      // if (!children) {
      //   console.warn(
      //     `CollisionUnitModule: Child index ${targetChildIndex} does not exist on target '${targetName}'.`
      //   );
      // }
      return children;
    }
    return target || null;
  }

  getCollisionObject() {
    const obj = this.getTarget() || this.getUnit().root;
    obj.userData[OBJECT_USER_DATA.COLLISION_TYPE] = this.options.type;
    return obj;
  }

  setupLocalOBB() {
    const object = this.getCollisionObject();
    object.updateMatrixWorld(true);

    const aabb = new Box3().setFromObject(object);

    const size = new Vector3();
    aabb.getSize(size);

    const center = new Vector3();
    aabb.getCenter(center);

    this.localOBB.halfSize.copy(size).multiplyScalar(0.5);
    this.localOBB.center.copy(center).sub(object.position);
    this.localOBB.rotation.identity();
  }
  refreshWorldOBB() {
    const unit = this.getUnit();
    const object = this.getCollisionObject();
    // Lokale OBB bleibt vom Mesh/AABB abgeleitet
    // Für die Welt-OBB: nur Yaw berücksichtigen, Pitch/Roll ignorieren
    // und die Y-Position stabil halten (z. B. die aktuelle _position.y).
    object.updateMatrixWorld(true);
    const yawQuat = unit.getYawQuaternion();
    const worldMatrix = new Matrix4()
      .makeRotationFromQuaternion(yawQuat)
      .setPosition(unit.getPosition()); // x,y,z
    this.worldOBB.rotation.setFromMatrix4(worldMatrix);
    this.worldOBB.center.copy(this.localOBB.center).applyMatrix4(worldMatrix);
    this.worldOBB.halfSize.copy(this.localOBB.halfSize);
  }

  //#region debug
  createDebugHelper() {
    const unit = this.getUnit();

    // Erstelle einen Box-Helper für OBB (mit Rotation)
    const geometry = new BoxGeometry(1, 1, 1);
    const edges = new EdgesGeometry(geometry);

    this.debugHelper = new LineSegments(
      edges,
      new LineBasicMaterial({ color: 0xff0000 })
    );

    const map = unit.getMap();
    if (this.debugHelper && map) map.app.getScene().add(this.debugHelper);
  }
  refreshDebugHelper() {
    if (!this.debugHelper || !this.worldOBB) return;

    this.debugHelper.position.copy(this.worldOBB.center);
    this.debugHelper.rotation.setFromRotationMatrix(
      new Matrix4().setFromMatrix3(this.worldOBB.rotation)
    );

    this.debugHelper.scale.copy(
      this.worldOBB.halfSize.clone().multiplyScalar(2)
    );

    this.debugHelper.updateMatrixWorld(true);
  }

  //#endregion
}
