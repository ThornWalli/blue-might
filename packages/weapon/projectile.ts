import {
  PROJECTILE_KEY,
  type ProjectileIdentifier
} from '@blue-might/app/lib/types/weapon';

import AirMissile_1 from './projectile/missile/air_missile_1/AirMissile_1';
import AirHomingMissile_1 from './projectile/missile/air_homing_missile_1/AirHomingMissile_1';
import GroundMissile_1 from './projectile/missile/ground_missile_1/GroundMissile_1';
import {
  Caliber120MmApfsdsProjectile,
  Caliber120MmHeatMpProjectile,
  Caliber120MmHeProjectile
} from './projectile/conventional/caliber_120_mm/Caliber120mm';
import { Caliber35MmHeProjectile } from './projectile/conventional/caliber_35_mm/Caliber35mm';
import { Caliber155MmHeProjectile } from './projectile/conventional/caliber_155_mm/Caliber155mm';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileKeys {
    CALIBER_35_MM_HE: 'caliber_35_mm_he';
    CALIBER_120_MM_HE: 'caliber_120_mm_he';
    CALIBER_120_MM_HEAT_MP: 'caliber_120_mm_heat_mp';
    CALIBER_120_MM_APFSDS: 'caliber_120_mm_apfsds';
    CALIBER_155_MM_HE: 'caliber_155_mm_he';
  }
}

type ProjectileTypesOf =
  | typeof AirMissile_1
  | typeof AirHomingMissile_1
  | typeof GroundMissile_1
  | typeof Caliber35MmHeProjectile
  | typeof Caliber120MmHeProjectile
  | typeof Caliber120MmHeatMpProjectile
  | typeof Caliber120MmApfsdsProjectile
  | typeof Caliber155MmHeProjectile;

const projectiles: Record<ProjectileIdentifier, ProjectileTypesOf> =
  Object.freeze({
    [PROJECTILE_KEY.AIR_MISSILE_1]: AirMissile_1,
    [PROJECTILE_KEY.AIR_HOMING_MISSILE_1]: AirHomingMissile_1,
    [PROJECTILE_KEY.GROUND_MISSILE_1]: GroundMissile_1,
    [PROJECTILE_KEY.CALIBER_35_MM_HE]: Caliber35MmHeProjectile,
    [PROJECTILE_KEY.CALIBER_120_MM_HE]: Caliber120MmHeProjectile,
    [PROJECTILE_KEY.CALIBER_120_MM_HEAT_MP]: Caliber120MmHeatMpProjectile,
    [PROJECTILE_KEY.CALIBER_120_MM_APFSDS]: Caliber120MmApfsdsProjectile,
    [PROJECTILE_KEY.CALIBER_155_MM_HE]: Caliber155MmHeProjectile
  });
export { projectiles };

export type Projectiles =
  | AirMissile_1
  | AirHomingMissile_1
  | GroundMissile_1
  | Caliber35MmHeProjectile
  | Caliber120MmHeProjectile
  | Caliber120MmHeatMpProjectile
  | Caliber120MmApfsdsProjectile
  | Caliber155MmHeProjectile;
