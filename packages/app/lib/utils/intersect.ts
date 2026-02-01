import type { Sphere } from 'three';

import type Unit from '../classes/Unit';

export function intersect<U extends Unit>({
  unit,
  sphere,
  radius
}: {
  unit: U;
  sphere: Sphere;
  radius: number;
}) {
  const collisionModule = unit.modules.collision;
  if (collisionModule) {
    // Hole die Welt-Bounding Box der Ziel-Unit
    const targetBox = collisionModule.getWorldOBB();
    if (targetBox.intersectsSphere(sphere)) {
      return unit;
    }
  } else {
    // Fallback: Prüfe Distanz zur Position, wenn kein Kollisionsmodul vorhanden
    const distance = unit.getPosition().distanceTo(unit.getPosition());
    if (distance <= radius) {
      return unit;
    }
  }
}
