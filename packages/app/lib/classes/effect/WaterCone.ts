import DustCone from './DustCone';

export default class WaterCone extends DustCone {
  constructor() {
    super({
      color: 0xffffff,
      circleSize: 0.4,
      circleOpacity: 0.8,
      groundShader: true
    });
  }
}
