import type Unit from '../classes/Unit';

export function isUnitDestroyed(unit: Unit): boolean {
  return unit.modules.damage.isDestroyed();
}
