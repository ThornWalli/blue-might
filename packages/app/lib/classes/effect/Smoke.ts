import type { Mesh, MeshStandardMaterial } from 'three';

import type { AnimationLoopValue } from '../Renderer';
import Particle from '../Particle';

export default class Smoke extends Particle {
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
