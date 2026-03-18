import type {
  ProjectileInstance,
  ProjectileUpdateContext
} from '@blue-might/app/lib/classes/Projectile';
import Projectile from '@blue-might/app/lib/classes/Projectile';
import { PROJECTILE_TYPE, TARGET_TYPE } from '@blue-might/app/lib/types/weapon';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileTypes {
    AIR_HOMING_MISSILE_1: 'air_homing_missile_1';
  }
}
PROJECTILE_TYPE.AIR_HOMING_MISSILE_1 = 'air_homing_missile_1';

type AirHomingMissileInstance = ProjectileInstance<
  AirHomingMissile_1,
  { homingTimeElapsed: number }
>;

export default class AirHomingMissile_1 extends Projectile {
  static override KEY = PROJECTILE_TYPE.AIR_HOMING_MISSILE_1;

  /**
   * Gibt an, wie genau die Rakete ihr Ziel ansteuert.
   * 0 = keine Lenkung, 1 = sofortige Ausrichtung
   * @default 0.05
   */
  private homingAccuracy: number = 0.05;

  /**
   * Gibt an, wie lange die Rakete lenkt (in Sekunden).
   * Nach Ablauf dieser Zeit fliegt sie geradeaus weiter.
   * @default Infinity
   */
  private homingDuration: number = Infinity;

  constructor({
    homingAccuracy,
    homingDuration
  }: { homingAccuracy?: number; homingDuration?: number } = {}) {
    super({
      id: PROJECTILE_TYPE.AIR_HOMING_MISSILE_1,
      name: 'Air Homing Missile 1',
      shortName: 'Air Homing 1',
      description: 'A homing missile that targets airborne enemies.',
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
    this.homingAccuracy = homingAccuracy ?? this.homingAccuracy;
    this.homingDuration = homingDuration ?? this.homingDuration;
  }

  override getUpdateOptions() {
    return {
      homingTimeElapsed: 0
    };
  }

  override reset(this: AirHomingMissileInstance): void {
    this.updateOptions.homingTimeElapsed = 0;
  }

  override update(
    this: AirHomingMissileInstance,
    context: ProjectileUpdateContext
  ): void {
    this.applyPhysics(context);

    this.updateOptions.homingTimeElapsed += context.delta ?? 0.016;

    if (
      context.targetPosition &&
      this.updateOptions.homingTimeElapsed < this.projectile.homingDuration
    ) {
      const homingAccuracy = this.projectile.homingAccuracy;
      const speed = this.projectile.speed;

      const dx = context.targetPosition.x - context.position.x;
      const dy = context.targetPosition.y - context.position.y;
      const dz = context.targetPosition.z - context.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance > 0) {
        const targetDirX = dx / distance;
        const targetDirY = dy / distance;
        const targetDirZ = dz / distance;

        const currentSpeed = Math.sqrt(
          context.velocity.x * context.velocity.x +
            context.velocity.y * context.velocity.y +
            context.velocity.z * context.velocity.z
        );
        if (currentSpeed > 0) {
          const currentDirX = context.velocity.x / currentSpeed;
          const currentDirY = context.velocity.y / currentSpeed;
          const currentDirZ = context.velocity.z / currentSpeed;

          const newDirX =
            currentDirX + (targetDirX - currentDirX) * homingAccuracy;
          const newDirY =
            currentDirY + (targetDirY - currentDirY) * homingAccuracy;
          const newDirZ =
            currentDirZ + (targetDirZ - currentDirZ) * homingAccuracy;

          const newDirLength = Math.sqrt(
            newDirX * newDirX + newDirY * newDirY + newDirZ * newDirZ
          );
          context.velocity.x = (newDirX / newDirLength) * speed;
          context.velocity.y = (newDirY / newDirLength) * speed;
          context.velocity.z = (newDirZ / newDirLength) * speed;
        }
      }
    }
  }

  override getGlb() {
    return import('./air_homing_missile_1.glb?url').then(m => m.default ?? m);
  }

  override getSfx() {
    return import('./air_homing_missile_1_sound.wav?url').then(
      m => m.default ?? m
    );
  }
}
