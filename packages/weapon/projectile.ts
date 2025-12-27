import Projectile from '@blue-might/app/lib/classes/Projectile';
import {
  PROJECTILE_TYPE,
  type ProjectileDescription
} from '@blue-might/app/lib/types/weapon';
import type { Values } from '@blue-might/app/types';

declare module '@blue-might/app/lib/types/weapon' {
  interface ProjectileTypes {
    DEFAULT: 'default';
  }
}

PROJECTILE_TYPE.DEFAULT = 'default';
export class Default extends Projectile {
  constructor() {
    super({
      id: PROJECTILE_TYPE.DEFAULT,
      speed: 10,
      strength: 0.1
    });
  }

  toDescription(): ProjectileDescription {
    return {
      id: this.id,
      speed: this.speed,
      strength: this.strength
    };
  }
}

export const glbMap = Object.freeze({
  [PROJECTILE_TYPE.DEFAULT]: () =>
    import('./projectile/default/projectile_default.glb?url').then(
      m => m.default ?? m
    )
});

export function getGlb(type: string | Values<typeof PROJECTILE_TYPE>) {
  return glbMap[type as keyof typeof glbMap]();
}

export const sfxMap = Object.freeze({
  [PROJECTILE_TYPE.DEFAULT]: () =>
    import('./projectile/default/projectile_default_sound.wav?url').then(
      m => m.default ?? m
    )
});

export function getSfx(type: string | Values<typeof PROJECTILE_TYPE>) {
  return sfxMap[type as keyof typeof sfxMap]();
}

getSfx(PROJECTILE_TYPE.DEFAULT);

const projectiles = Object.freeze({
  [PROJECTILE_TYPE.DEFAULT]: Default
});
export { projectiles };
