import { ReplaySubject } from 'rxjs';
import type Unit from '../Unit';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleSetupContext,
  type UnitModuleState
} from '../UnitModule';
import type Projectile from '../Projectile';
import type { Texture } from 'three';
import { NearestFilter, Vector3, Object3D } from 'three';

import textureFire from '@blue-might/app/assets/fire/fire.png?url';
import textureSmoke from '@blue-might/app/assets/fire/smoke.png?url';
import assetLoader from '@blue-might/app/services/assetLoader';
import { LOADER } from '../AssetLoader';
import { Particle } from '../Particle';
import type { AnimationLoopValue } from '../Renderer';
import { disableRaycaster, disposeObject3D } from '../../utils/object';

declare module '../Unit' {
  interface ModuleStates {
    damage: Partial<DamageUnitModuleState>;
  }
  interface ModuleOptions {
    damage: Partial<DamageUnitModuleOptions>;
  }
  interface ModuleDebug {
    damage: boolean;
  }
}

interface Observables extends UnitModuleObservables {
  destroyed$: ReplaySubject<void>;
  damage$: ReplaySubject<number>;
}
export type DamageUnitModuleOptions = UnitModuleOptions;
export interface DamageUnitModuleState extends UnitModuleState {
  damage: number;
}

enum DamageLevel {
  INTACT = 0,
  DAMAGED = 0.5,
  DEMOLISHED = 1
}

export default class DamageUnitModule extends UnitModule<
  DamageUnitModuleOptions,
  DamageUnitModuleState,
  Observables
> {
  static override TYPE = 'damage';

  private root: Object3D | null = null;

  private textures: {
    fireTexture: Texture;
    smokeTexture: Texture;
  } | null = null;
  private particles: Particle[] = [];

  constructor(
    unit: Unit,
    options: DamageUnitModuleOptions,
    state: DamageUnitModuleState,
    debug?: boolean
  ) {
    super(
      unit,
      {
        ...options
      },
      {
        ...state,
        damage: state.damage ?? 0
      },
      debug
    );
    //#region observables
    this.observables.destroyed$ = new ReplaySubject<void>();
    this.observables.damage$ = new ReplaySubject<number>();
    this.observables.damage$.next(this.state.damage);
    //#endregion
  }

  override async setup() {
    this.textures = await loadTextures();
  }

  override destroy(): void {
    Object.values(this.particles).forEach(p => {
      disposeObject3D(p.sprite);
    });
    Object.values(this.textures ?? {}).forEach(tex => tex.dispose());
    super.destroy();
  }

  override async setupMesh(context: UnitModuleSetupContext) {
    const root = new Object3D();
    root.add(context.mesh);
    this.root = root;
    return root;
  }

  public getDamageLevel() {
    if (this.state.damage >= DamageLevel.DEMOLISHED) {
      return DamageLevel.DEMOLISHED;
    } else if (this.state.damage >= DamageLevel.DAMAGED) {
      return DamageLevel.DAMAGED;
    } else {
      return DamageLevel.INTACT;
    }
  }

  public isDemolished() {
    return this.state.damage >= 1;
  }

  public hit(projectile: Projectile) {
    if (this.isDemolished()) {
      console.log('Already demolished:', this.getUnit(), projectile);
      return;
    }
    console.log('Hit object:', this.getUnit(), projectile);
    this.setValue(this.state.damage + projectile.strength);
  }

  private setValue(value: number) {
    if (this.isDemolished()) return;
    this.state.damage = Math.max(0, value);
    this.observables.damage$.next(this.state.damage);
    if (this.state.damage >= 1) {
      this.observables.destroyed$.next();
    }
  }

  override update(_v: AnimationLoopValue): void {
    const dt = 0.016;

    if (this.getDamageLevel() >= DamageLevel.DEMOLISHED && Math.random() < 0.4)
      this.spawnFire();
    if (this.getDamageLevel() >= DamageLevel.DAMAGED && Math.random() < 0.12)
      this.spawnSmoke();

    const particles = this.particles;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]!;
      p.update(dt);
      // Feuer schmaler, Rauch größer
      if (p.sprite.material.map === this.textures?.fireTexture) {
        p.sprite.scale.multiplyScalar(0.97);
      } else {
        p.sprite.scale.multiplyScalar(1.01);
      }
      if (p.life <= 0) {
        this.root?.remove(p.sprite);
        disposeObject3D(p.sprite);
        particles.splice(i, 1);
      }
    }
  }

  private spawnSmoke() {
    if (!this.textures) return;
    const p = new Particle(
      this.textures?.smokeTexture,
      new Vector3(0, 0, 0),
      0.8
    );

    p.velocity.set(
      (Math.random() - 0.5) * 0.1,
      0.6,
      (Math.random() - 0.5) * 0.1
    );

    p.sprite.material.opacity = 0.6;

    disableRaycaster(p.sprite);
    this.root?.add(p.sprite);
    this.particles.push(p);
  }

  private spawnFire() {
    if (!this.textures) return;
    const p = new Particle(
      this.textures.fireTexture,
      new Vector3(0, 0, 0),
      0.5 + Math.random() * 0.3
    );

    p.velocity.set(
      (Math.random() - 0.5) * 0.2,
      1.5 + Math.random(),
      (Math.random() - 0.5) * 0.2
    );

    disableRaycaster(p.sprite);
    this.root?.add(p.sprite);
    this.particles.push(p);
  }
}

async function loadTextures() {
  const [fireTexture, smokeTexture] = await Promise.all([
    await assetLoader.add<Texture>({
      value: textureFire,
      loader: LOADER.TEXTURE
    }),
    await assetLoader.add<Texture>({
      value: textureSmoke,
      loader: LOADER.TEXTURE
    })
  ]).then(textures =>
    textures.map(tex => {
      tex.magFilter = NearestFilter;
      tex.minFilter = NearestFilter;
      return tex;
    })
  );
  return { fireTexture, smokeTexture } as {
    fireTexture: Texture;
    smokeTexture: Texture;
  };
}
