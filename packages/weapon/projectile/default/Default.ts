import Projectile, {
  type ProjectileUpdateContext
} from '@blue-might/app/lib/classes/Projectile';
import { PROJECTILE_TYPE } from '@blue-might/app/lib/types/weapon';

PROJECTILE_TYPE.DEFAULT = 'default';
export default class Default extends Projectile {
  constructor(
    options: Partial<ConstructorParameters<typeof Projectile>[0]> = {}
  ) {
    super({
      ...options,
      id: options.id ?? PROJECTILE_TYPE.DEFAULT,
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

  override update(context: ProjectileUpdateContext): void {
    this.applyPhysics(context);
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
  constructor() {
    super({
      id: PROJECTILE_TYPE.LIGHT_PROJECTILE,
      speed: 15,
      strength: 0.2,
      weight: 0.01
    });
  }
}

PROJECTILE_TYPE.MEDIUM_PROJECTILE = 'medium_projectile';
export class MediumProjectile extends Default {
  constructor() {
    super({
      id: PROJECTILE_TYPE.MEDIUM_PROJECTILE,
      speed: 10,
      strength: 0.3,
      weight: 0.1
    });
  }
}

PROJECTILE_TYPE.HEAVY_PROJECTILE = 'heavy_projectile';
export class HeavyProjectile extends Default {
  constructor() {
    super({
      id: PROJECTILE_TYPE.HEAVY_PROJECTILE,
      speed: 20,
      strength: 1,
      weight: 0.25
    });
  }
}
