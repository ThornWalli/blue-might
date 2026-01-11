/* eslint-disable complexity */
import type { Vector3 } from 'three/src/math/Vector3.js';

import type {
  ProjectileDescription,
  ProjectileIdentifier
} from '../types/weapon';

import type { AnimationLoopValue } from './Renderer';

export type ProjectileUpdateContext = {
  delta: number;
  gravity: Vector3;
  velocity: Vector3;
  position: Vector3;
} & AnimationLoopValue;

export default abstract class Projectile implements ProjectileDescription {
  id: ProjectileIdentifier;
  speed: number;
  strength: number;
  radius: number;
  airResistance: number;
  weight: number;
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
    this.airResistance = options?.airResistance ?? 0.1; // Standardwert, z. B. 0.1
    this.weight = options?.weight ?? 1; // Standardwert, z. B. 1
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

  abstract update(context: ProjectileUpdateContext): void;

  protected applyPhysics(context: ProjectileUpdateContext) {
    const { delta, gravity, velocity, position } = context;

    velocity.add(
      gravity.clone().multiplyScalar(delta).multiplyScalar(this.weight)
    );
    // Luftwiderstand aus eigener Eigenschaft
    const drag = velocity.clone().multiplyScalar(this.airResistance * delta);
    velocity.sub(drag);
    // Position
    position.add(velocity.clone().multiplyScalar(delta));
  }

  toDescription(): ProjectileDescription {
    return {
      id: this.id,
      speed: this.speed,
      strength: this.strength,
      radius: this.radius,
      airResistance: this.airResistance,
      weight: this.weight
    };
  }
}
