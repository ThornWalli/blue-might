import Projectile, {
  type ProjectileUpdateContext
} from '@blue-might/app/lib/classes/Projectile';
import { PROJECTILE_TYPE } from '@blue-might/app/lib/types/weapon';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileTypes {
    AIR_HOMING_MISSILE_1: 'air_homing_missile_1';
  }
}
PROJECTILE_TYPE.AIR_HOMING_MISSILE_1 = 'air_homing_missile_1';
export default class AirHomingMissile_1 extends Projectile {
  /**
   * Gibt an, wie genau die Rakete ihr Ziel ansteuert.
   * 0 = keine Lenkung, 1 = sofortige Ausrichtung
   */
  private homingAccuracy: number = 0.25;

  constructor({ homingAccuracy }: { homingAccuracy?: number } = {}) {
    super({
      id: PROJECTILE_TYPE.AIR_HOMING_MISSILE_1,
      name: 'Air Homing Missile 1',
      shortName: 'Air Homing 1',
      description: 'A homing missile that targets airborne enemies.',
      maxLifetime: 1,
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
    this.homingAccuracy = homingAccuracy ?? this.homingAccuracy;
  }

  override update(context: ProjectileUpdateContext): void {
    this.applyPhysics(context);

    if (context.targetPosition) {
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
            currentDirX + (targetDirX - currentDirX) * this.homingAccuracy;
          const newDirY =
            currentDirY + (targetDirY - currentDirY) * this.homingAccuracy;
          const newDirZ =
            currentDirZ + (targetDirZ - currentDirZ) * this.homingAccuracy;

          const newDirLength = Math.sqrt(
            newDirX * newDirX + newDirY * newDirY + newDirZ * newDirZ
          );
          context.velocity.x = (newDirX / newDirLength) * this.speed;
          context.velocity.y = (newDirY / newDirLength) * this.speed;
          context.velocity.z = (newDirZ / newDirLength) * this.speed;
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
