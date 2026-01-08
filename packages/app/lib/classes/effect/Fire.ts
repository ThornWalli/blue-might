import type { AnimationLoopValue } from '../Renderer';
import Particle from '../Particle';

export default class Fire extends Particle {
  override update(v: AnimationLoopValue): void {
    super.update(v);
    if (!this.isComplete()) {
      this.getRoot().scale.multiplyScalar(0.97);
    }
  }
}
