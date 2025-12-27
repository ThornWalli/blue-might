import { Mesh, MeshLambertMaterial, PlaneGeometry } from 'three';

export function createGround(options?: { color?: number }) {
  const ground = new Mesh(
    new PlaneGeometry(100, 100),
    new MeshLambertMaterial({
      color: options?.color ?? 0xcccccc,
      flatShading: true
    })
  );

  ground.receiveShadow = true;

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;
  return ground;
}
