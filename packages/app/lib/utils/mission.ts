import type { Units } from '@blue-might/units';

import type { TargetType } from '../types/mission';
import type Faction from '../classes/Faction';

export interface TargetResult {
  name: string;
  type: TargetType;
  count: number;
  optionalCount: number;
  completes: number;
  optionalCompletes: number;
  failed: number;
  optionalFailed: number;
  unitKey: string;
  faction: Faction | undefined;
}

export function groupTargetsByUnit(
  targets: { type: TargetType; unit: Units; optional: boolean }[]
) {
  const grouped: TargetResult[] = [];
  for (const target of targets) {
    let existing = grouped.find(t => t.name === target.unit.name);
    if (!existing) {
      existing = {
        unitKey: target.unit.key,
        faction: target.unit.modules.faction.getFaction(),
        name: target.unit.name,
        type: target.type,
        count: 0,
        optionalCount: 0,
        completes: 0,
        optionalCompletes: 0,
        failed: 0,
        optionalFailed: 0
      };
      grouped.push(existing);
    }

    const optional = target.optional;

    existing[optional ? 'optionalCount' : 'count']++;

    const completesKey = optional ? 'optionalCompletes' : 'completes';
    if (target.type === 'rescue' && 'figure' in target.unit.modules) {
      if (target.unit.modules.figure.isRescueComplete()) {
        existing[completesKey]++;
      } else if (target.unit.modules.damage.isDestroyed()) {
        existing[optional ? 'optionalFailed' : 'failed']++;
      }
    }
    if (target.type === 'attack' && target.unit.modules.damage.isDestroyed()) {
      existing[completesKey]++;
    }
  }
  return grouped;
}
