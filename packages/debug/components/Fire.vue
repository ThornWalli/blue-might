<template>
  <div>
    <client-only>
      <three-debug
        :camera-zoom="params.cameraZoom"
        :background="0x000000"
        :setup-scene="onSetupScene"
        :update-animation="onUpdateAnimation"
        :destroy="onDestroy" />
    </client-only>
  </div>
</template>
<script setup lang="ts">
import ThreeDebug from '@blue-might/app/components/ThreeDebug.vue';
import { disposeObject3D } from '@blue-might/app/lib/utils/object';
import { NearestFilter, Vector3, type Scene, type Texture } from 'three';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';
import { reactive } from 'vue';
import textureFire from '@blue-might/app/assets/fire/fire.png?url';
import textureSmoke from '@blue-might/app/assets/fire/smoke.png?url';
import assetLoader from '@blue-might/app/services/assetLoader';
import { LOADER } from '@blue-might/app/lib/classes/AssetLoader';
import { Particle } from '@blue-might/app/lib/classes/Particle';

import { createGround } from '../utils';

let gui: GUI;
const params = reactive({
  cameraZoom: 1
});

const particles: Particle[] = [];
let fireTexture: Texture;
let smokeTexture: Texture;

async function onSetupScene(scene: Scene) {
  scene.add(
    createGround({
      color: 0x205010
    })
  );

  await loadTextures();
  setupGUI();
}

async function loadTextures() {
  fireTexture = await assetLoader.add<Texture>({
    value: textureFire,
    loader: LOADER.TEXTURE
  });
  smokeTexture = await assetLoader.add<Texture>({
    value: textureSmoke,
    loader: LOADER.TEXTURE
  });

  [fireTexture, smokeTexture].forEach(tex => {
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
  });
}

function spawnFire(scene: Scene) {
  const p = new Particle(
    fireTexture,
    new Vector3(0, 0, 0),
    0.5 + Math.random() * 0.3
  );

  p.velocity.set(
    (Math.random() - 0.5) * 0.2,
    1.5 + Math.random(),
    (Math.random() - 0.5) * 0.2
  );

  scene.add(p.sprite);
  particles.push(p);
}

function _spawnSmoke(scene: Scene) {
  const p = new Particle(smokeTexture, new Vector3(0, 1, 0), 0.8);

  p.velocity.set((Math.random() - 0.5) * 0.1, 0.6, (Math.random() - 0.5) * 0.1);

  p.sprite.material.opacity = 0.6;

  scene.add(p.sprite);
  particles.push(p);
}

function onUpdateAnimation({ scene }: { scene: Scene }) {
  const dt = 0.016;

  if (Math.random() < 0.4) spawnFire(scene);
  // if (Math.random() < 0.12) spawnSmoke(scene);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]!;
    p.update(dt);

    // Feuer schmaler, Rauch größer
    if (p.sprite.material.map === fireTexture) {
      p.sprite.scale.multiplyScalar(0.97);
    } else {
      p.sprite.scale.multiplyScalar(1.01);
    }

    if (p.life <= 0) {
      scene.remove(p.sprite);
      disposeObject3D(p.sprite);
      particles.splice(i, 1);
    }
  }
}

function setupGUI() {
  gui = new GUI();
  gui.add(params, 'cameraZoom', 0.01, 5, 0.01).name('Camera Zoom');
}

function onDestroy() {
  if (gui) gui.destroy();

  particles.forEach(p => {
    disposeObject3D(p.sprite);
  });

  particles.length = 0;
}
</script>
