import type { Texture } from 'three';
import { CanvasTexture, NearestFilter } from 'three';

import Particle, { type ParticleConstructorOptions } from '../Particle';
import type { AnimationLoopValue } from '../Renderer';

let texture: Texture | null = null;
export default class SignalSmoke extends Particle {
  constructor(options: ParticleConstructorOptions) {
    super({ ...options, scale: 1 / 20, life: 3 });
  }

  override async setup() {
    this.texture = texture = texture || (await this.createTexture());
    await super.setup();
  }

  private async createTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 3;
    canvas.height = 3;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Draw a simple smoke texture
    const gradient = ctx.createRadialGradient(1.5, 1.5, 0, 1.5, 1.5, 1.5);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 1)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const tex = new CanvasTexture(canvas);
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestFilter;
    return tex;
  }

  override update(v: AnimationLoopValue): void {
    super.update(v);
    const root = this.getRoot();
    if (!this.isComplete()) {
      root.scale.multiplyScalar(1.01);

      const lifeProgress = this.getLifeProgress();
      const verticalSpeed = 1 / 6;
      root.position.y += verticalSpeed * v.delta;

      if (lifeProgress >= 0 && this.airFlow) {
        const speed = this.airFlow.getSpeed();
        const rotation = this.airFlow.getRotation();
        const deltaX = Math.sin(rotation.y) * speed * v.delta;
        const deltaZ = Math.cos(rotation.y) * speed * v.delta;
        root.position.x += deltaX;
        root.position.z += deltaZ;
      }
    }
  }
}
