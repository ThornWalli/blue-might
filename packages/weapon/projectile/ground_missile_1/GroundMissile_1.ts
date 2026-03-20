import type {
  ProjectileInstance,
  ProjectileUpdateContext
} from '@blue-might/app/lib/classes/Projectile';
import Projectile from '@blue-might/app/lib/classes/Projectile';
import { PROJECTILE_TYPE, TARGET_TYPE } from '@blue-might/app/lib/types/weapon';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileTypes {
    GROUND_MISSILE_1: 'ground_missile_1';
  }
}

PROJECTILE_TYPE.GROUND_MISSILE_1 = 'ground_missile_1';
export default class GroundMissile_1 extends Projectile {
  static override KEY = PROJECTILE_TYPE.GROUND_MISSILE_1;
  constructor() {
    super({
      id: PROJECTILE_TYPE.GROUND_MISSILE_1,
      name: 'Ground Missile 1',
      shortName: 'Ground Missile',
      description: 'A missile that targets ground enemies.',
      maxLifetime: 5,
      speed: 6,
      strength: 0.8,
      radius: 1,
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

  override getGlb() {
    return import('./ground_missile_1.glb?url').then(m => m.default ?? m);
  }

  override getSfx() {
    return import('./ground_missile_1_sound.wav?url').then(m => m.default ?? m);
  }
}
