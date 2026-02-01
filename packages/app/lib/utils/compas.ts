import { MathUtils } from 'three';

export function getCompassDisplayValue(rotateY: number) {
  const deg = (-MathUtils.radToDeg(-Math.PI / 2 + rotateY) + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return 'E'; // return 'N';
  if (deg < 67.5) return 'SE'; // return 'NE';
  if (deg < 112.5) return 'S'; // return 'E';
  if (deg < 157.5) return 'SW'; // return 'SE';
  if (deg < 202.5) return 'W'; // return 'S';
  if (deg < 247.5) return 'NW'; // return 'SW';
  if (deg < 292.5) return 'N'; // return 'W';
  return 'NE';
}
