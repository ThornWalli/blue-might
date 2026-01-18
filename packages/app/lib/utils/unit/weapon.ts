/* eslint-disable complexity */

import { ControlAction } from '../../classes/playerModule/Controls';
import type { UnitModules } from '../../classes/Unit';
import type Unit from '../../classes/Unit';
import type PlayerUnitModule from '../../classes/unitModule/Player';
import type WeaponUnitModule from '../../classes/unitModule/Weapon';
import type { WeaponSupportState } from '../../types/unit';

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
  if (!unit.modules.player) return {};

  const controls = unit.modules.player
    ?.getPlayer()
    ?.modules.controls.getControls();

  if (!controls) return;

  const velocity =
    unit.state.weaponVelocity[unit.modules.weapon.getSlotIndex()]!;

  let value = 0.005;
  if (controls[ControlAction.MODIFIER]) {
    value *= unit.state.weaponControlPrecision ?? 1;
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
