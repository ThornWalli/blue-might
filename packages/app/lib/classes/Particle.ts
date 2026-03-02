import type { Object3D } from 'three';
import { Sprite, Texture, Vector3, SpriteMaterial } from 'three';

import { disposeObject3D } from '../utils/object';

import type { AnimationLoopValue } from './Renderer';
import type AirFlowModule from './mapModule/AirFlow';

export interface ParticleOptions {
  texture: Texture<ImageBitmap>;
  position: Vector3;
  fade: boolean;
  scale: number;
  life: number;
  velocity: Vector3;
}

export type ParticleConstructorOptions<Options = ParticleOptions> =
  Partial<Options> & {
    airFlow: AirFlowModule;
  };

export default class Particle {
  private root!: Object3D;
  protected texture: Texture;
  private startTime?: number;
  /**
   * Whether this particle has completed its lifecycle.
   * @default false
   */
  private complete: boolean = false;
  /**
   * Whether this particle should fade out over its lifetime.
   * @default false
   */
  private fade: boolean = false;
  /**
   * The scale of the particle.
   * @default 1
   */
  private scale: number = 1;
  /**
   * The lifespan of the particle.
   * @default 1
   */
  private life: number = 1;
  /**
   * The maximum lifespan of the particle.
   * @default 1
   */
  private maxLife: number = 1;

  private velocity: Vector3 = new Vector3();
  /**
   * The airflow module associated with this particle.
   */
  readonly airFlow: AirFlowModule;

  constructor(options: ParticleConstructorOptions) {
    this.texture = options.texture ?? new Texture();
    this.fade = options.fade ?? this.fade;
    this.scale = options.scale ?? this.scale;
    this.maxLife = this.life = options.life ?? this.maxLife;
    this.velocity = options.velocity ?? this.velocity;
    this.airFlow = options.airFlow;
  }

  async setup() {
    this.root = await this.createMesh();
  }

  destroy() {
    if (!this.root) return;

    this.root.removeFromParent();
    disposeObject3D(this.root);
  }

  setVelocity(x: number, y: number, z: number) {
    this.velocity.set(x, y, z);
  }

  getStartTime() {
    return this.startTime ?? 0;
  }
  setStartTime(time: number) {
    this.startTime = time;
  }
  getLife() {
    return this.life;
  }

  getLifeProgress() {
    return 1 - this.life / this.maxLife;
  }

  setLife(life: number) {
    this.life = Math.max(0, life);
  }

  getScale() {
    return this.scale;
  }
  setScale(scale: number) {
    this.scale = scale;
  }

  update({ delta }: AnimationLoopValue) {
    if (this.life <= 0) {
      this.complete = true;
    } else {
      this.root.position.addScaledVector(this.velocity, delta);
      this.life -= delta;
      if (this.fade) {
        (this.root as Sprite).material.opacity = this.life;
      }
    }
  }
  getRoot() {
    return this.root;
  }

  isComplete() {
    return this.complete;
  }

  setComplete() {
    this.complete = true;
  }

  async createMesh(): Promise<Object3D> {
    const material = new SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthWrite: false
    });

    const sprite = new Sprite(material);
    sprite.scale.set(this.scale, this.scale, this.scale);
    return sprite;
  }
}
