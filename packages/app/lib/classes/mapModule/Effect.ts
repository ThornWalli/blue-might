import textureShoot from '@blue-might/app/assets/fire/shoot.png?url';
import textureFire from '@blue-might/app/assets/fire/fire.png?url';
import textureSmokeLight_1 from '@blue-might/app/assets/fire/smoke/light/1.png?url';
import textureSmokeLight_2 from '@blue-might/app/assets/fire/smoke/light/2.png?url';
import textureSmokeLight_3 from '@blue-might/app/assets/fire/smoke/light/3.png?url';
import textureSmokeLight_4 from '@blue-might/app/assets/fire/smoke/light/4.png?url';
import textureSmokeMedium_1 from '@blue-might/app/assets/fire/smoke/medium/1.png?url';
import textureSmokeMedium_2 from '@blue-might/app/assets/fire/smoke/medium/2.png?url';
import textureSmokeMedium_3 from '@blue-might/app/assets/fire/smoke/medium/3.png?url';
import textureSmokeMedium_4 from '@blue-might/app/assets/fire/smoke/medium/4.png?url';
import textureSmokeHeavy_1 from '@blue-might/app/assets/fire/smoke/heavy/1.png?url';
import textureSmokeHeavy_2 from '@blue-might/app/assets/fire/smoke/heavy/2.png?url';
import textureSmokeHeavy_3 from '@blue-might/app/assets/fire/smoke/heavy/3.png?url';
import textureSmokeHeavy_4 from '@blue-might/app/assets/fire/smoke/heavy/4.png?url';
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
import SignalSmoke from '../effect/SignalSmoke';
import Shoot from '../effect/Shoot';
declare module '../Map' {
  interface ModuleDebug {
    effect: boolean;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Observables extends MapModuleObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Options extends MapModuleState {}
interface State extends MapModuleState {
  particles: Particle[];
}

export default class EffectModule extends MapModule<
  Options,
  State,
  Observables
> {
  static override TYPE = 'effect';

  private textures: Textures | null = null;

  private root: Group;
  constructor(map: Map, options: Options, states: State, debug: boolean) {
    super(
      map,
      options,
      { ...states, particles: states.particles ?? [] },
      debug
    );
    this.root = new Group();
    this.addToScene(this.root);
  }

  override async setup() {
    this.textures = await loadTextures();
  }

  override destroy() {
    Object.values(this.textures ?? {}).forEach(tex => {
      if (tex instanceof Texture) {
        tex.dispose();
      } else {
        Object.values(tex).forEach(t => t.forEach(tex => tex.dispose()));
      }
    });

    this.state.particles.forEach(particle => particle.destroy());

    super.destroy();
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
      radius: strength,
      airFlow: this.map.modules.airFlow
    });
    await explosion.setup();
    explosion.getRoot().position.copy(position);
    this.state.particles.push(explosion);
    disableRaycaster(explosion.getRoot());
    this.root.add(explosion.getRoot());
  }

  async addShoot(
    position: Vector3,
    options?: { strength?: number } & Partial<
      Exclude<ParticleOptions, 'texture'>
    >
  ) {
    if (!this.textures) return;
    const shoot = new Shoot({
      ...options,
      texture: this.textures.shoot,
      airFlow: this.map.modules.airFlow,
      strength: options?.strength ?? 1
    });
    await shoot.setup();
    shoot.getRoot().position.copy(position);
    this.state.particles.push(shoot);
    disableRaycaster(shoot.getRoot());
    this.root.add(shoot.getRoot());
  }

