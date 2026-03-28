import type {
  ProjectileInstance,
  ProjectileUpdateContext
} from '@blue-might/app/lib/classes/Projectile';
import Projectile from '@blue-might/app/lib/classes/Projectile';
import { loadGltf } from '@blue-might/app/lib/utils/gltf';

export abstract class Default extends Projectile {
  static override KEY = 'default';
  constructor(options: ConstructorParameters<typeof Projectile>[0]) {
    super({
      ...options,
      features: options.features ?? {
        ...(options.features ?? {}),
        dust: true,
        shoot: true
      }
    });
  }

  override update(
    this: ProjectileInstance<Default>,
    context: ProjectileUpdateContext
  ) {
    this.applyPhysics(context);
  }

  override reset(): void {
    // empty
  }

  override getShootGlb() {
    return import('./shoot.glb?url').then(m => m.default ?? m);
  }

  override getShootSfx() {
    return import('./sfx/shoot.wav?url').then(m => m.default ?? m);
  }
}

export async function getObjectFromProjectiles(name: string) {
  const { object } = await loadGltf(
    await import('./conventional.glb?url').then(m => m.default ?? m)
  );
  const obj = object.getObjectByName(name);
  if (!obj) throw new Error(`${name} not found`);
  return obj;
}
