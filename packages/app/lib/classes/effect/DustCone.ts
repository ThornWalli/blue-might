import { Vector2 } from 'three';

import { createDustCone } from '../../utils/dustCone';
import type { AnimationLoopValue } from '../Renderer';
import Particle from '../Particle';
import type { ParticleConstructorOptions, ParticleOptions } from '../Particle';

export interface DustConeOptions extends ParticleOptions {
  scale: number;
  scaleSpeed: number;
  size: Vector2;
  circleSize: number;
  ditherThreshold: number;
  circleOpacity: number;
  color: number;
  groundShader: boolean;
}

export default class DustCone extends Particle {
  private scaleSpeed: number;
  private size: Vector2;
  private circleSize: number;
  private ditherThreshold: number;
  private circleOpacity: number;
  private color: number;
  private groundShader: boolean;
  constructor(options: ParticleConstructorOptions & Partial<DustConeOptions>) {
    super({
      ...options,
      life: options.life ?? 0.5
    });
    this.ditherThreshold = options.ditherThreshold ?? 0.1;
    this.size = options.size ?? new Vector2(0.2, 1);
    this.circleSize = options.circleSize ?? 0.2;
    this.circleOpacity = options.circleOpacity ?? 0.4;
    this.scaleSpeed = options.scaleSpeed ?? 0.025;
    this.color = options.color ?? 0x333333;
    this.groundShader = options.groundShader ?? false;
  }

  override update(v: AnimationLoopValue) {
    if (!this.getRoot()) return;
    if (!this.getStartTime()) this.setStartTime(v.time);

    if (this.getLife() <= 0) {
      this.setComplete();
    } else {
      const life = this.getLife();
      const root = this.getRoot();
      root.scale.x = 0.6 + life * 0.4;
      root.scale.z = 0.6 + life * 0.4;
      root.scale.y = life;
      this.setLife(life - this.scaleSpeed);
    }
  }

  override async createMesh() {
    return createDustCone({
      ditherThreshold: this.ditherThreshold,
      size: this.size,
      circleSize: this.circleSize,
      circleOpacity: this.circleOpacity,
      scale: this.getScale(),
      scaleSpeed: this.scaleSpeed,
      color: this.color,
      groundShader: this.groundShader
    });
  }
}
