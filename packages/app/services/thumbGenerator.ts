import {
  Timer,
  Vector2,
  Vector3,
  type Object3D,
  type OrthographicCamera,
  type Scene,
  type WebGLRenderer
} from 'three';
import { Subject, Subscription } from 'rxjs';
import { markRaw } from 'vue';
import * as units from '@blue-might/units';
import { projectiles } from '@blue-might/weapon';

import {
  createCamera,
  createRenderer,
  createScene,
  updateOrthoCameraForObject,
  updateOrthoCameraForObjectFrontal,
  updateOrthoCameraForObjectSide
} from '../utils/unitPreview';
import type Unit from '../lib/classes/Unit';
import type { AnimationLoopValue } from '../lib/classes/Renderer';
import type { UnitConstructorOptions } from '../lib/classes/Unit';
import type Faction from '../lib/classes/Faction';
import type Projectile from '../lib/classes/Projectile';
import { loadGltf } from '../lib/utils/gltf';

export type ViewType = 'isometric' | 'front' | 'side';

class ThumbGenerator {
  private imageCache = new Map<string, Promise<string | null>>();
  private size: Vector2 = new Vector2(128, 128);
  private canvas: HTMLCanvasElement | null = null;
  private renderer: WebGLRenderer | null = null;
  private scene: Scene;
  private camera: OrthographicCamera;
  private timer: Timer = new Timer();
  private renderAborted = false;
  private renderTries = 0;
  private maxRenderTries = 10;

  constructor() {
    this.canvas = document.createElement('canvas');
    // this.canvas.style.position = 'fixed';
    // this.canvas.style.top = '0';
    // this.canvas.style.left = '0';
    // this.canvas.style.zIndex = '1000';
    // document.body.appendChild(this.canvas);

    this.renderer = createRenderer(this.canvas);
    this.scene = createScene();
    this.camera = createCamera();

    this.scene.add(this.camera);
    this.timer.connect(document);

    this.renderer.setAnimationLoop(time => {
      this.timer.update(time);
      this.renderer!.render(this.scene, this.camera);
    });
  }

  async getFromObject(
    key: string,
    obj: Object3D,
    {
      size,
      ratio,
      view
    }: {
      size: number;
      view?: ViewType;
      ratio?: number;
    }
  ) {
    view = view ?? 'isometric';
    ratio = ratio ?? 1;
    key = key ?? `object_${size}_${ratio}_${view}`;

    if (this.imageCache.has(key)) {
      return Promise.resolve(this.imageCache.get(key) as Promise<string>);
    }

    return this.addQueue(key, obj, {
      size,
      view,
      ratio
    });
  }

