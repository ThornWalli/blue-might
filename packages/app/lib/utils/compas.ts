import { MathUtils } from 'three';

// eslint-disable-next-line complexity
export function getCompassDisplayValue(rotateY: number, small?: boolean) {
  const deg = (-MathUtils.radToDeg(-Math.PI / 2 + rotateY) + 360) % 360;
  if (deg >= 337.5 || deg < 22.5) return small ? 'E' : 'North';
  if (deg < 67.5) return small ? 'SE' : 'Northeast';
  if (deg < 112.5) return small ? 'S' : 'East';
  if (deg < 157.5) return small ? 'SW' : 'Southeast';
  if (deg < 202.5) return small ? 'W' : 'West';
  if (deg < 247.5) return small ? 'NW' : 'Northwest';
  if (deg < 292.5) return small ? 'N' : 'North';
  return small ? 'NE' : 'Northeast';
}
