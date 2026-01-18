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
  targetPosition: Vector3 | null;
} & AnimationLoopValue;

export default abstract class Projectile implements ProjectileDescription {
  id: ProjectileIdentifier;
  name: string;
  shortName: string | null;
  description: string | null;
  /**
   * Aktuelle Lebensdauer in Sekunden
   */
  maxLifetime: number;
  speed: number;
  strength: number;
  radius: number;
  airResistance: number;
  weight: number;
  protected isAlive = true;
  features: {
    smoke: boolean;
    fire: boolean;
    explosion: boolean;
    dust: boolean;
  };
  constructor(options?: ProjectileDescription) {
    this.id = options?.id ?? '';
    this.name = options?.name ?? 'Unnamed Projectile';
    this.shortName = options?.shortName ?? null;
    this.description = options?.description ?? null;
    this.maxLifetime = options?.maxLifetime ?? 5; // Standardwert, z. B. 5 Sekunden
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
    this.maxLifetime = options?.maxLifetime ?? 5; // Standard 5 Sekunden, anpassbar
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
      name: this.name,
      shortName: this.shortName,
      description: this.description,
      maxLifetime: this.maxLifetime,
      speed: this.speed,
      strength: this.strength,
      radius: this.radius,
      airResistance: this.airResistance,
      weight: this.weight
    };
  }
}
