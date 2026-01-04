import { ReplaySubject } from 'rxjs';
import { Texture, NearestFilter, Vector3, Object3D } from 'three';
import textureFire from '@blue-might/app/assets/fire/fire.png?url';
import textureSmokeLight from '@blue-might/app/assets/fire/smoke/light.png?url';
import textureSmokeMedium from '@blue-might/app/assets/fire/smoke/medium.png?url';
import textureSmokeHeavy from '@blue-might/app/assets/fire/smoke/heavy.png?url';
import assetLoader from '@blue-might/app/services/assetLoader';

import type Projectile from '../Projectile';
import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleSetupContext,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import { LOADER } from '../AssetLoader';
import { Particle } from '../Particle';
import type { AnimationLoopValue } from '../Renderer';
import { disableRaycaster, disposeObject3D } from '../../utils/object';

export enum SMOKE_TYPE {
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy'
}

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
export interface DamageUnitModuleOptions extends UnitModuleOptions {
  burnTime: number;
  enabled: boolean;
}
export interface DamageUnitModuleState extends UnitModuleState {
  /**
   * Aktueller Schaden normalisiert.
   */
  damage: number;
  maxDamage: number;
  /**
   * Brenndauer in Sekunden
   */
  burnTimeLeft: number;
}

export enum DAMAGE_LEVEL {
  INTACT = 0,
  DAMAGED = 0.5,
  DESTROYED = 1
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
    smokeTexture: {
      [SMOKE_TYPE.LIGHT]: Texture;
      [SMOKE_TYPE.MEDIUM]: Texture;
      [SMOKE_TYPE.HEAVY]: Texture;
    };
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
        ...options,
        burnTime: options.burnTime ?? 5, // 60 Sekunden
        enabled: options.enabled ?? true // Standard: aktiviert
      },
      {
        ...state,
        damage: state.damage ?? 0,
        maxDamage: state.maxDamage ?? 1,
        burnTimeLeft: state.burnTimeLeft ?? 0
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
    Object.values(this.textures ?? {}).forEach(tex => {
      if (tex instanceof Texture) {
        tex.dispose();
      } else {
        Object.values(tex).forEach(t => t.dispose());
      }
    });
    super.destroy();
  }

  override async setupMesh(context: UnitModuleSetupContext) {
    const root = new Object3D();
    root.add(context.mesh);
    this.root = root;
    return root;
  }

  override update(_v: AnimationLoopValue): void {
    const dt = 0.016;

    if (!this.options.enabled) return; // Wenn deaktiviert, keine Updates

    if (this.state.burnTimeLeft > 0) {
      this.state.burnTimeLeft -= dt;
      if (
        this.getDamageLevel() >= DAMAGE_LEVEL.DESTROYED &&
        Math.random() < 0.4
      ) {
        this.spawnFire();
        this.spawnSmoke(SMOKE_TYPE.HEAVY);
      } else if (
        this.getDamageLevel() >= DAMAGE_LEVEL.DAMAGED &&
        Math.random() < 0.12
      ) {
        this.spawnSmoke(SMOKE_TYPE.MEDIUM);
      }
    } else if (this.isDestroyed()) {
      if (Math.random() < 0.05) {
        this.spawnSmoke(SMOKE_TYPE.HEAVY);
      }
    }

    // Logik-Updates für Partikel (Bewegung und Lebenszeit)
    this.particles.forEach(p => {
      p.update(dt);
    });
  }

  override renderUpdate(_v: AnimationLoopValue): void {
    // Rendering-Updates: Skalierung und Entfernung toter Partikel
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      // Feuer schmaler, Rauch größer
      if (p.sprite.material.map === this.textures?.fireTexture) {
        p.sprite.scale.multiplyScalar(0.97);
      } else {
        p.sprite.scale.multiplyScalar(1.01);
      }
      if (p.life <= 0) {
        this.root?.remove(p.sprite);
        disposeObject3D(p.sprite);
        this.particles.splice(i, 1);
      }
    }
  }

  public hit(projectile: Projectile) {
    if (!this.options.enabled || this.isDestroyed()) {
      return;
    }
    this.takeDamage(projectile.strength);
    this.spawnSmoke(SMOKE_TYPE.MEDIUM);
  }

  takeDamage(amount: number) {
    if (!this.options.enabled) return;
    this.setValue(this.state.damage + amount);
  }

  takeMaxDamage() {
    this.setValue(this.state.maxDamage);
  }

  setValue(value: number) {
    if (!this.canDamage() && this.isDestroyed()) return;
    this.state.damage = Math.max(0, value);
    this.observables.damage$.next(this.state.damage);
    if (this.isDestroyed()) {
      this.state.burnTimeLeft = this.options.burnTime;
      this.observables.destroyed$.next();
    }
  }

  getDamageValue() {
    return this.state.damage / this.state.maxDamage;
  }

  public getDamageLevel() {
    let value = 0;
    if (this.state.damage >= DAMAGE_LEVEL.DESTROYED) {
      value = DAMAGE_LEVEL.DESTROYED;
    } else if (this.state.damage >= DAMAGE_LEVEL.DAMAGED) {
      value = DAMAGE_LEVEL.DAMAGED;
    } else {
      value = DAMAGE_LEVEL.INTACT;
    }
    return value * this.state.maxDamage;
  }

  public canDamage() {
    return this.options.enabled && this.state.damage < DAMAGE_LEVEL.DESTROYED;
  }

  public isDestroyed() {
    return this.state.damage >= this.state.maxDamage;
  }

  private spawnSmoke(type: SMOKE_TYPE = SMOKE_TYPE.MEDIUM) {
    if (!this.textures) return;
    const p = new Particle(
      this.textures?.smokeTexture[type],
      new Vector3(0, 0, 0),
      0.8,
      { fade: false }
    );

    p.velocity.set(
      (Math.random() - 0.5) * 0.1,
      0.6,
      (Math.random() - 0.5) * 0.1
    );

    // p.sprite.material.opacity = 0.6;

    disableRaycaster(p.sprite);
    this.root?.add(p.sprite);
    this.particles.push(p);
  }

  private spawnFire() {
    if (!this.textures) return;
    const p = new Particle(
      this.textures.fireTexture,
      new Vector3(0, 0, 0),
      0.5 + Math.random() * 0.3,
      { fade: false }
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
  const [
    fireTexture,
    smokeLightTexture,
    smokeMediumTexture,
    smokeHeavyTexture
  ] = await Promise.all(
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
    fireTexture,
    smokeTexture: {
      [SMOKE_TYPE.LIGHT]: smokeLightTexture,
      [SMOKE_TYPE.MEDIUM]: smokeMediumTexture,
      [SMOKE_TYPE.HEAVY]: smokeHeavyTexture
    }
  } as {
    fireTexture: Texture;
    smokeTexture: {
      [SMOKE_TYPE.LIGHT]: Texture;
      [SMOKE_TYPE.MEDIUM]: Texture;
      [SMOKE_TYPE.HEAVY]: Texture;
    };
  };
}
