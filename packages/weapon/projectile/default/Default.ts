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
      airResistance: options.airResistance ?? 0.0,
      weight: options.weight ?? 1,
      features: options.features ?? {
        ...(options.features ?? {}),
        dust: true,
        shoot: true
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

PROJECTILE_TYPE.CALIBER_35_MM = 'caliber_35_mm';
export class Caliber35MmProjectile extends Default {
  static override KEY = PROJECTILE_TYPE.CALIBER_35_MM;
  constructor() {
    super({
      id: PROJECTILE_TYPE.CALIBER_35_MM,
      name: 'Caliber 35mm Projectile',
      shortName: '35mm',
      description: 'A 35mm caliber projectile.',
      maxLifetime: 1,
      speed: 20,
      strength: 0.1,
      weight: 0.01,
      radius: 0
    });
  }
}

PROJECTILE_TYPE.CALIBER_120_MM = 'caliber_120_mm';
export class Caliber120MmProjectile extends Default {
  static override KEY = PROJECTILE_TYPE.CALIBER_120_MM;
  constructor() {
    super({
      id: PROJECTILE_TYPE.CALIBER_120_MM,
      name: 'Caliber 120mm Projectile',
      shortName: '120mm',
      description: 'A 120mm caliber projectile.',
      maxLifetime: 3,
      speed: 10,
      strength: 1,
      weight: 0.5,
      radius: 0
    });
  }
}

PROJECTILE_TYPE.CALIBER_155_MM = 'caliber_155_mm';
export class Caliber155MmProjectile extends Default {
  static override KEY = PROJECTILE_TYPE.CALIBER_155_MM;
  constructor() {
    super({
      id: PROJECTILE_TYPE.CALIBER_155_MM,
      name: 'Caliber 155mm Projectile',
      shortName: '155mm',
      description: 'A 155mm caliber projectile.',
      maxLifetime: 10,
      speed: 5,
      strength: 4,
      weight: 5,
      radius: 1.2
    });
  }
}
