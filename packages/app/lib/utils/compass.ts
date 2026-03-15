import { MathUtils } from 'three';

// eslint-disable-next-line complexity
export function getCompassDisplayValue(rotateY: number, small?: boolean) {
  let deg = (-MathUtils.radToDeg(-Math.PI / 2 + rotateY) + 360) % 360;
  const offset = 360 / 8;
  if (deg < 0) {
    deg += 360;
  }
  if (offset * 7 < deg + offset / 2 && offset * 7 > deg - offset / 2) {
    return small ? 'NE' : 'NorthEast';
  } else if (offset * 6 < deg + offset / 2 && offset * 6 > deg - offset / 2) {
    return small ? 'N' : 'North';
  } else if (offset * 5 < deg + offset / 2 && offset * 5 > deg - offset / 2) {
    return small ? 'NW' : 'NorthWest';
  } else if (offset * 4 < deg + offset / 2 && offset * 4 > deg - offset / 2) {
    return small ? 'W' : 'West';
  } else if (offset * 3 < deg + offset / 2 && offset * 3 > deg - offset / 2) {
    return small ? 'SW' : 'SouthWest';
  } else if (offset * 2 < deg + offset / 2 && offset * 2 > deg - offset / 2) {
    return small ? 'S' : 'South';
  } else if (offset * 1 < deg + offset / 2 && offset * 1 > deg - offset / 2) {
    return small ? 'SE' : 'SouthEast';
  } else if (offset * 0 < deg + offset / 2 && offset * 0 > 0 - offset / 2) {
    return small ? 'E' : 'East';
  }

  return 'N/A';
}
