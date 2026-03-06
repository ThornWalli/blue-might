import type {
  ProjectileInstance,
  ProjectileUpdateContext
} from '@blue-might/app/lib/classes/Projectile';
import Projectile from '@blue-might/app/lib/classes/Projectile';
import { PROJECTILE_TYPE } from '@blue-might/app/lib/types/weapon';

PROJECTILE_TYPE.DEFAULT = 'default';
export default class Default extends Projectile {
  static override KEY = 'default';
  constructor(
    options: Partial<ConstructorParameters<typeof Projectile>[0]> = {}
  ) {
    super({
      ...options,
      id: options.id ?? PROJECTILE_TYPE.DEFAULT,
      name: options.name ?? 'Default Projectile',
      shortName: options.shortName ?? 'Default',
      description: options.description ?? 'A standard projectile type.',
      maxLifetime: options.maxLifetime ?? 5,
      speed: options.speed ?? 10,
      strength: options.strength ?? 0.1,
      radius: options.radius ?? 0.5,
      airResistance: options.airResistance ?? 0.1,
      weight: options.weight ?? 1,
      features: options.features ?? {
        ...(options.features ?? {}),
        dust: true
      }
    });
  }

  override update(
    this: ProjectileInstance<Default>,
    context: ProjectileUpdateContext
  ) {
    this.applyPhysics(context);
  }

  override reset(): void {
    // empty
  }

  override getGlb() {
    return import('./projectile_default.glb?url').then(m => m.default ?? m);
  }

  override getSfx(): Promise<string> {
    return import('./projectile_default_sound.wav?url').then(
      m => m.default ?? m
    );
  }
}

PROJECTILE_TYPE.LIGHT_PROJECTILE = 'light_projectile';
export class LightProjectile extends Default {
  static override KEY = PROJECTILE_TYPE.LIGHT_PROJECTILE;
  constructor() {
    super({
      id: PROJECTILE_TYPE.LIGHT_PROJECTILE,
      name: 'Light Projectile',
      shortName: 'Light',
      description: 'A lightweight projectile.',
      maxLifetime: 1,
      speed: 15,
      strength: 0.1,
      weight: 0.01
    });
  }
}

PROJECTILE_TYPE.MEDIUM_PROJECTILE = 'medium_projectile';
export class MediumProjectile extends Default {
  static override KEY = PROJECTILE_TYPE.MEDIUM_PROJECTILE;
  constructor() {
    super({
      id: PROJECTILE_TYPE.MEDIUM_PROJECTILE,
      name: 'Medium Projectile',
      shortName: 'Medium',
      description: 'A medium-weight projectile.',
      speed: 10,
      strength: 0.2,
      weight: 0.1
    });
  }
}

PROJECTILE_TYPE.HEAVY_PROJECTILE = 'heavy_projectile';
export class HeavyProjectile extends Default {
  constructor() {
    super({
      id: PROJECTILE_TYPE.HEAVY_PROJECTILE,
      name: 'Heavy Projectile',
      shortName: 'Heavy',
      description: 'A heavy-weight projectile.',
      speed: 20,
      strength: 0.4,
      weight: 0.25
    });
  }
}
