import Projectile, { type ProjectileUpdateContext } from '../Projectile';

export default class BaseProjectile extends Projectile {
  override update(context: ProjectileUpdateContext): void {
    this.applyPhysics(context);
  }
}
