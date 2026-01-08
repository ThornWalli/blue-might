import Projectile from '@blue-might/app/lib/classes/Projectile';
import { PROJECTILE_TYPE } from '@blue-might/app/lib/types/weapon';

PROJECTILE_TYPE.AIR_SURFACE_MISSILE_1 = 'air_surface_missile_1';
export default class AirSurfaceMissile_1 extends Projectile {
  constructor() {
    super({
      id: PROJECTILE_TYPE.AIR_SURFACE_MISSILE_1,
      speed: 30,
      strength: 0.75,
      radius: 1,
      features: {
        smoke: true,
        explosion: true
      }
    });
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
