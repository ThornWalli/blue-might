import type { MeshStandardMaterial, Object3D } from 'three';
import {
  CircleGeometry,
  DoubleSide,
  Mesh,
  MeshBasicMaterial,
  SkinnedMesh,
  Vector2,
  Vector3
} from 'three';
import { distinctUntilChanged, ReplaySubject } from 'rxjs';
import type { Units } from '@blue-might/units';
import * as units from '@blue-might/units';

import type { App } from '../../types';
import type { AppModuleObservables, AppModuleState } from '../AppModule';
import AppModule from '../AppModule';
import type Unit from '../Unit';
import { EDITOR_MODE } from '../app/AppEditor';
import { disableRaycaster, disposeObject3D } from '../../utils/object';
import { getUnitMap } from '../../utils/unit';
import type { UnitIdentifier } from '../../types/unit';

export enum ACTION {
  ADD = 'add',
  REMOVE = 'remove'
}

interface Observables extends AppModuleObservables {
  unitKey$: ReplaySubject<UnitIdentifier | null>;
  unit$: ReplaySubject<Units | null>;
  creating$: ReplaySubject<boolean>;
  moving$: ReplaySubject<boolean>;
  action$: ReplaySubject<ACTION>;
  actionRadius$: ReplaySubject<number>;
  actionIntensity$: ReplaySubject<number>;
  autoApply$: ReplaySubject<boolean>;
}

interface State extends AppModuleState {
  unitKey: UnitIdentifier | null;
  unit: Unit | null;
  creating: boolean;
  moving: boolean;
  action: ACTION;
  actionRadius: number;
  actionIntensity: number;
  autoApply: boolean;
  ghostUnit?: Unit | null;
}

export default class EditorUnitsAppModule extends AppModule<
  State,
  Observables
