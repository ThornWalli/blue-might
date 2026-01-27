import type { MeshStandardMaterial, Object3D } from 'three';
import { Mesh, SkinnedMesh, Vector3 } from 'three';
import { distinctUntilChanged, ReplaySubject } from 'rxjs';

import type { App } from '../../types';
import type { AppModuleObservables, AppModuleState } from '../AppModule';
import AppModule from '../AppModule';
import type Unit from '../Unit';
import { EDITOR_MODE } from '../app/AppEditor';

interface Observables extends AppModuleObservables {
  unit$: ReplaySubject<Unit | null>;
  creating$: ReplaySubject<boolean>;
  moving$: ReplaySubject<boolean>;
}

interface State extends AppModuleState {
  unit: Unit | null;
  creating: boolean;
  moving: boolean;
}

export default class EditorUnitsAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorUnits';
  override state: State = {
    unit: null,
    creating: false,
    moving: false
  };

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.unit$ = new ReplaySubject<Unit | null>(1);
    this.observables.creating$ = new ReplaySubject<boolean>(1);
    this.observables.moving$ = new ReplaySubject<boolean>(1);
    //#endregion
  }

  override async setup() {
    await super.setup();
    if ('editorGrid' in this.app.modules) {
      const editorGrid = this.app.modules.editorGrid;
      //#region editor grid
      this.subscription.add(
        editorGrid.observables.movePosition$.subscribe(p => {
          if (this.state.moving && this.state.unit) {
            this.state.unit.setPosition(new Vector3(p.x, 0, p.y));
          }
        })
      );
      this.subscription.add(
        editorGrid.observables.currentPosition$.subscribe(p => {
          if (this.state.moving && this.state.unit) {
            this.state.unit.setPosition(new Vector3(p.x, 0, p.y));
            this.setMove(false);
          }
        })
      );
      this.subscription.add(
        this.app.modules.selection.observables.selectUnit$.subscribe(u => {
          if ('isMode' in this.app && !this.app.isMode(EDITOR_MODE.DEFAULT))
            return;
          this.setUnit(u);
        })
      );
      //#endregion
      if ('mode$' in this.app.observables) {
        this.subscription.add(
          this.app.observables.mode$
            .pipe(distinctUntilChanged())
            .subscribe(mode => {
              if (mode === EDITOR_MODE.UNITS) {
                this.setUnit(null);
              }
            })
        );
      }
    }
  }

  async createUnit(unitKey: string) {
    const units = await getUnits();
    const UnitClass = units[unitKey as keyof typeof units] as typeof Unit;
    let unit = new UnitClass();
    unit = await this.app.modules.map.getMap()!.modules.units.add(unit);

    this.setCreate(true);
    this.setMove(true);
    this.setUnit(unit);

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
}

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
