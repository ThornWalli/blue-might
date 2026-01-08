/* eslint-disable complexity */
import type {
  ProjectileDescription,
  ProjectileIdentifier
} from '../types/weapon';

import type { AnimationLoopValue } from './Renderer';

export default class Projectile implements ProjectileDescription {
  id: ProjectileIdentifier;
  speed: number;
  strength: number;
  radius: number;
  features: {
    smoke: boolean;
    fire: boolean;
    explosion: boolean;
    dust: boolean;
  };

  constructor(options?: ProjectileDescription) {
    this.id = options?.id ?? '';
    this.speed = options?.speed ?? 1;
    this.strength = options?.strength ?? 0.1;
    this.radius = options?.radius ?? 1;
    this.features = {
      smoke: options?.features?.smoke ?? false,
      fire: options?.features?.fire ?? false,
      explosion: options?.features?.explosion ?? false,
      dust: options?.features?.dust ?? false
    };
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

  hasSmoke() {
    return this.features.smoke;
  }
  hasFire() {
    return this.features.fire;
  }
  hasExplosion() {
    return this.features.explosion;
  }
  hasDust() {
    return this.features.dust;
  }

  update(_v: AnimationLoopValue) {
    // Update the projectile's position or state based on the animation loop value
  }

  toDescription(): ProjectileDescription {
    return {
      id: this.id,
      speed: this.speed,
      strength: this.strength,
      radius: this.radius
    };
  }
}
