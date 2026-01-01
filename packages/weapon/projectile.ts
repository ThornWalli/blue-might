import {
  PROJECTILE_TYPE,
  type ProjectileIdentifier
} from '@blue-might/app/lib/types/weapon';
import type Projectile from '@blue-might/app/lib/classes/Projectile';

import Default, {
  HeavyProjectile,
  LightProjectile,
  MediumProjectile
} from './projectile/default/Default';
import AirSurfaceMissile_1 from './projectile/air_surface_missile_1/AirSurfaceMissile_1';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileTypes {
    DEFAULT: 'default';
    LIGHT_PROJECTILE: 'light_projectile';
    MEDIUM_PROJECTILE: 'medium_projectile';
    HEAVY_PROJECTILE: 'heavy_projectile';
    AIR_SURFACE_MISSILE_1: 'air_surface_missile_1';
  }
}

const projectiles: Record<ProjectileIdentifier, typeof Projectile> =
  Object.freeze({
    [PROJECTILE_TYPE.DEFAULT]: Default,
    [PROJECTILE_TYPE.LIGHT_PROJECTILE]: LightProjectile,
    [PROJECTILE_TYPE.MEDIUM_PROJECTILE]: MediumProjectile,
    [PROJECTILE_TYPE.HEAVY_PROJECTILE]: HeavyProjectile,
    [PROJECTILE_TYPE.AIR_SURFACE_MISSILE_1]: AirSurfaceMissile_1
  });
export { projectiles };
