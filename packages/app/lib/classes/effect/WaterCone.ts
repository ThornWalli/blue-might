import type { ParticleConstructorOptions } from '../Particle';

import DustCone, { type DustConeOptions } from './DustCone';

type WaterConeOptions = DustConeOptions;

export default class WaterCone extends DustCone {
  constructor(options: ParticleConstructorOptions<WaterConeOptions>) {
    super({
      ...options,
      color: options.color ?? 0xffffff,
      circleSize: options.circleSize ?? 0.4,
      circleOpacity: options.circleOpacity ?? 0.8,
      groundShader: options.groundShader ?? true
    });
  }
}
