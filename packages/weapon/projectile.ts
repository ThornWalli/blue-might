import {
  PROJECTILE_TYPE,
  type ProjectileIdentifier
} from '@blue-might/app/lib/types/weapon';
import type Projectile from '@blue-might/app/lib/classes/Projectile';

import Default, {
  Caliber120MmProjectile,
  Caliber155MmProjectile,
  Caliber35MmProjectile,
  HeavyProjectile,
  LightProjectile,
  MediumProjectile
} from './projectile/default/Default';
import AirMissile_1 from './projectile/air_missile_1/AirMissile_1';
import AirHomingMissile_1 from './projectile/air_homing_missile_1/AirHomingMissile_1';
import GroundMissile_1 from './projectile/ground_missile_1/GroundMissile_1';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileTypes {
    DEFAULT: 'default';
    LIGHT_PROJECTILE: 'light_projectile';
    MEDIUM_PROJECTILE: 'medium_projectile';
    HEAVY_PROJECTILE: 'heavy_projectile';
    CALIBER_35_MM: 'caliber_35_mm';
    CALIBER_120_MM: 'caliber_120_mm';
    CALIBER_155_MM: 'caliber_155_mm';
  }
}

const projectiles: Record<
  ProjectileIdentifier,
  typeof Projectile | typeof HeavyProjectile
> = Object.freeze({
  [PROJECTILE_TYPE.CALIBER_35_MM]: Caliber35MmProjectile,
  [PROJECTILE_TYPE.CALIBER_120_MM]: Caliber120MmProjectile,
  [PROJECTILE_TYPE.CALIBER_155_MM]: Caliber155MmProjectile,
  [PROJECTILE_TYPE.LIGHT_PROJECTILE]: LightProjectile,
  [PROJECTILE_TYPE.MEDIUM_PROJECTILE]: MediumProjectile,
  [PROJECTILE_TYPE.HEAVY_PROJECTILE]: HeavyProjectile,
  [PROJECTILE_TYPE.AIR_MISSILE_1]: AirMissile_1,
  [PROJECTILE_TYPE.AIR_HOMING_MISSILE_1]: AirHomingMissile_1,
  [PROJECTILE_TYPE.GROUND_MISSILE_1]: GroundMissile_1,
  [PROJECTILE_TYPE.DEFAULT]: Default
});
export { projectiles };

export type Projectiles =
  | Default
  | LightProjectile
  | MediumProjectile
  | HeavyProjectile
  | AirMissile_1
  | AirHomingMissile_1
  | Caliber35MmProjectile
  | Caliber120MmProjectile
  | Caliber155MmProjectile;
