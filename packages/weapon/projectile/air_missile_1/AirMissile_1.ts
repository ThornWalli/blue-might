import type {
  ProjectileInstance,
  ProjectileUpdateContext
} from '@blue-might/app/lib/classes/Projectile';
import Projectile from '@blue-might/app/lib/classes/Projectile';
import { PROJECTILE_TYPE, TARGET_TYPE } from '@blue-might/app/lib/types/weapon';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileTypes {
    AIR_MISSILE_1: 'air_missile_1';
  }
}

PROJECTILE_TYPE.AIR_MISSILE_1 = 'air_missile_1';
export default class AirMissile_1 extends Projectile {
  static override KEY = PROJECTILE_TYPE.AIR_MISSILE_1;
  constructor() {
    super({
      id: PROJECTILE_TYPE.AIR_MISSILE_1,
      name: 'Air Missile 1',
      shortName: 'Air Missile',
      description: 'A missile that targets air enemies.',
      maxLifetime: 5,
      speed: 4,
      strength: 0.4,
      radius: 1,
      airResistance: 0,
      weight: 0,
      targetType: TARGET_TYPE.AIR,
      features: {
        smoke: true,
        explosion: true
      }
    });
  }

  override update(
    this: ProjectileInstance<AirMissile_1>,
    context: ProjectileUpdateContext
  ) {
    this.applyPhysics(context);
  }

  override reset(): void {
    // EMPTY
  }

  override getGlb() {
    return import('./air_missile_1.glb?url').then(m => m.default ?? m);
  }

  override getSfx() {
    return import('./air_missile_1_sound.wav?url').then(m => m.default ?? m);
  }
}
