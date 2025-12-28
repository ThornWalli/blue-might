import { ConeGeometry, Mesh, MeshLambertMaterial } from 'three';

export function createBarrelTargetShoot({ color }: { color?: number } = {}) {
  const geometry = new ConeGeometry(0.1, 0.5, 8);
  geometry.rotateX(-Math.PI / 2);
  const barrelTargetShoot = new Mesh(
    geometry,
    new MeshLambertMaterial({
      color: color ?? 0xffffff,
      flatShading: true
    })
  );
  barrelTargetShoot.visible = false;

  return barrelTargetShoot;
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}