> {
  async create(value: string) {
    if (!('editorGrid' in this.app.modules)) return;

    const unit = await this.createUnit(value);
    this.setCreate(true);
    this.setMove(true);
    this.setUnit(unit);
  }
  static override TYPE = 'editorUnits';
  radiusHelper: Mesh | null = null;

  constructor(app: App) {
    super(app, {
      unitKey: null,
      unit: null,
      creating: false,
      moving: false,
      action: ACTION.ADD,
      actionRadius: 0,
      actionIntensity: 1,
      autoApply: false,
      ghostUnit: null
    });
    //#region observables
    this.observables.unitKey$ = new ReplaySubject<UnitIdentifier | null>(1);
    this.observables.unit$ = new ReplaySubject<Unit | null>(1);
    this.observables.creating$ = new ReplaySubject<boolean>(1);
    this.observables.moving$ = new ReplaySubject<boolean>(1);
    this.observables.action$ = new ReplaySubject<ACTION>(1);
    this.observables.action$.next(this.state.action);
    this.observables.actionRadius$ = new ReplaySubject<number>(1);
    this.observables.actionRadius$.next(this.state.actionRadius);
    this.observables.actionIntensity$ = new ReplaySubject<number>(1);
    this.observables.actionIntensity$.next(this.state.actionIntensity);
    this.observables.autoApply$ = new ReplaySubject<boolean>(1);
    this.observables.autoApply$.next(this.state.autoApply);
    //#endregion
  }

  async setUnitKey(unitKey: UnitIdentifier | null) {
    if (this.state.unitKey === unitKey) return;

    this.state.unitKey = unitKey;
    this.observables.unitKey$.next(unitKey);

    if (unitKey) {
      this.state.ghostUnit = await this.createUnit(unitKey);
      this.state.ghostUnit.modules.collision.disableCollision();
      disableRaycaster(this.state.ghostUnit.root);
    } else {
      this.state.ghostUnit?.destroy();
      this.state.ghostUnit = null;
    }

    this.setMove(!!unitKey);
  }

  createRadiusHelper() {
    const geometry = new CircleGeometry(1, 16);
    geometry.rotateX(-Math.PI / 2);
    const material = new MeshBasicMaterial({
      color: 0xffffff,
      side: DoubleSide,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      opacity: 0.5
    });
    this.radiusHelper = new Mesh(geometry, material);
    this.radiusHelper.scale.set(0, 0, 0);
    this.app.getScene().add(this.radiusHelper);
  }

  removeRadiusHelper() {
    if (this.radiusHelper) {
      disposeObject3D(this.radiusHelper);
      this.radiusHelper = null;
    }
  }

  override destroy() {
    super.destroy();
    this.removeRadiusHelper();
  }

  override async setup() {
    await super.setup();

    if ('editorGrid' in this.app.modules) {
      const editorGrid = this.app.modules.editorGrid;
      //#region editor grid
      this.subscription.add(
        editorGrid.observables.movePosition$.subscribe(p => {
          if (this.state.moving) {
            if (this.state.ghostUnit) {
              this.state.ghostUnit.setPosition(new Vector3(p.x, 0, p.y), {
                force: true
              });
            } else if (this.state.unit) {
              this.state.unit.setPosition(new Vector3(p.x, 0, p.y));
            }
          }
          this.radiusHelper?.position.set(
            p.x,
            this.app.modules.map
              .getMap()
              ?.modules.surface.getSurfaceHeightAt(p.x, p.y) ?? 0,
            p.y
          );
        })
      );

      this.subscription.add(
        editorGrid.observables.currentPosition$.subscribe(async position => {
          if (this.state.action === ACTION.ADD) {
            if (this.state.moving && this.state.ghostUnit) {
              this.placeUnit(position);
            } else {
              this.setMove(false);
            }
          } else if (this.state.action === ACTION.REMOVE) {
            this.removeUnits(position);
          }
        })
      );
      this.subscription.add(
        this.app.modules.selection.observables.selectUnit$.subscribe(u => {
          if (this.state.ghostUnit) {
            this.placeUnit();
          } else {
            // debugger;
            // if ('isMode' in this.app && !this.app.isMode(EDITOR_MODE.DEFAULT))
            //   return;
            console.log('selectUnit$', u);
            this.setUnit(u);
          }
        })
      );
      //#endregion
      if ('mode$' in this.app.observables) {
        this.subscription.add(
          this.app.observables.mode$
            .pipe(distinctUntilChanged())
            .subscribe(mode => {
              if (mode !== EDITOR_MODE.UNITS) {
                // this.setUnit(null);
                this.reset();
              } else {
                this.createRadiusHelper();
              }
            })
        );
      }
    }
  }

  private reset() {
    this.setUnitKey(null);
    this.removeRadiusHelper();
    this.setActionRadius(0);
    this.setActionIntensity(1);
    this.setAction(ACTION.ADD);
  }

  async placeUnit(position?: Vector2) {
    console.log(position?.x, 0, position?.y);
    // this.state.ghostUnit.setPosition(new Vector3(p.x, 0, p.y));
    const key = this.state.unitKey!;
    // this.state.unit?.destroy();
    // this.setUnit(null);
    const radius = this.state.actionRadius;
    if (radius !== 0) {
      await this.sprinkleUnits(key, radius, this.state.actionIntensity, false);
    } else if (!this.state.unit) {
      const unit = await this.createUnit(key);
      const pos = this.state.ghostUnit?.getPosition().clone() ?? new Vector3();
      if (position) {
        pos.set(position.x, 0, position.y);
      }

      if (unit.checkPosition(pos)) {
        unit.setPosition(pos);
        this.setUnit(unit);
        this.setUnitKey(null);
      } else {
        unit.destroy();
      }
    } else {
      this.setMove(false);
    }
    // if (this.state.autoApply) {
    //   this.apply();
    //   const existingUnits = this.app.modules.map
    //     .getMap()
    //     ?.modules.units.getUnitsInRadius(new Vector3(p.x, 0, p.y), 0.1);
    //   if (!existingUnits?.length) {
    //     const unit = await this.createUnit(key);
    //     unit.setPosition(new Vector3(p.x, 0, p.y));
    //     this.setCreate(true);
    //     this.setMove(true);
    //     this.setUnit(unit);
    //   }
  }

  removeUnits(position: Vector2) {
    const radius = this.state.actionRadius;
    const units = this.app.modules.map
      .getMap()
      ?.modules.units.getUnitsInRadius(
        new Vector3(position.x, 0, position.y),
        radius
      );
    units?.forEach(unit => unit.destroy());
  }

  async createUnit(unitKey: string) {
    const UnitClass = unitMap.get(unitKey);
    if (!UnitClass) throw new Error(`Unit class not found for key: ${unitKey}`);
    let unit = new UnitClass();
    unit = await this.app.modules.map.getMap()!.modules.units.add(unit);

    return unit;
  }

  private setUnit(unit: Unit | null) {
    if (this.state.unit === unit) return;

    if (this.state.unit) {
      setObjectOpacity(this.state.unit.root, 1);
    }

    this.state.unit = unit;
    this.observables.unit$.next(unit);

    if (unit) {
      setObjectOpacity(unit.root, 0.6);
    } else {
      this.setCreate(false);
      this.setMove(false);
    }
  }

  private setCreate(v: boolean) {
    if (this.state.creating === v) return;
    this.state.creating = v;
    this.observables.creating$.next(v);
  }

  private setMove(v: boolean) {
    if (this.state.moving === v) return;
    this.state.moving = v;
    this.observables.moving$.next(v);
  }

  setAction(action: ACTION) {
    if (this.state.action === action) return;
    this.state.action = action;
    this.observables.action$.next(action);
  }

  setActionRadius(radius: number) {
    if (this.state.actionRadius === radius) return;
    this.radiusHelper?.scale.set(radius, radius, radius);
    this.state.actionRadius = radius;
    this.observables.actionRadius$.next(radius);
  }

  setActionIntensity(intensity: number) {
    if (this.state.actionIntensity === intensity) return;
    this.state.actionIntensity = intensity;
    this.observables.actionIntensity$.next(intensity);
  }

  move() {
    this.setMove(true);
  }

  apply() {
    this.setCreate(false);
    this.setUnit(null);
  }

  abort() {
    if (this.state.creating) {
      this.state.unit?.destroy();
    }
    this.setUnit(null);
  }

  delete() {
    this.state.unit?.destroy();
    this.setUnit(null);
  }

  focus() {
    if (!this.state.unit) return;
    this.app.modules.unitFocus.focus(this.state.unit);
  }

  setAutoApply(autoApply: boolean) {
    if (this.state.autoApply === autoApply) return;
    this.state.autoApply = autoApply;
    this.observables.autoApply$.next(autoApply);
  }

  /**
   * Platziert Einheiten zufällig in einem Kreisradius um die aktuelle Position.
   * @param unitKey Der Schlüssel der Einheit (z.B. aus units).
   * @param intensity Anzahl der zu platzierenden Einheiten.
   * @param useSnapGrid Optional: Snap-Positionen zum Grid (standard: true, wenn EditorGrid aktiv).
   */
  async sprinkleUnits(
    unitKey: string,
    radius: number,
    intensity: number,
    useSnapGrid?: boolean
  ) {
    const map = this.app.modules.map.getMap();
    if (!map) return;

    if (!('editorGrid' in this.app.modules)) return;

    const center = this.app.modules.editorGrid.getCurrentPosition(); // Aktuelle Position als Zentrum

    const snap = useSnapGrid ?? this.app.modules.editorGrid.state.snapPosition;
    const gridSize = this.app.modules.editorGrid.state.gridSize;

    // Map-Grenzen aus dem Surface-Modul holen
    const terrainWidth = map.modules.surface.state.terrainWidth;
    const terrainHeight = map.modules.surface.state.terrainHeight;
    const minX = -terrainWidth / 2;
    const maxX = terrainWidth / 2;
    const minY = -terrainHeight / 2; // y steht hier für z-Koordinate
    const maxY = terrainHeight / 2;

    for (let i = 0; i < intensity; i++) {
      const unit = await this.createUnit(unitKey);
      let tries = 0;
      while (tries < 10) {
        tries++;
        // Zufällige Position im Kreis berechnen
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * radius;
        let x = center.x + Math.cos(angle) * distance;
        let y = center.y + Math.sin(angle) * distance;

        // Optional: Snap zum Grid
        if (snap) {
          const size = new Vector2(terrainWidth, terrainHeight);
          const offset = size.clone().divideScalar(2);
          const i_x = Math.round((x + offset.x - gridSize / 2) / gridSize);
          const i_y = Math.round((y + offset.y - gridSize / 2) / gridSize);
          const sizeByGridSize = size.clone().divideScalar(gridSize);
          const clamped_i_x = Math.max(0, Math.min(i_x, sizeByGridSize.x - 1));
          const clamped_i_y = Math.max(0, Math.min(i_y, sizeByGridSize.y - 1));
          x = -offset.x + (clamped_i_x + 0.5) * gridSize;
          y = -offset.y + (clamped_i_y + 0.5) * gridSize;
        }

        // Positionen auf Map-Grenzen klammern (auch ohne Snap)
        x = Math.max(minX, Math.min(maxX, x));
        y = Math.max(minY, Math.min(maxY, y));

        const pos = new Vector3(x, 0, y);
        if (unit.checkPosition(pos)) {
          unit.setPosition(pos);
          break;
        }
      }
    }
  }
}

const unitMap = getUnitMap(units);
console.log(unitMap);
export async function getUnits() {
  return await import('@blue-might/units');
}

function setObjectOpacity(obj: Object3D, opacity: number) {
  obj.traverse(child => {
    if (child instanceof Mesh || child instanceof SkinnedMesh) {
      const material = child.material as MeshStandardMaterial;
      if (opacity < 1) {
        material.transparent = true;
        material.opacity = opacity;
      } else {
        material.transparent = true;
        material.opacity = 1;
      }
    }
  });
}
