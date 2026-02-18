/* eslint-disable complexity */

import { lerp } from 'three/src/math/MathUtils.js';
import type { Euler, Object3D, Vector2 } from 'three';

import { ControlAction } from '../../classes/playerModule/Controls';
import type { UnitModules } from '../../classes/Unit';
import type Unit from '../../classes/Unit';
import type PlayerUnitModule from '../../classes/unitModule/Player';
import type WeaponUnitModule from '../../classes/unitModule/Weapon';
import type { WeaponSupportState } from '../../types/unit';
import type ShootModule from '../../classes/mapModule/Shoot';
import type { AutoAimFnOptions } from '../../classes/unitModule/Weapon';

export abstract class WeaponUnitInterface<State extends WeaponSupportState> {
  state: State = {
    weaponActive: false
  } as State;
}

export function updateControls(
  unit: Unit<
    UnitModules & {
      player: PlayerUnitModule;
      weapon: WeaponUnitModule;
    }
  > & {
    state: WeaponSupportState;
  }
) {
  if (!unit.modules.player || unit.modules.damage.isDestroyed()) return;

  const controls = unit.modules.player
    ?.getPlayer()
    ?.modules.controls.getControls();

  if (!controls) return;

  const velocity =
    unit.state.weaponVelocity[unit.modules.weapon.getSlotIndex()]!;

  let value = 0.005;
  if (controls[ControlAction.MODIFIER]) {
    value *= unit.state.weaponControlPrecision ?? 1 / 3;
  }

  if (controls[ControlAction.UP]) {
    velocity.y -= value;
  }
  if (controls[ControlAction.DOWN]) {
    velocity.y += value;
  }
  if (controls[ControlAction.LEFT]) {
    velocity.x += value;
  }
  if (controls[ControlAction.RIGHT]) {
    velocity.x -= value;
  }

  if (unit.modules.weapon.isAutoAimActive()) return;
  if (controls[ControlAction.FIRE_PRIMARY]) {
    unit.modules.weapon.shoot();
  } else {
    unit.modules.weapon.abortShoot();
  }
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

export function autoAimFunction(
  shootModule: ShootModule,
  options: AutoAimFnOptions,
  weaponAngles: { revert?: boolean; min: Vector2; max: Vector2 }[],
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
  const rotation = getRotation(index).clone();

  if (weaponAngles[index]?.revert) {
    rotation.y += Math.PI;
  }
  // Yaw immer direkt berechnen (keine Ballistik nötig)
  const targetYaw = normalizeAngle(Math.atan2(delta.x, delta.z) - rotation.y);

  const isYawInRange = targetYaw >= minAngle.y && targetYaw <= maxAngle.y;

  // Pitch: Direkte Linie für nahe Ziele, sonst vereinfachte Ballistik
  let targetPitch: number;
  const isBallistic =
    weapon.projectile.airResistance > 0 || weapon.projectile.weight > 0;
  if (horizontalDistance < 1.0 || !isBallistic) {
    // Direkte Linie für Nahbereich oder gerade fliegende Projektille (z.B. Raketen)
    targetPitch = -Math.atan2(verticalDistance, horizontalDistance);
  } else {
    // Ballistische Elevation für Projektille mit Gravitation/Luftwiderstand
    const g = Math.abs(shootModule.gravity.y);
    const v = weapon.projectile.speed * (1 - shootModule.airResistance);
    const discriminant =
      v ** 4 -
      g * (g * horizontalDistance ** 2 + 2 * verticalDistance * v ** 2);
    if (discriminant >= 0) {
      const sqrtDisc = Math.sqrt(discriminant);
      // Verwende den niedrigeren Winkel für flachere Flugbahn (low-angle)
      targetPitch = -Math.atan((v ** 2 - sqrtDisc) / (g * horizontalDistance));
    } else {
      targetPitch = -Math.atan2(verticalDistance, horizontalDistance);
    }
  }

  targetPitch = Math.max(minAngle.x, Math.min(maxAngle.x, targetPitch));
  const isPitchInRange = targetPitch >= minAngle.x && targetPitch <= maxAngle.x;
  // console.log(
  //   `Yaw: ${targetYaw.toFixed(3)}, Pitch: ${targetPitch.toFixed(3)}, Rotation.y: ${rotation.y.toFixed(3)}, Dist: ${horizontalDistance.toFixed(2)}`
  // );

  if (isYawInRange && isPitchInRange && horizontalDistance >= 0.9) {
    state.weaponTargetRotation[index]!.set(targetYaw, targetPitch);

    const rotationThreshold = 0.01;
    let isRotationComplete = false;

    if (head) {
      head.rotation.y = lerp(head.rotation.y, targetYaw, rotationSpeed);
      barrels.forEach((barrel, i) => {
        barrel!.rotation.x = lerp(
          barrel!.rotation.x,
          i === 0 ? targetPitch : targetPitch,
          rotationSpeed
        );
      });
      const yawDiff = Math.abs(head.rotation.y - targetYaw);
      const pitchDiff = Math.abs(barrels[0]!.rotation.x - targetPitch);
      isRotationComplete =
        yawDiff < rotationThreshold && pitchDiff < rotationThreshold;
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
        const yawDiff = Math.abs(barrelObjY.rotation.y - targetYaw);
        const pitchDiff = Math.abs(barrelObjX.rotation.x - targetPitch);
        isRotationComplete =
          yawDiff < rotationThreshold && pitchDiff < rotationThreshold;
      }
    }

    return isRotationComplete;
  }

  return false;
}
