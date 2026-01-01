import { Color } from 'three';

export function getColor(color: number | string | Color) {
  if (typeof color === 'number') {
    color = new Color(color);
  } else if (typeof color === 'string') {
    color = new Color(color);
  } else {
    color = color.clone();
  }
  return color.convertLinearToSRGB();
}
