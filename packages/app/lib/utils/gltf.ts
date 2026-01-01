import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import assetLoader from '@blue-might/app/services/assetLoader';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';
import type { MeshStandardMaterial, Object3D } from 'three';
import { Group, LinearSRGBColorSpace, Mesh, NearestFilter } from 'three';

import { OBJECT_NAME } from '../utils/object';
import { LOADER } from '../classes/AssetLoader';

export async function loadGltf(
  value: string | ArrayBuffer,
  parse?: boolean
): Promise<{
  scene: Object3D;
  object: Group;
  animations: GLTF['animations'];
}> {
  const gltf: GLTF = await assetLoader.add<GLTF>({
    loader: LOADER.GLTF,
    value,
    parse
  });

  const object = new Group();
  const scene = gltf.scene;
  scene.name = OBJECT_NAME.MESH;

  object.add(skeletonClone(scene));

  // clone materials
  object.traverse(child => {
    if (child instanceof Mesh && child.material) {
      if (Array.isArray(child.material)) {
        child.material = child.material.map(mat =>
          prepareMaterial(mat.clone())
        );
      } else {
        child.material = prepareMaterial(child.material.clone());
      }
    }
  });

  return { scene: scene, object, animations: gltf.animations };
}

function prepareMaterial(material: MeshStandardMaterial) {
  const texture = material.map;
  if (texture) {
    texture.minFilter = NearestFilter;
    texture.magFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = LinearSRGBColorSpace;
  }
  return material;
}
