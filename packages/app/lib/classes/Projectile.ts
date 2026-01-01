import type {
  ProjectileDescription,
  ProjectileIdentifier
} from '../types/weapon';

import type { AnimationLoopValue } from './Renderer';

export default class Projectile implements ProjectileDescription {
  id: ProjectileIdentifier;
  speed: number;
  strength: number;
  smoke: boolean;
  constructor(options?: ProjectileDescription) {
    this.id = options?.id ?? '';
    this.speed = options?.speed ?? 1;
    this.strength = options?.strength ?? 0.1;
    this.smoke = options?.smoke ?? false;
  }

  async setup() {
    // override in subclass
  }

  async getGlb(): Promise<string> {
    throw new Error('Method not implemented.');
  }

  async getSfx(): Promise<string> {
    throw new Error('Method not implemented.');
  }

  update(_v: AnimationLoopValue) {
    // Update the projectile's position or state based on the animation loop value
  }

  toDescription(): ProjectileDescription {
    return {
      id: this.id,
      speed: this.speed,
      strength: this.strength
    };
  }
}
