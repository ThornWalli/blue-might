import type {
  ProjectileInstance,
  ProjectileUpdateContext
} from '@blue-might/app/lib/classes/Projectile';
import Projectile from '@blue-might/app/lib/classes/Projectile';
import {
  PROJECTILE_KEY,
  PROJECTILE_TYPE,
  TARGET_TYPE
} from '@blue-might/app/lib/types/weapon';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileKeys {
    GROUND_MISSILE_1: 'ground_missile_1';
  }
}

PROJECTILE_KEY.GROUND_MISSILE_1 = 'ground_missile_1';
export default class GroundMissile_1 extends Projectile {
  static override KEY = PROJECTILE_KEY.GROUND_MISSILE_1;
  constructor() {
    super({
      type: PROJECTILE_TYPE.MISSILE,
      id: PROJECTILE_KEY.GROUND_MISSILE_1,
      name: 'Ground Missile 1',
      shortName: 'Ground Missile',
      description: 'A missile that targets ground enemies.',
      maxLifetime: 5,
      speed: 6,
      strength: 2.4,
      radius: 1.1,
      airResistance: 0,
      weight: 0,
      targetType: TARGET_TYPE.GROUND,
      features: {
        smoke: true,
        explosion: true
      }
    });
  }

  override update(
    this: ProjectileInstance<GroundMissile_1>,
    context: ProjectileUpdateContext
  ) {
    this.applyPhysics(context);
  }

  override reset(): void {
    // EMPTY
  }

  override getShootGlb() {
    return import('./ground_missile_1.glb?url').then(m => m.default ?? m);
  }

  override getShootSfx() {
    return import('./ground_missile_1_sound.wav?url').then(m => m.default ?? m);
  }
}
