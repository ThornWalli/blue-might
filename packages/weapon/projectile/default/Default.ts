import Projectile from '@blue-might/app/lib/classes/Projectile';
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
      features: options.features ?? {
        ...(options.features ?? {}),
        dust: true
      }
    });
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
      strength: 0.2
    });
  }
}

PROJECTILE_TYPE.MEDIUM_PROJECTILE = 'medium_projectile';
export class MediumProjectile extends Default {
  constructor() {
    super({
      id: PROJECTILE_TYPE.MEDIUM_PROJECTILE,
      speed: 10,
      strength: 0.3
    });
  }
}

PROJECTILE_TYPE.HEAVY_PROJECTILE = 'heavy_projectile';
export class HeavyProjectile extends Default {
  constructor() {
    super({
      id: PROJECTILE_TYPE.HEAVY_PROJECTILE,
      speed: 5,
      strength: 0.5
    });
  }
}
