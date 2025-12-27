import {
  type MeshStandardMaterial,
  type SkinnedMesh,
  Mesh,
  type Material,
  type Object3D,
  type Texture
} from 'three';

export interface ObjectName {
  BASE: 'base';
  UNIT: 'Unit';
  MESH: 'Mesh';
  MESH_OUTLINE: 'MeshOutline';
  MESH_ANIMATION: 'MeshAnimation';
  RAYCASTER: 'Raycaster';
}

export const OBJECT_NAME: ObjectName = {
  BASE: 'base',
  UNIT: 'Unit',
  MESH: 'Mesh',
  MESH_OUTLINE: 'MeshOutline',
  MESH_ANIMATION: 'MeshAnimation',
  RAYCASTER: 'Raycaster'
} as ObjectName;

export interface ObjectUserData {
  MAIN_OBJECT: string;
}

export const OBJECT_USER_DATA: ObjectUserData = {
  MAIN_OBJECT: 'mainObject'
} as ObjectUserData;

export function setMainObjectRecursive(object: Object3D, mainObject: Object3D) {
  object.traverse(o => {
    o.userData[OBJECT_USER_DATA.MAIN_OBJECT] = mainObject.id;
  });
}
export function disposeObject3D(object: Object3D): void {
  for (const child of object.children) {
    disposeObject3D(child);
  }

  const mesh = object as Mesh;

  mesh.removeFromParent();

  if (mesh.geometry) {
    mesh.geometry.dispose();
  }
  const material = mesh.material;
  if (material) {
    if (Array.isArray(material)) {
      for (const mat of material) disposeMaterial(mat);
    } else {
      disposeMaterial(material);
    }
  }
}

export function disposeMaterial(material: Material): void {
  for (const value of Object.values(material)) {
    const texture = value as Texture;
    if (texture && texture.isTexture) {
      texture.dispose();
    }
  }
  material.dispose();
}

// Hilfsfunktion, um alle Meshes der Map zu sammeln (füge das zur Map-Klasse hinzu)
export function getAllMeshes(object: Object3D) {
  const meshes: Object3D[] = [];
  object.traverse(child => {
    if (child instanceof Mesh) {
      meshes.push(child);
    }
  });
  return meshes;
}

export function disableRaycaster(object: Object3D) {
  object.traverse(child => {
    if (child instanceof Mesh) {
      child.raycast = () => false;
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
