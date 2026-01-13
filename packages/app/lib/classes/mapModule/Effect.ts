import textureFire from '@blue-might/app/assets/fire/fire.png?url';
import textureSmokeLight from '@blue-might/app/assets/fire/smoke/light.png?url';
import textureSmokeMedium from '@blue-might/app/assets/fire/smoke/medium.png?url';
import textureSmokeHeavy from '@blue-might/app/assets/fire/smoke/heavy.png?url';
import { Texture, type Object3D } from 'three';
import { Group, NearestFilter, Vector3 } from 'three';
import assetLoader from '@blue-might/app/services/assetLoader';

import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
import type { AnimationLoopValue } from '../Renderer';
import type Map from '../Map';
import DustCone, { type DustConeOptions } from '../effect/DustCone';
import { disableRaycaster } from '../../utils/object';
import { LOADER } from '../AssetLoader';
import type Particle from '../Particle';
import type { ParticleOptions } from '../Particle';
import { SMOKE_TYPE } from '../unitModule/Damage';
import Explosion from '../effect/Explosion';
import Fire from '../effect/Fire';
import Smoke from '../effect/Smoke';
import WaterCone from '../effect/WaterCone';
declare module '../Map' {
  interface ModuleDebug {
    effect: boolean;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Observables extends MapModuleObservables {}

interface State extends MapModuleState {
  particles: Particle[];
}

export default class EffectModule extends MapModule<State, Observables> {
  static override TYPE = 'effect';
  override state: State = {
    particles: []
  };
  private textures: {
    fire: Texture<ImageBitmap>;
    smoke: {
      [SMOKE_TYPE.LIGHT]: Texture<ImageBitmap>;
      [SMOKE_TYPE.MEDIUM]: Texture<ImageBitmap>;
      [SMOKE_TYPE.HEAVY]: Texture<ImageBitmap>;
    };
  } | null = null;

  private root: Group;

  override async setup() {
    this.textures = await loadTextures();
  }

  getRoot() {
    return this.root;
  }

  override destroy(): void {
    Object.values(this.textures ?? {}).forEach(tex => {
      if (tex instanceof Texture) {
        tex.dispose();
      } else {
        Object.values(tex).forEach(t => t.dispose());
      }
    });
  }

  constructor(map: Map, debug: boolean) {
    super(map, debug);
    this.root = new Group();
    this.addToScene(this.root);
  }
  override update({ time, delta }: AnimationLoopValue): void {
    // const dt = 0.016;

    this.state.particles = this.state.particles.filter(particle => {
      particle.update({ time, delta });
      if (particle.isComplete()) {
        particle.destroy();
        return false;
      }
      return true;
    });
  }

  async addExplosion(position: Vector3, strength: number = 1) {
    const explosion = new Explosion({
      radius: strength
    });
    await explosion.setup();
    explosion.getRoot().position.copy(position);
    this.state.particles.push(explosion);
    disableRaycaster(explosion.getRoot());
    this.root.add(explosion.getRoot());
  }

  async addWaterCone(
    position: Vector3,
    normal?: Vector3,
    hitObject?: Object3D
  ) {
    const waterCone = new WaterCone();
    await waterCone.setup();
    const root = waterCone.getRoot();
    root.position.copy(position);
    root.position.add(
      normal?.clone().multiplyScalar(0.001) ?? new Vector3(0, 0.001, 0)
    );

    if (normal && hitObject !== this.map.modules.ground.getRoot()) {
      root.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), normal);
    }
    disableRaycaster(root);
    this.state.particles.push(waterCone);
    this.root.add(root);
  }

  async addDustCone(
    position: Vector3,
    normal?: Vector3,
    hitObject?: Object3D,
    options: Partial<DustConeOptions> = {}
  ) {
    const dustCone = new DustCone(options);
    await dustCone.setup();
    const root = dustCone.getRoot();
    root.position.copy(position);
    root.position.add(
      normal?.clone().multiplyScalar(0.001) ?? new Vector3(0, 0.001, 0)
    );

    if (normal && hitObject !== this.map.modules.ground.getRoot()) {
      root.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), normal);
    }
    disableRaycaster(root);
    this.state.particles.push(dustCone);
    this.root.add(root);
  }

  async addSmoke(
    position: Vector3,
    options?: Partial<Exclude<ParticleOptions, 'texture'>> & {
      type: SMOKE_TYPE;
      static?: boolean;
    }
  ) {
    if (!this.textures) return;
    const smoke = new Smoke({
      ...options,
      texture: this.textures.smoke[options?.type ?? SMOKE_TYPE.LIGHT],
      life: options?.life ?? 0.8,
      velocity: new Vector3(
        (Math.random() - 0.5) * 0.1,
        options?.static ? 0.05 : 0.6,
        (Math.random() - 0.5) * 0.1
      )
    });
    await smoke.setup();

    const root = smoke.getRoot();
    root.position.copy(position);

    disableRaycaster(root);
    this.state.particles.push(smoke);
    this.root.add(root);
  }

  async addFire(
    position: Vector3,
    options?: Partial<Exclude<ParticleOptions, 'texture'>>
  ) {
    if (!this.textures) return;
    const fire = new Fire({
      ...options,
      texture: this.textures.fire,
      velocity: new Vector3(
        (Math.random() - 0.5) * 0.2,
        1.5 + Math.random(),
        (Math.random() - 0.5) * 0.2
      )
    });
    await fire.setup();

    const root = fire.getRoot();
    root.position.copy(position);

    disableRaycaster(root);
    this.state.particles.push(fire);
    this.root.add(root);
  }
}

async function loadTextures() {
  const [fire, smokeLight, smokeMedium, smokeHeavy] = await Promise.all(
    [textureFire, textureSmokeLight, textureSmokeMedium, textureSmokeHeavy].map(
      async textureUrl =>
        await assetLoader.add<Texture>({
          value: textureUrl,
          loader: LOADER.TEXTURE
        })
    )
  ).then(textures =>
    textures.map(tex => {
      tex.magFilter = NearestFilter;
      tex.minFilter = NearestFilter;
      return tex;
    })
  );
  return {
    fire,
    smoke: {
      [SMOKE_TYPE.LIGHT]: smokeLight,
      [SMOKE_TYPE.MEDIUM]: smokeMedium,
      [SMOKE_TYPE.HEAVY]: smokeHeavy
    }
  } as {
    fire: Texture<ImageBitmap>;
    smoke: {
      [SMOKE_TYPE.LIGHT]: Texture<ImageBitmap>;
      [SMOKE_TYPE.MEDIUM]: Texture<ImageBitmap>;
      [SMOKE_TYPE.HEAVY]: Texture<ImageBitmap>;
    };
  };
}
