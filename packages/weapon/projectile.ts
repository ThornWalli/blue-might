import {
  PROJECTILE_TYPE,
  type ProjectileIdentifier
} from '@blue-might/app/lib/types/weapon';

import Default, {
  Caliber120MmProjectile,
  Caliber155MmProjectile,
  Caliber35MmProjectile
} from './projectile/default/Default';
import AirMissile_1 from './projectile/air_missile_1/AirMissile_1';
import AirHomingMissile_1 from './projectile/air_homing_missile_1/AirHomingMissile_1';
import GroundMissile_1 from './projectile/ground_missile_1/GroundMissile_1';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileTypes {
    DEFAULT: 'default';
    CALIBER_35_MM: 'caliber_35_mm';
    CALIBER_120_MM: 'caliber_120_mm';
    CALIBER_155_MM: 'caliber_155_mm';
  }
}

type ProjectileTypesOf =
  | typeof Caliber35MmProjectile
  | typeof Caliber120MmProjectile
  | typeof Caliber155MmProjectile
  | typeof AirMissile_1
  | typeof AirHomingMissile_1
  | typeof GroundMissile_1
  | typeof Default;

const projectiles: Record<ProjectileIdentifier, ProjectileTypesOf> =
  Object.freeze({
    [PROJECTILE_TYPE.DEFAULT]: Default,
    [PROJECTILE_TYPE.AIR_MISSILE_1]: AirMissile_1,
    [PROJECTILE_TYPE.AIR_HOMING_MISSILE_1]: AirHomingMissile_1,
    [PROJECTILE_TYPE.GROUND_MISSILE_1]: GroundMissile_1,
    [PROJECTILE_TYPE.CALIBER_35_MM]: Caliber35MmProjectile,
    [PROJECTILE_TYPE.CALIBER_120_MM]: Caliber120MmProjectile,
    [PROJECTILE_TYPE.CALIBER_155_MM]: Caliber155MmProjectile
  });
export { projectiles };

export type Projectiles =
  | Default
  | AirMissile_1
  | AirHomingMissile_1
  | GroundMissile_1
  | Caliber35MmProjectile
  | Caliber120MmProjectile
  | Caliber155MmProjectile;
