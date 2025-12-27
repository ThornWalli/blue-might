import type {
  ProjectileDescription,
  ProjectileIdentifier
} from '../types/weapon';

export default class Projectile implements ProjectileDescription {
  id: ProjectileIdentifier;
  speed: number;
  strength: number;
  constructor(options: ProjectileDescription) {
    this.id = options.id;
    this.speed = options.speed;
    this.strength = options.strength ?? 0.1;
  }
}
