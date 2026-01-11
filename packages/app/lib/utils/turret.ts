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
  weaponAngles: { min: Vector2; max: Vector2 }[],
  rotationSpeed: number,
  objects: {
    head?: Object3D;
    barrels: Object3D[];
  }[],
  state: {
    weaponTargetRotation: Vector2[];
  },
  getRotation: (index: number) => Euler
): boolean {
  const { target, sourcePosition, index, weapon } = options;

  const head = objects[index]?.head;
  const barrels = objects[index]?.barrels;
  if (!shootModule || !target || !barrels) {
    return false;
  }

  const minAngle = weaponAngles[index]!.min;
  const maxAngle = weaponAngles[index]!.max;

  const targetPosition = target.getPosition();
  const delta = targetPosition.clone().sub(sourcePosition);
  const horizontalDistance = Math.sqrt(delta.x ** 2 + delta.z ** 2);
  const verticalDistance = delta.y;
  const rotation = getRotation(index);

  // Yaw immer direkt berechnen (keine Ballistik nötig)
  const targetYaw = normalizeAngle(Math.atan2(delta.x, delta.z) - rotation.y);
  const isYawInRange = targetYaw >= minAngle.y && targetYaw <= maxAngle.y;

  // Pitch: Direkte Linie für nahe Ziele, sonst vereinfachte Ballistik
  let targetPitch: number;
  if (horizontalDistance < 1.0) {
    // Direkte Linie für Nahbereich
    targetPitch = -Math.atan2(verticalDistance, horizontalDistance);
  } else {
    // Vereinfachte ballistische Elevation (niedriger Winkel)
    const g = Math.abs(shootModule.gravity.y);
    const v = weapon.projectile.speed * (1 - shootModule.airResistance);
    const discriminant =
      v ** 4 -
      g * (g * horizontalDistance ** 2 + 2 * verticalDistance * v ** 2);
    if (discriminant >= 0) {
      const sqrtDisc = Math.sqrt(discriminant);
      targetPitch = -Math.atan((v ** 2 - sqrtDisc) / (g * horizontalDistance));
    } else {
      // Fallback auf direkte Linie, wenn kein Treffer möglich
      targetPitch = -Math.atan2(verticalDistance, horizontalDistance);
    }
  }

  // Immer begrenzen
  targetPitch = Math.max(minAngle.x, Math.min(maxAngle.x, targetPitch));
  const isPitchInRange = targetPitch >= minAngle.x && targetPitch <= maxAngle.x;

  // Debug-Log (entfernen nach Test)
  // console.log(
  //   `Yaw: ${targetYaw.toFixed(3)}, Pitch: ${targetPitch.toFixed(3)}, Dist: ${horizontalDistance.toFixed(2)}, Vert: ${verticalDistance.toFixed(2)}`
  // );

  if (isYawInRange && isPitchInRange && horizontalDistance >= 0.96) {
    state.weaponTargetRotation[index]!.set(targetYaw, targetPitch);

    // Rotation setzen (vereinfacht)
    if (head) {
      // Tank/Turret
      head.rotation.y = lerp(head.rotation.y, targetYaw, rotationSpeed);
      barrels.forEach((barrel, i) => {
        barrel!.rotation.x = lerp(
          barrel!.rotation.x,
          i === 0 ? targetPitch : targetPitch,
          rotationSpeed
        );
      });
    } else if (Array.isArray(barrels)) {
      // Ship/Heli
      const [barrelObjX, barrelObjY] = barrels;
      if (barrelObjX && barrelObjY) {
        barrelObjY.rotation.y = lerp(
          barrelObjY.rotation.y,
          targetYaw,
          rotationSpeed
        );
        barrelObjX.rotation.x = lerp(
          barrelObjX.rotation.x,
          targetPitch,
          rotationSpeed
        );
      }
    }

    return true;
  }

  return false;
}