  async addWaterCone(
    position: Vector3,
    normal?: Vector3,
    hitObject?: Object3D
  ) {
    const waterCone = new WaterCone({
      airFlow: this.map.modules.airFlow
    });
    await waterCone.setup();
    const root = waterCone.getRoot();
    root.position.copy(position);
    root.position.add(
      normal?.clone().multiplyScalar(0.001) ?? new Vector3(0, 0.001, 0)
    );

    if (normal && hitObject !== this.map.modules.surface.getRoot()) {
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
    const dustCone = new DustCone({
      ...options,
      airFlow: this.map.modules.airFlow
    });
    await dustCone.setup();
    const root = dustCone.getRoot();
    root.position.copy(position);
    root.position.add(
      normal?.clone().multiplyScalar(0.001) ?? new Vector3(0, 0.001, 0)
    );

    if (normal && hitObject !== this.map.modules.surface.getRoot()) {
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
    const smokeTextures =
      this.textures.smoke[options?.type ?? SMOKE_TYPE.LIGHT];
    const smokeIndex = Math.floor(Math.random() * smokeTextures.length);

    const smoke = new Smoke({
      ...options,
      texture: smokeTextures[smokeIndex],
      life: options?.life ?? 0.8,
      velocity: new Vector3(
        (Math.random() - 0.5) * 0.1,
        options?.static ? 0.05 : 0.6,
        (Math.random() - 0.5) * 0.1
      ),
      airFlow: this.map.modules.airFlow
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
      ),
      airFlow: this.map.modules.airFlow
    });
    await fire.setup();

    const root = fire.getRoot();
    root.position.copy(position);

    disableRaycaster(root);
    this.state.particles.push(fire);
    this.root.add(root);
  }

  async addSignalSmoke(
    position: Vector3,
    options?: Partial<Exclude<ParticleOptions, 'texture'>> & {
      type: SMOKE_TYPE;
      static?: boolean;
    }
  ) {
    if (!this.textures) return;
    const smokeTextures =
      this.textures.smoke[options?.type ?? SMOKE_TYPE.LIGHT];
    const smokeIndex = Math.floor(Math.random() * smokeTextures.length);

    const smoke = new SignalSmoke({
      ...options,
      texture: smokeTextures[smokeIndex],
      life: options?.life ?? 0.8,
      velocity: new Vector3(
        (Math.random() - 0.5) * 0.1,
        options?.static ? 0.05 : 0.6,
        (Math.random() - 0.5) * 0.1
      ),
      airFlow: this.map.modules.airFlow
    });
    await smoke.setup();

    const root = smoke.getRoot();
    root.position.copy(position);

    disableRaycaster(root);
    this.state.particles.push(smoke);
    this.root.add(root);
  }

  getRoot() {
    return this.root;
  }
}

async function loadTextures() {
  const [
    shoot,
    fire,
    smokeLight_1,
    smokeLight_2,
    smokeLight_3,
    smokeLight_4,
    smokeMedium_1,
    smokeMedium_2,
    smokeMedium_3,
    smokeMedium_4,
    smokeHeavy_1,
    smokeHeavy_2,
    smokeHeavy_3,
    smokeHeavy_4
  ] = await Promise.all(
    [
      textureShoot,
      textureFire,
      textureSmokeLight_1,
      textureSmokeLight_2,
      textureSmokeLight_3,
      textureSmokeLight_4,
      textureSmokeMedium_1,
      textureSmokeMedium_2,
      textureSmokeMedium_3,
      textureSmokeMedium_4,
      textureSmokeHeavy_1,
      textureSmokeHeavy_2,
      textureSmokeHeavy_3,
      textureSmokeHeavy_4
    ].map(
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
    shoot,
    fire,
    smoke: {
      [SMOKE_TYPE.LIGHT]: [
        smokeLight_1,
        smokeLight_2,
        smokeLight_3,
        smokeLight_4
      ],
      [SMOKE_TYPE.MEDIUM]: [
        smokeMedium_1,
        smokeMedium_2,
        smokeMedium_3,
        smokeMedium_4
      ],
      [SMOKE_TYPE.HEAVY]: [
        smokeHeavy_1,
        smokeHeavy_2,
        smokeHeavy_3,
        smokeHeavy_4
      ]
    }
  } as Textures;
}

type Textures = {
  shoot: Texture<ImageBitmap>;
  fire: Texture<ImageBitmap>;
  smoke: {
    [SMOKE_TYPE.LIGHT]: Texture<ImageBitmap>[];
    [SMOKE_TYPE.MEDIUM]: Texture<ImageBitmap>[];
    [SMOKE_TYPE.HEAVY]: Texture<ImageBitmap>[];
  };
};
