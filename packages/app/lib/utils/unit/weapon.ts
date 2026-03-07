/* eslint-disable complexity */

import { lerp } from 'three/src/math/MathUtils.js';
import { Euler, Quaternion, type Object3D, type Vector2 } from 'three';

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

  if (unit.modules.weapon.hasAutopilotShoot()) return;
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
  getRotation: (index: number) => Euler,
  getPitchRoll?: (index: number) => Euler
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

  // Vollständige Rotation der Unit kombinieren (Yaw + Pitch + Roll)
  const yawEuler = getRotation(index).clone(); // Euler(0, yaw, 0)
  const pitchRollEuler = getPitchRoll
    ? getPitchRoll(index).clone()
    : new Euler(0, 0, 0); // Euler(pitch, 0, roll)

  // Kombiniere zu Quaternion: Zuerst Yaw, dann Pitch/Roll
  const fullRotation = new Quaternion()
    .setFromEuler(yawEuler)
    .multiply(new Quaternion().setFromEuler(pitchRollEuler));

  // Delta-Vektor in lokalen Raum der Unit transformieren
  const deltaLocal = delta
    .clone()
    .applyQuaternion(fullRotation.clone().invert());

  // Berücksichtige Revert (falls nötig, z. B. für bestimmte Waffen)
  if (weaponAngles[index]?.revert) {
    deltaLocal.x = -deltaLocal.x; // Spiegelung für revert
    deltaLocal.z = -deltaLocal.z;
  }

  // Zielwinkel basierend auf lokalem Vektor berechnen
  const targetYaw = normalizeAngle(Math.atan2(deltaLocal.x, deltaLocal.z));
  const horizontalLocal = Math.sqrt(deltaLocal.x ** 2 + deltaLocal.z ** 2);
  const verticalLocal = deltaLocal.y;

  // Pitch-Berechnung (direkt oder ballistisch)
  let targetPitch: number;
  const isBallistic =
    weapon.projectile.airResistance > 0 || weapon.projectile.weight > 0;
  if (horizontalLocal < 1.0 || !isBallistic) {
    // Direkte Linie für Nahbereich oder gerade Projektille
    targetPitch = -Math.atan2(verticalLocal, horizontalLocal);
  } else {
    // Ballistische Elevation (vereinfacht, basierend auf lokalem Vektor)
    const g = Math.abs(shootModule.gravity.y);
    const v =
      weapon.projectile.speed *
      (1 - shootModule.airResistance * weapon.projectile.airResistance);
    const discriminant =
      v ** 4 - g * (g * horizontalLocal ** 2 + 2 * verticalLocal * v ** 2);
    if (discriminant >= 0) {
      const sqrtDisc = Math.sqrt(discriminant);
      targetPitch = -Math.atan((v ** 2 - sqrtDisc) / (g * horizontalLocal));
    } else {
      targetPitch = -Math.atan2(verticalLocal, horizontalLocal);
    }
  }

  // Winkel auf Bereiche begrenzen
  targetPitch = Math.max(minAngle.y, Math.min(maxAngle.y, targetPitch));
  const isYawInRange = targetYaw >= minAngle.y && targetYaw <= maxAngle.y;
  const isPitchInRange = targetPitch >= minAngle.x && targetPitch <= maxAngle.x;
  // console.log(
  //   `Yaw: ${targetYaw.toFixed(3)}, Pitch: ${targetPitch.toFixed(3)}, Rotation.y: ${rotation.y.toFixed(3)}, Dist: ${horizontalDistance.toFixed(2)}`
  // );

  if (isYawInRange && isPitchInRange && horizontalLocal >= 0.9) {
    state.weaponTargetRotation[index]!.set(targetYaw, targetPitch);

    const rotationThreshold = 0.08; // Verringert für schnellere Reaktion
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
