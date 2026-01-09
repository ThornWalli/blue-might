import type { Mesh, MeshStandardMaterial } from 'three';

import type { AnimationLoopValue } from '../Renderer';
import Particle, { type ParticleOptions } from '../Particle';

export default class Smoke extends Particle {
  constructor(options: Partial<ParticleOptions>) {
    super({ ...options, scale: 0.2, life: 2 });
  }

  override update(v: AnimationLoopValue): void {
    super.update(v);
    const root = this.getRoot();
    if (!this.isComplete()) {
      root.scale.multiplyScalar(1.01);
    }
    root.children.forEach(child => {
      if (child instanceof Particle) {
        ((child as Mesh).material as MeshStandardMaterial).opacity = 0.6;
      }
    });
  }
}
