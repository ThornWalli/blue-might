import type { Object3D } from 'three';
import { Sprite, SpriteMaterial, Vector3 } from 'three';

import type { AnimationLoopValue } from '../Renderer';
import Particle from '../Particle';

import type { ParticleConstructorOptions } from './../Particle';

export default class Shoot extends Particle {
  strength: number;
  constructor(
    options: { strength?: number } & Partial<ParticleConstructorOptions> &
      Pick<ParticleConstructorOptions, 'airFlow'>
  ) {
    super({
      ...options,
      velocity: new Vector3(),
      scale: 0.1,
      life: 0.2
    });
    this.strength = options.strength ?? 1;
  }

  override update(v: AnimationLoopValue): void {
    super.update(v);
    this.getRoot().scale.multiplyScalar(1.05);
  }

  override async createMesh(): Promise<Object3D> {
    const material = new SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: true,
      depthTest: false
    });

    const sprite = new Sprite(material);
    let scale = this.getScale();
    scale *= Math.random() * this.strength + 0.5;
    sprite.scale.set(scale, scale, scale);

    sprite.renderOrder = 999;
    return sprite;
  }
}
