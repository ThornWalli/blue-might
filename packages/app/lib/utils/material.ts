import {
  Mesh,
  type MeshStandardMaterial,
  SkinnedMesh,
  type Object3D
} from 'three';

export function setDestroyedMaterials(
  object: Object3D,
  darkenFactor: number = 0.25
) {
  object.traverse(child => {
    if (child instanceof Mesh || child instanceof SkinnedMesh) {
      if (child.material && 'color' in child.material) {
        child.material.color.multiplyScalar(darkenFactor);
        child.material.needsUpdate = true;
      }
    }
  });
}

export function replaceColors(
  colorReplace: [string, number][],
  object: Mesh | SkinnedMesh
) {
  colorReplace.forEach(([name, color]) => {
    const material = object.material as MeshStandardMaterial;
    if (material.name === name) {
      material.color.set(color);
      material.needsUpdate = true;
    }
  });
}
