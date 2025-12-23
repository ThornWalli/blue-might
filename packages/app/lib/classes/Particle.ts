import type { Texture } from 'three';
import { Sprite, SpriteMaterial, Vector3 } from 'three';

export class Particle {
  sprite: Sprite;
  velocity = new Vector3();
  life = 1;

  constructor(texture: Texture, position: Vector3, scale = 1) {
    const material = new SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false
    });

    this.sprite = new Sprite(material);
    this.sprite.position.copy(position);
    this.sprite.scale.set(scale, scale, scale);
  }

  update(dt: number) {
    this.sprite.position.addScaledVector(this.velocity, dt);
    this.life -= dt;
    this.sprite.material.opacity = this.life;
  }
}
