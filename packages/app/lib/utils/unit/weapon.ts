/* eslint-disable complexity */

import { lerp } from 'three/src/math/MathUtils.js';
import { type Vector2, type Object3D, Vector3, Box3 } from 'three';
import { Euler, Quaternion } from 'three';

import { ControlAction } from '../../classes/playerModule/Controls';
import type { UnitModules } from '../../classes/Unit';
import type Unit from '../../classes/Unit';
import type PlayerUnitModule from '../../classes/unitModule/Player';
import type WeaponUnitModule from '../../classes/unitModule/Weapon';
import type { WeaponSupportState } from '../../types/unit';
import type ShootModule from '../../classes/mapModule/Shoot';
import type { AutoAimFnOptions } from '../../classes/unitModule/Weapon';
import type Projectile from '../../classes/Projectile';
import type { ProjectileInstance } from '../../classes/Projectile';
import type AttackUnitModule from '../../classes/unitModule/Attack';

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

  let value = 0.0025;
  if (controls[ControlAction.MODIFIER]) {
    value *= unit.state.weaponControlPrecision ?? 1 / 4;
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

//#region aim

const MAX_PROJECTILE_DISTANCE = 1 / 3;

function simulateProjectile(
  projectileInstance: ProjectileInstance<Projectile>,
  attackModule: AttackUnitModule,
  shootModule: ShootModule,
  sourcePosition: Vector3,
  sourceDirection: Vector3,
  targetPosition: Vector3,
  temps: {
    position: Vector3;
    velocity: Vector3;
  }
) {
  temps.position.copy(sourcePosition);
  temps.velocity
    .copy(sourceDirection)
    .multiplyScalar(projectileInstance.projectile.speed);

  const delta = 0.016;
  const maxSteps = 1000;

  let time = 0;
  for (let step = 0; step < maxSteps; step++) {
    projectileInstance.update({
      time,
      delta,
      gravity: shootModule.gravity,
      velocity: temps.velocity,
      position: temps.position,
      targetPosition
    });
    time += delta;

    const distance = temps.position.distanceTo(targetPosition);

    if (distance < MAX_PROJECTILE_DISTANCE) {
      return true;
    } else if (distance > attackModule.getAttackRadius()) {
      return false;
    }
  }
  return false;
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
  const {
    target,
    sourcePosition: unitSourcePosition,
    index,
    weapon,
    attackModule,
    weaponModule,
    temps
  } = options;

  const head = objects[index]?.head;
  const barrels = objects[index]?.barrels;
  if (!shootModule || !target || !barrels) {
    return false;
  }

  const originalMinAngle = weaponAngles[index]!.min;
  const originalMaxAngle = weaponAngles[index]!.max;

  const minAngle = originalMinAngle.clone();
  const maxAngle = originalMaxAngle.clone();

  // center from target
  const targetPosition = getCenter(target.root);

  const delta = targetPosition.clone().sub(unitSourcePosition);
  const yawEuler = getRotation(index).clone();
  const pitchRollEuler = getPitchRoll
    ? getPitchRoll(index).clone()
    : new Euler(0, 0, 0);

  const fullRotation = new Quaternion()
    .setFromEuler(yawEuler)
    .multiply(new Quaternion().setFromEuler(pitchRollEuler));

  const deltaLocal = delta
    .clone()
    .applyQuaternion(fullRotation.clone().invert());

  const targetYaw = normalizeAngle(Math.atan2(deltaLocal.x, deltaLocal.z));

  const withLerp = true;

  const setVerticalAim = (v: number, withLerp = true) => {
    let result = 0;
    if (head) {
      barrels.forEach(barrel => {
        result = barrel.rotation.x = withLerp
          ? lerp(barrel.rotation.x, v, rotationSpeed)
          : v;
      });
    } else if (Array.isArray(barrels)) {
      const [barrelObjX] = barrels;
      if (!barrelObjX) return false;
      result = barrelObjX.rotation.x = withLerp
        ? lerp(barrelObjX.rotation.x, v, rotationSpeed)
        : v;
    }
    state.weaponTargetRotation[index]!.setX(result);
  };

  const setHorizontalAim = (v: number, withLerp = true) => {
    let result = 0;
    if (head) {
      result = head.rotation.y = withLerp
        ? lerp(head.rotation.y, v, rotationSpeed)
        : v;
    } else if (Array.isArray(barrels)) {
      const [_, barrelObjY] = barrels;
      if (!barrelObjY) return false;
      result = barrelObjY.rotation.y = withLerp
        ? lerp(barrelObjY.rotation.y, v, rotationSpeed)
        : v;
    }

    state.weaponTargetRotation[index]!.setY(result);
  };

  setHorizontalAim(targetYaw, withLerp);

  const isInYaw =
    Math.abs(targetYaw - ((head ? head : barrels[1])?.rotation.y ?? Infinity)) <
    0.05;

  if (isInYaw) {
    const projectileInstance = weapon.projectile.create();
    projectileInstance.updateOptions = weapon.projectile.getUpdateOptions();

    const pitchValidFn = (pitch: number) => {
      weaponModule.updateSourcePosition(index);
      const [sourcePosition] = weaponModule.getSourcePositions();
      const [sourceDirection] = weaponModule.getSourceDirections();
      if (!sourcePosition || !sourceDirection) return false;

      setVerticalAim(pitch, false);

      const isInPitch = simulateProjectile(
        projectileInstance,
        attackModule,
        shootModule,
        sourcePosition,
        sourceDirection,
        targetPosition,
        temps
      );

      return isInPitch;
    };

    const last = state.weaponTargetRotation[index]?.x ?? 0;
    /**
     * Aktueller Pitch ist noch gültig?
     */
    if (pitchValidFn(state.weaponTargetRotation[index]?.x ?? 0)) {
      return true;
    } else {
      const range = Math.abs(minAngle.x - maxAngle.x);
      const steps = 25;
      const rangeStep = range / steps;

      let isInPitch = false;

      for (let i = 0; i <= steps; i += 1) {
        let pitch = 0;
        if (weaponAngles[index]?.revert) {
          pitch = minAngle.x + rangeStep * i;
        } else {
          pitch = maxAngle.x - rangeStep * i;
        }

        isInPitch = pitchValidFn(pitch);

        if (isInPitch) {
          return isInPitch;
        }
      }
      if (!isInPitch) {
        setVerticalAim(last, false);
      }
    }
  }
  return false;
}

//#endregion

function getCenter(obj: Object3D): Vector3 {
  const box = new Box3().setFromObject(obj);
  const center = new Vector3();
  box.getCenter(center);
  return center;
}
