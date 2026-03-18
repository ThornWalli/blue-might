/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable complexity */
import type { Vector3 } from 'three/src/math/Vector3.js';

import type {
  ProjectileDescription,
  ProjectileIdentifier,
  TARGET_TYPE
} from '../types/weapon';

import type { AnimationLoopValue } from './Renderer';

export type ProjectileUpdateContext = {
  delta: number;
  gravity: Vector3;
  velocity: Vector3;
  position: Vector3;
  targetPosition: Vector3 | null;
} & AnimationLoopValue;

export class ProjectileInstance<
  P extends Projectile,
  UpdateOptions extends object = any
> {
  projectile: P;
  update: (context: ProjectileUpdateContext) => void;
  updateOptions: UpdateOptions;

  constructor({
    projectile,
    update,
    reset,
    updateOptions
  }: {
    projectile: P;
    update: (context: ProjectileUpdateContext) => void;
    reset: () => void;
    updateOptions: UpdateOptions;
  }) {
    this.projectile = projectile;
    this.update = update;
    this.reset = reset;
    this.updateOptions = updateOptions;
  }

  static processPhysics(
    { weight, airResistance }: { weight: number; airResistance: number },
    projectileContext: ProjectileUpdateContext
  ) {
    const { delta, gravity, velocity, position } = projectileContext;

    velocity.add(gravity.clone().multiplyScalar(delta).multiplyScalar(weight));

    const drag = velocity.clone().multiplyScalar(airResistance * delta);
    velocity.sub(drag);

    position.add(velocity.clone().multiplyScalar(delta));
  }

  applyPhysics(context: ProjectileUpdateContext) {
    ProjectileInstance.processPhysics(
      {
        weight: this.projectile.weight,
        airResistance: this.projectile.airResistance
      },
      context
    );
  }

  reset() {
    // empty
  }
}
export default abstract class Projectile implements ProjectileDescription {
  static KEY: string;
  id: ProjectileIdentifier;
  name: string;
  shortName: string | null;
  description: string | null;
  /**
   * The maximum lifetime of the projectile in seconds.
   * @default 5
   */
  maxLifetime: number = 5;
  /**
   * The speed of the projectile.
   * @default 1
   */
  speed: number = 1;
  /**
   * The strength of the projectile, representing its damage potential.
   * @default 0.1
   */
  strength: number = 0.1;
  /**
   * The radius of the projectile.
   * @default 1
   */
  radius: number = 1;
  /**
   * The air resistance of the projectile.
   * @default 0.1
   */
  airResistance: number = 0.1;
  /**
   * The weight of the projectile.
   * @default 1
   */
  weight: number = 1;
  /**
   * The target type of the projectile.
   * @default null
   */
  targetType: TARGET_TYPE | null;
  /**
   * The features of the projectile.
   */
  features: {
    smoke: boolean;
    fire: boolean;
    shoot: boolean;
    explosion: boolean;
    dust: boolean;
  };

  constructor(
    options: {
      id: ProjectileIdentifier;
      name: string;
    } & Partial<ProjectileDescription>
  ) {
    this.id = options.id;
    this.name = options.name;
    this.shortName = options.shortName ?? null;
    this.description = options.description ?? null;
    this.maxLifetime = options.maxLifetime ?? this.maxLifetime;
    this.speed = options.speed ?? this.speed;
    this.strength = options.strength ?? this.strength;
    this.radius = options.radius ?? this.radius;
    this.airResistance = options.airResistance ?? this.airResistance;
    this.weight = options.weight ?? this.weight;
    this.features = {
      smoke: options.features?.smoke ?? false,
      fire: options.features?.fire ?? false,
      shoot: options.features?.shoot ?? false,
      explosion: options.features?.explosion ?? false,
      dust: options.features?.dust ?? false
    };
    this.maxLifetime = options.maxLifetime ?? this.maxLifetime;
    this.targetType = options.targetType ?? null;
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
  hasShoot() {
    return this.features.shoot;
  }
  hasExplosion() {
    return this.features.explosion;
  }
  hasDust() {
    return this.features.dust;
  }

  abstract update(
    this: ProjectileInstance<this>,
    context: ProjectileUpdateContext
  ): void;
  abstract reset(this: ProjectileInstance<this>): void;

  getUpdateOptions(): any {
    return {};
  }

  create(): ProjectileInstance<this> {
    return new ProjectileInstance({
      projectile: this,
      update: this.update,
      reset: this.reset,
      updateOptions: this.getUpdateOptions()
    });
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
      weight: this.weight,
      targetType: this.targetType
    };
  }
}
