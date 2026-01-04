/* eslint-disable complexity */
import type { Euler, Object3D, Vector2 } from 'three';
import {
  Box3,
  CylinderGeometry,
  Mesh,
  MeshLambertMaterial,
  Vector3
} from 'three';
import { lerp } from 'three/src/math/MathUtils.js';

import type { AutoAimFnOptions } from '../classes/unitModule/Weapon';
import type ShootModule from '../classes/mapModule/Shoot';

export function createBarrelTargetShoot({
  object,
  color
}: { object?: Object3D; color?: number } = {}) {
  let geometry;
  if (object) {
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const factor = Math.min(size.x, size.y, size.z);
    geometry = new CylinderGeometry(factor * 4, factor * 8, factor * 30);
  } else geometry = new CylinderGeometry(0.05, 0.075, 0.3);
  geometry.translate(0, -geometry.parameters.height / 2, 0);
  geometry.rotateX(-Math.PI / 2);
  const barrelTargetShoot = new Mesh(
    geometry,
    new MeshLambertMaterial({
      color: color ?? 0xffffff,
      flatShading: true
    })
  );
  barrelTargetShoot.visible = false;

  return barrelTargetShoot;
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

export function autoAimFunction(
  shootModule: ShootModule,
  options: AutoAimFnOptions,
  minAngle: Vector2,
  maxAngle: Vector2,
  rotationSpeed: number,
  objects: {
    head?: Object3D;
    barrels: Object3D[];
  },
  state: {
    weaponTargetRotation: Vector2;
  },
  getRotation: () => Euler
): boolean {
  const { target, sourcePosition, index, weapon } = options;

  if (shootModule && target && objects.barrels[index]) {
    const targetPosition = target.getPosition();
    const delta = targetPosition.clone().sub(sourcePosition);
    const horizontalDistance = Math.sqrt(delta.x ** 2 + delta.z ** 2);
    const verticalDistance = delta.y;

    const g = Math.abs(shootModule.gravity.y);
    const v = weapon.projectile.speed * (1 - shootModule.airResistance);
    const rotation = getRotation();

    const discriminant =
      v ** 4 -
      g * (g * horizontalDistance ** 2 + 2 * verticalDistance * v ** 2);

    let targetYaw: number;
    let targetPitch: number;

    if (discriminant < 0) {
      // Zielen mit direkter Linie
      targetYaw = normalizeAngle(Math.atan2(delta.x, delta.z) - rotation.y);
      targetPitch = -Math.atan2(delta.y, horizontalDistance);
    } else {
      // Elevation berechnen
      const sqrtDisc = Math.sqrt(discriminant);
      let elevation = Math.atan((v ** 2 - sqrtDisc) / (g * horizontalDistance));
      elevation = -elevation;
      elevation = Math.max(minAngle.y, Math.min(maxAngle.y, elevation));

      const horizontalDirection = new Vector3(delta.x, 0, delta.z).normalize();
      targetYaw = normalizeAngle(
        Math.atan2(horizontalDirection.x, horizontalDirection.z) - rotation.y
      );
      targetPitch = elevation;
    }

    const isYawInRange = targetYaw >= minAngle.x && targetYaw <= maxAngle.x;
    const isPitchInRange =
      targetPitch >= minAngle.y && targetPitch <= maxAngle.y;

    if (isYawInRange && isPitchInRange && horizontalDistance >= 0.96) {
      state.weaponTargetRotation.set(targetYaw, targetPitch);

      // Rotation anpassen (unterschiedlich je nach Unit)
      if (objects.head) {
        // Für Tank/Turret
        if (objects.head) {
          objects.head.rotation.y = lerp(
            objects.head.rotation.y,
            state.weaponTargetRotation.x,
            rotationSpeed
          );
        }
        objects.barrels[index]!.rotation.x = lerp(
          objects.barrels[index]!.rotation.x,
          state.weaponTargetRotation.y,
          rotationSpeed
        );
      } else if (
        objects.barrels[index] &&
        Array.isArray(objects.barrels[index])
      ) {
        // Für Ship/Heli: barrels[index] = [barrelObjX, barrelObjY]
        const [barrelObjX, barrelObjY] = objects.barrels[index];
        barrelObjY.rotation.y = lerp(
          barrelObjY.rotation.y,
          state.weaponTargetRotation.x,
          rotationSpeed
        );
        barrelObjX.rotation.x = lerp(
          barrelObjX.rotation.x,
          state.weaponTargetRotation.y,
          rotationSpeed
        );
      }

      return true;
    }
  }
  return false;
}