  async getFromProjectile(
    type: string,
    { size, view, ratio }: { size: number; view: ViewType; ratio?: number }
  ) {
    const ProjectileClass = projectiles[type];
    if (!ProjectileClass) {
      throw new Error(`Unknown projectile type: ${type}`);
    }

    view = view ?? 'isometric';
    ratio = ratio ?? 1;

    const key = `projectile_${type}_${size}_${view}`;

    if (this.imageCache.has(key)) {
      return Promise.resolve(this.imageCache.get(key) as Promise<string>);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectile = new (ProjectileClass as unknown as any)() as Projectile;

    const gltf = await loadGltf(await projectile.getGlb());

    return this.addQueue(key, gltf.object, {
      size,
      view,
      ratio
    });
  }

  async getFromUnit(
    type: string,
    {
      faction,
      action,
      size,
      ratio,
      view
    }: {
      faction?: Faction;
      action?: string;
      size: number;
      ratio?: number;
      view?: ViewType;
    }
  ) {
    action = action ?? 'idle';
    view = view ?? 'isometric';
    ratio = ratio ?? 1;
    const key = `${type}_${action}_${faction?.id ?? 'neutral'}_${size}_${ratio}_${view}`;

    if (this.imageCache.has(key)) {
      return Promise.resolve(this.imageCache.get(key) as Promise<string>);
    }

    const unit = await getUnit({
      type,
      action,
      faction
    });

    const obj = unit.root;

    const result = await this.addQueue(key, obj, {
      size,
      view,
      ratio
    });

    unit.destroy();

    return result;
  }

  private async addQueue(
    key: string,
    obj: Object3D,
    { size, view, ratio }: { size: number; view: ViewType; ratio: number }
  ) {
    const resolvers = Promise.withResolvers<string>();
    const promise = resolvers.promise;

    this.imageCache.set(key, promise);

    this.queue.push({
      key,
      resolve: resolvers.resolve,
      obj,
      view,
      size,
      ratio
    });

    if (!this.queueRunning) {
      this.processQueue();
    }

    return promise;
  }

  private processQueue() {
    if (this.queue.length > 0) {
      this.queueRunning = true;
      const { resolve, obj, view, size, ratio } = this.queue.shift()!;
      this.setSize(size, size * ratio);
      this.updatePreview(obj, view).then(() => {
        window.requestAnimationFrame(async () => {
          const src = await this.getDataUrl();
          obj.removeFromParent();
          resolve(src);
          this.processQueue();
        });
      });
    } else {
      this.queueRunning = false;
    }
  }

  private queue: {
    key: string;
    resolve: (value: string) => void;
    size: number;
    ratio: number;
    obj: Object3D;
    view: ViewType;
  }[] = [];
  private queueRunning = false;

  setSize(width: number, height: number) {
    this.size.set(width, height);

    const ratio = globalThis.devicePixelRatio || 1;
    this.renderer?.setSize(this.size.x * ratio, this.size.y * ratio, true);
  }

  abort() {
    this.renderAborted = true;
  }

  private async updatePreview(obj: Object3D, view: ViewType = 'isometric') {
    this.scene.add(obj);

    switch (view) {
      case 'front':
        updateOrthoCameraForObjectFrontal(
          this.camera,
          this.size.x / this.size.y,
          this.scene,
          new Vector3(0, 0, 1) // Frontale Richtung
        );
        break;
      case 'side':
        updateOrthoCameraForObjectSide(
          this.camera,
          this.size.x / this.size.y,
          this.scene,
          new Vector3(1, 0, 0) // Seitliche Richtung
        );
        break;
      case 'isometric':
      default:
        updateOrthoCameraForObject(
          this.camera,
          this.size.x / this.size.y,
          this.scene,
          new Vector3(10, 10, 10)
        );
        break;
    }
  }

  destroy() {
    this.timer.disconnect();
    this.renderer?.dispose();
    this.scene.clear();
    //   const gl = this.renderer?.getContext();
    //   gl?.getExtension('WEBGL_lose_context')?.loseContext();
  }

  async getDataUrl() {
    const src = this.renderer?.domElement.toDataURL('image/png');
    if (src && (await this.hasImageData(src))) {
      return src;
    } else {
      if (this.renderTries < this.maxRenderTries && !this.renderAborted) {
        this.renderTries++;
        console.log('Retry to render preview image', this.renderTries);
        return new Promise<string>(resolve => {
          window.setTimeout(() => this.getDataUrl().then(resolve), 1000);
        });
      } else {
        return '';
      }
    }
  }

  private readonly img = new Image();
  /**
   * Überprüfe Bild auf existierende Pixel
   */
  private async hasImageData(value: string) {
    const img = this.img;
    const { promise, resolve } = Promise.withResolvers();
    img.onload = () => resolve(img);
    img.src = value;

    await promise;
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return false;
    }
    ctx.drawImage(img, 0, 0);
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < imgData.length; i += 4) {
      if (imgData[i] !== 0) {
        return true;
      }
    }
    return false;
  }
}

const unitMap = new Map(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Object.values(units).map(unit => [unit.KEY, unit] as [string, any])
);

const animationLoop$ = new Subject<AnimationLoopValue>();

async function getUnit(data: {
  action: string;
  type: string;
  faction?: Faction;
}) {
  const UnitClass = (await unitMap.get(
    data.type as keyof typeof units
  )) as unknown as { new (options: Partial<UnitConstructorOptions>): Unit };
  const instance = markRaw(
    new UnitClass({
      preview: true,
      moduleOptions: {
        faction: {
          factionOverride: data.faction || undefined
        }
      }
    }) as Unit
  );

  await instance.setup({});
  await instance.afterSetup({});

  const subscription = new Subscription();
  return new Promise<Unit>(resolve => {
    subscription.add(
      instance.observables.materialReady$.subscribe(() => {
        subscription.add(
          animationLoop$.subscribe(value => {
            instance!.update(value);
          })
        );
        if (instance.modules.animation) {
          if (data.action) {
            instance.modules.animation.playAction(data.action);
          } else {
            instance.modules.animation.playAction('idle');
          }
        }
        subscription.unsubscribe();
        resolve(instance);
      })
    );
  });
}

const thumbGenerator = new ThumbGenerator();
export default thumbGenerator;
