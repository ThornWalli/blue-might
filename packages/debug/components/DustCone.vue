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
import type { Scene, Object3D } from 'three';
import { Vector2 } from 'three';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

import { createGround } from '../utils';
import { reactive } from 'vue';
import { createDustCone } from '../dustCone';

let gui: GUI;
const params = reactive({
  cameraZoom: 1,
  scaleSpeed: 0.025,
  ditherThreshold: 0.1,
  coneWidth: 0.2,
  coneHeight: 1,
  circleOpacity: 0.4,
  spawnRate: 0.02,
  maxCones: 10,
  enableSpawning: false
});

let dustCones: Object3D[] = [];
let dustCone: Object3D;

function onSetupScene(scene: Scene) {
  scene.add(
    createGround({
      color: 0x205010
    })
  );

  scene.add(createInitialDustCone());

  setupGUI(scene);
}

function createInitialDustCone() {
  dustCone = createDustCone();
  dustCone.position.set(0, 0.001, 0);
  dustCones.push(dustCone);
  return dustCone;
}

function removeDustCones() {
  dustCones.forEach(cone => {
    if (cone !== dustCone) {
      cone.parent?.remove(cone);
      disposeObject3D(cone);
    }
  });
  dustCones = dustCones.filter(cone => cone === dustCone);
}

function setupGUI(scene: Scene) {
  gui = new GUI();
  gui.add(params, 'cameraZoom', 0.01, 5, 0.01).name('Camera Zoom');
  gui.add(params, 'scaleSpeed', 0.01, 0.1, 0.005).name('Scale Speed');
  gui.add(params, 'ditherThreshold', 0.01, 10, 0.01).name('Dither Threshold');
  gui.add(params, 'coneWidth', 0.01, 2, 0.01).name('Cone Width');
  gui.add(params, 'coneHeight', 0.01, 6, 0.1).name('Cone Height');
  gui.add(params, 'circleOpacity', 0, 1, 0.1).name('Circle Opacity');
  gui
    .add(params, 'enableSpawning')
    .name('Enable Spawning')
    .onChange((value: boolean) => {
      removeDustCones();
      if (!value) {
        scene.add(createInitialDustCone());
      }
    });
  gui.add(params, 'spawnRate', 0, 1, 0.001).name('Spawn Rate');
  gui.add(params, 'maxCones', 1, 50, 1).name('Max Cones');
}

function onUpdateAnimation({ scene }: { scene: Scene }) {
  if (
    params.enableSpawning &&
    dustCones.length < params.maxCones &&
    Math.random() < params.spawnRate
  ) {
    const newCone = createDustCone({
      scale: 0.5,
      size: new Vector2(params.coneWidth, params.coneWidth),
      ditherThreshold: params.coneHeight,
      circleOpacity: params.circleOpacity
    });
    newCone.position.set(
      (Math.random() - 0.5) * 20,
      0.001,
      (Math.random() - 0.5) * 20
    );
    dustCones.push(newCone);
    scene.add(newCone);
  }

  dustCones = dustCones.filter(cone => {
    const scale = cone.userData.scale ?? 1;
    cone.scale.x = 0.6 + scale * 0.4;
    cone.scale.z = 0.6 + scale * 0.4;
    cone.scale.y = scale;
    cone.userData.scale = scale - params.scaleSpeed;

    if (scale <= 0) {
      if (cone === dustCone && !params.enableSpawning) {
        cone.userData.scale = 1;
        return true;
      } else {
        scene.remove(cone);
        disposeObject3D(cone);
        return false;
      }
    }
    return true;
  });
}

function onDestroy() {
  if (gui) gui.destroy();
  dustCones.forEach(cone => {
    disposeObject3D(cone);
  });
}
</script>
