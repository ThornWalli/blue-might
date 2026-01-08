import type { Texture } from 'three';
import { Object3D, Sprite, SpriteMaterial } from 'three';
import assetLoader from '@blue-might/app/services/assetLoader';

import test1 from '../../../assets/explosion/1.png?url';
import test2 from '../../../assets/explosion/2.png?url';
import test3 from '../../../assets/explosion/3.png?url';
import { LOADER } from '../AssetLoader';
import { disposeObject3D } from '../../utils/object';

function easeExpoOut(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeExpoIn(t: number) {
  return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
}

export default class Explosion {
  private root!: Object3D;
  private startTime?: number;
  private halfComplete: boolean = false;
  private complete: boolean = false;
  private fadeInDuration = 900;
  private fadeOutDuration = 900;
  private fadeInEase = easeExpoOut;
  private fadeOutEase = easeExpoIn;
  private steps = 32;
  private radius = 1.2;

  // eslint-disable-next-line complexity
  constructor(
    options?: Partial<{
      radius: number;
      steps: number;
      fadeInDuration: number;
      fadeOutDuration: number;
      fadeInEase: (x: number) => number;
      fadeOutEase: (x: number) => number;
    }>
  ) {
    this.radius = options?.radius ?? 1.2;
    this.steps = options?.steps ?? 32;
    this.fadeInDuration = options?.fadeInDuration ?? 900;
    this.fadeOutDuration = options?.fadeOutDuration ?? 900;
    this.fadeInEase = options?.fadeInEase ?? easeExpoOut;
    this.fadeOutEase = options?.fadeOutEase ?? easeExpoIn;

    console.log(this.radius);
  }
  destroy() {
    if (!this.root) return;

    this.root.removeFromParent();
    disposeObject3D(this.root);
  }

  async setup() {
    this.root = await this.createMesh();
  }

  update(time: number) {
    if (!this.root) return;
    if (!this.startTime) this.startTime = time;

    const elapsed = time - this.startTime;
    const stepDurationIn = this.fadeInDuration / this.steps;
    const stepDurationOut = this.fadeOutDuration / this.steps;

    if (elapsed < this.fadeInDuration) {
      // Fade in in Schritten
      const currentStep = Math.floor(elapsed / stepDurationIn);
      const scale = this.fadeInEase((currentStep + 1) / this.steps);
      this.root.scale.setScalar(scale);
    } else if (elapsed < this.fadeInDuration + this.fadeOutDuration) {
      // Fade out in Schritten
      const elapsedFromOut = elapsed - this.fadeInDuration;
      const currentStep = Math.floor(elapsedFromOut / stepDurationOut);
      const scale = 1 - this.fadeOutEase((currentStep + 1) / this.steps);
      this.root.scale.setScalar(scale);
    } else if (!this.halfComplete) {
      this.halfComplete = true;
    } else {
      this.complete = true;
    }
  }

  getRoot() {
    return this.root;
  }

  isComplete() {
    return this.complete;
  }

  private async createMesh() {
    const obj = new Object3D();
    const radius = this.radius;

    const [tex1, tex2, tex3] = await Promise.all([
      assetLoader.add<Texture<ImageBitmap>>({
        loader: LOADER.TEXTURE,
        value: test1
      }),
      assetLoader.add<Texture<ImageBitmap>>({
        loader: LOADER.TEXTURE,
        value: test2
      }),
      assetLoader.add<Texture<ImageBitmap>>({
        loader: LOADER.TEXTURE,
        value: test3
      })
    ]);

    // const map = new TextureLoader().load(test1);

    let sprite = new Sprite(new SpriteMaterial({ map: tex1 }));
    sprite.scale.set(radius * 2, radius * 2, radius * 2);
    obj.add(sprite);

    sprite = new Sprite(new SpriteMaterial({ map: tex2 }));
    sprite.scale.set(radius * 2, radius * 2, radius * 2);
    obj.add(sprite);

    sprite = new Sprite(new SpriteMaterial({ map: tex3 }));
    sprite.scale.set(radius * 2, radius * 2, radius * 2);
    obj.add(sprite);

    // let sphereGeometry = new SphereGeometry(radius, 32, 32, 0, phiLength);
    // sphereGeometry.rotateX(-Math.PI / 2);
    // obj.add(
    //   new Mesh(
    //     sphereGeometry,
    //     new MeshBasicMaterial({
    //       color: 0xff0000,
    //       // depthWrite: false,
    //       depthTest: false
    //     })
    //   )
    // );

    // sphereGeometry = new SphereGeometry(radius - 0.02, 32, 32, 0, phiLength);
    // sphereGeometry.rotateX(-Math.PI / 2);
    // obj.add(
    //   new Mesh(
    //     sphereGeometry,
    //     new MeshBasicMaterial({
    //       color: 0xffff00,
    //       // depthWrite: false,
    //       depthTest: false
    //     })
    //   )
    // );

    // sphereGeometry = new SphereGeometry(radius - 0.04, 32, 32, 0, phiLength);
    // sphereGeometry.rotateX(-Math.PI / 2);
    // obj.add(
    //   new Mesh(
    //     sphereGeometry,
    //     new MeshBasicMaterial({
    //       color: 0xffffff,
    //       depthWrite: false,
    //       depthTest: false
    //     })
    //   )
    // );

    // obj.scale.set(0, 0, 0);

    return obj;
  }
}
