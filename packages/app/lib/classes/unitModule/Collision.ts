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
import UnitModule, { type UnitModuleOptions } from '../UnitModule';
import { OBB } from 'three/examples/jsm/math/OBB.js';

export interface CollisionUnitModuleOptions extends UnitModuleOptions {
  targetName: string;
  targetChildIndex?: number;
}

export default class CollisionUnitModule extends UnitModule {
  static override TYPE = 'collision';

  override debug = true;

  localOBB = new OBB();
  worldOBB = new OBB();
  debugHelper: LineSegments | Box3Helper | null = null;

  override async setup() {
    const unit = this.getUnit();

    // Erstelle einen Box-Helper für OBB (mit Rotation)
    const geometry = new BoxGeometry(1, 1, 1);
    const edges = new EdgesGeometry(geometry);

    if (this.debug) {
      this.debugHelper = new LineSegments(
        edges,
        new LineBasicMaterial({ color: 0xff0000 })
      );

      const map = unit.getMap();
      if (this.debugHelper && map) map.app.renderer.scene.add(this.debugHelper);
    }
  }

  override async afterSetup() {
    this.setupLocalOBB();
    this.refreshWorldOBB();
    this.refreshDebugHelper();
  }

  getTarget() {
    const { targetName, targetChildIndex } = this
      .options as CollisionUnitModuleOptions;
    const target = this.getUnit().root.getObjectByName(targetName);

    if (targetChildIndex !== undefined) {
      const children = target?.children[targetChildIndex] || null;
      if (!children) {
        console.warn(
          `CollisionUnitModule: Child index ${targetChildIndex} does not exist on target '${targetName}'.`
        );
      }
      return children;
    }
    return target || null;
  }

  getCollisionObject() {
    return this.getTarget() || this.getUnit().root;
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
    const object = this.getCollisionObject();

    object.updateMatrixWorld(true);

    const rotMatrix = new Matrix4().extractRotation(object.matrixWorld);

    this.worldOBB.halfSize.copy(this.localOBB.halfSize);
    this.worldOBB.rotation.setFromMatrix4(rotMatrix);
    this.worldOBB.center
      .copy(this.localOBB.center)
      .applyMatrix4(object.matrixWorld);
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

  override destroy() {
    if (this.debugHelper) {
      this.debugHelper.geometry.dispose();
      (this.debugHelper.material as LineBasicMaterial).dispose();
      this.debugHelper.removeFromParent();
    }
    super.destroy();
  }
}
