import Projectile, {
  type ProjectileUpdateContext
} from '@blue-might/app/lib/classes/Projectile';
import { PROJECTILE_TYPE } from '@blue-might/app/lib/types/weapon';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileTypes {
    AIR_SURFACE_MISSILE_1: 'air_surface_missile_1';
  }
}

PROJECTILE_TYPE.AIR_SURFACE_MISSILE_1 = 'air_surface_missile_1';
export default class AirSurfaceMissile_1 extends Projectile {
  static override KEY = PROJECTILE_TYPE.AIR_SURFACE_MISSILE_1;
  constructor() {
    super({
      id: PROJECTILE_TYPE.AIR_SURFACE_MISSILE_1,
      name: 'Air Surface Missile 1',
      shortName: 'Air Surface 1',
      description: 'A homing missile that targets surface enemies.',
      maxLifetime: 5,
      speed: 30,
      strength: 0.75,
      radius: 1,
      airResistance: 0,
      weight: 0,
      features: {
        smoke: true,
        explosion: true
      }
    });
  }

  override update(context: ProjectileUpdateContext) {
    this.applyPhysics(context);
  }

  override getGlb() {
    return import('./air_surface_missile_1.glb?url').then(m => m.default ?? m);
  }

  override getSfx() {
    return import('./air_surface_missile_1_sound.wav?url').then(
      m => m.default ?? m
    );
  }
}
