import {
  Vector2,
  BoxGeometry,
  InstancedMesh,
  Mesh,
  Object3D,
  MeshBasicMaterial
} from 'three';
import { Subject, type Observable } from 'rxjs';
import { EMPTY, ReplaySubject, switchMap, map as rxjsMap } from 'rxjs';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import { disposeObject3D } from '../../utils/object';
import type Map from '../Map';

enum HELPER_TYPE {
  SELECT = 'select',
  CURRENT = 'current'
}

interface Observables extends AppModuleObservables {
  gridActive$: ReplaySubject<boolean>;
  gridSize$: ReplaySubject<number>;
  snapPosition$: ReplaySubject<boolean>;
  currentPosition$: ReplaySubject<Vector2>;
  movePosition$: Subject<Vector2>;
}

interface State extends AppModuleState {
  gridActive: boolean;
  gridSize: number;
  snapPosition: boolean;
  currentPosition: Vector2;
}
export default class EditorGridAppModule extends AppModule<State, Observables> {
  getCurrentPosition() {
    return this.state.currentPosition;
  }
  static override TYPE = 'editorGrid';
  override state: State = {
    gridActive: false,
    snapPosition: true,
    gridSize: 1,
    currentPosition: new Vector2()
  };

  private root: InstancedMesh | null = null;

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.gridActive$ = new ReplaySubject(1);
    this.observables.gridActive$.next(this.state.gridActive);
    this.observables.gridSize$ = new ReplaySubject(1);
    this.observables.gridSize$.next(this.state.gridSize);
    this.observables.snapPosition$ = new ReplaySubject(1);
    this.observables.snapPosition$.next(this.state.snapPosition);
    this.observables.currentPosition$ = new ReplaySubject<Vector2>(1);
    this.observables.movePosition$ = new Subject<Vector2>();
    //#endregion observables
  }

  override async setup() {
    const map$ = this.app.modules.map.observables.map$;

    //#region grid active
    this.subscription.add(
      this.observables.gridActive$
        .pipe(
          switchMap(active => {
            if (active) {
              return map$;
            } else {
              this.removeRoot();
              return EMPTY;
            }
          })
        )
        .subscribe(map => {
          this.refreshRoot(map);
        })
    );
    //#endregion

    //#region ground position
    this.subscription.add(
      map$
        .pipe(
          switchMap(
            map =>
              map?.modules.surface.observables.hover$.pipe(
                rxjsMap(position => {
                  return {
                    position,
                    map
                  };
                })
              ) || EMPTY
          ),
          snapToGrid(this.state)
        )
        .subscribe(({ map, position }) => {
          this.observables.movePosition$.next(position);
          this.updatePositionHelper(HELPER_TYPE.SELECT, position, map);
        })
    );
    this.subscription.add(
      map$
        .pipe(
          switchMap(
            map =>
              map?.modules.surface.observables.select$.pipe(
                rxjsMap(position => {
                  return {
                    position,
                    map
                  };
                })
              ) || EMPTY
          ),
          snapToGrid(this.state)
        )
        .subscribe(({ map, position }) => {
          this.state.currentPosition = position;
          this.observables.currentPosition$.next(position);
          this.updatePositionHelper(HELPER_TYPE.CURRENT, position, map);
        })
    );

    //#endregion

    this.createPositionHelper(HELPER_TYPE.SELECT);
    this.createPositionHelper(HELPER_TYPE.CURRENT);
  }
  override destroy() {
    super.destroy();
    this.removeRoot();
    this.removePositionHelper();
  }

  removeRoot() {
    if (this.root) {
      disposeObject3D(this.root);
      this.root = null;
    }
  }

  refreshRoot(map: Map = this.app.modules.map.getMap()!) {
    this.removeRoot();

    const size = new Vector2(
      map.modules.surface.state.terrainWidth,
      map.modules.surface.state.terrainHeight
    );

    const gridSize = this.state.gridSize;

    const boxSize = 0.05;
    const geometry = new BoxGeometry(boxSize, boxSize, boxSize);
    geometry.translate(-boxSize / 2, 0, -boxSize / 2);

    const offset = size.clone().divideScalar(2);
    const sizeByGridSize = size.clone().divideScalar(gridSize);

    this.root = new InstancedMesh(
      geometry,
      new MeshBasicMaterial({
        color: 0xff00ff,
        transparent: true,
        opacity: 1
      }),
      sizeByGridSize.x * sizeByGridSize.y
    );

    for (let i = 0; i < sizeByGridSize.x * sizeByGridSize.y; i++) {
      const matrix = this.root!.matrix.clone();
      const x = i % sizeByGridSize.x;
      const y = Math.floor(i / sizeByGridSize.x);

      const x_ = -offset.x + x * gridSize + gridSize / 2;
      const y_ = -offset.y + y * gridSize + gridSize / 2;

      matrix.setPosition(
        x_,
        map.modules.surface.getTerrainHeightAt(x_, y_) ||
          map.modules.surface.getSeaLevel(),
        y_
      );
      this.root!.setMatrixAt(i, matrix);
    }

    this.app.getScene().add(this.root);
  }

  setSnapPosition(value: boolean) {
    if (this.state.snapPosition === value) return;
    this.state.snapPosition = value;
    this.observables.snapPosition$.next(value);
  }

  setGridSize(gridSize: number) {
    if (this.state.gridSize === gridSize) return;
    this.state.gridSize = gridSize;
    this.observables.gridSize$.next(gridSize);
    if (this.state.gridActive) {
      this.refreshRoot();
    }
  }

  setGridActive(gridActive: boolean) {
    if (this.state.gridActive === gridActive) return;
    this.state.gridActive = gridActive;
    this.observables.gridActive$.next(gridActive);
  }

  //#region position helper

  private positionHelpers: {
    [HELPER_TYPE.SELECT]: Object3D | null;
    [HELPER_TYPE.CURRENT]: Object3D | null;
  } = {
    [HELPER_TYPE.SELECT]: null,
    [HELPER_TYPE.CURRENT]: null
  };
  private createPositionHelper(type: HELPER_TYPE) {
    const color = type === HELPER_TYPE.SELECT ? 0xffff00 : 0x00ff00;
    const size = 0.1;
    const geometry = new BoxGeometry(size, size, size);
    const material = new MeshBasicMaterial({ color });

    const mesh = new Mesh(geometry, material);
    mesh.position.y = size / 2;
    const obj = new Object3D();
    obj.add(mesh);
    this.app.getScene().add(obj);

    this.positionHelpers[type] = obj;
  }

  private updatePositionHelper(type: HELPER_TYPE, position: Vector2, map: Map) {
    const helper = this.positionHelpers[type];
    if (!helper) return;

    const y = Math.max(
      map.modules.surface.getSeaLevel(),
      map.modules.surface.getTerrainHeightAt(position.x, position.y)
    );
    helper.position.set(position.x, y, position.y);
  }

  private removePositionHelper() {
    Object.values(this.positionHelpers).forEach(
      obj => obj && disposeObject3D(obj)
    );
    this.positionHelpers = {
      [HELPER_TYPE.SELECT]: null,
      [HELPER_TYPE.CURRENT]: null
    };
  }

  //#endregion
}

function snapToGrid(state: { gridSize: number; snapPosition: boolean }) {
  return (
    source: Observable<{
      map: Map;
      position: Vector2;
    }>
  ) =>
    source.pipe(
      rxjsMap(({ map, position }) => {
        const { gridSize, snapPosition } = state;
        if (snapPosition) {
          const size = new Vector2(
            map.modules.surface.state.terrainWidth,
            map.modules.surface.state.terrainHeight
          );
          const offset = size.clone().divideScalar(2);
          const i_x = Math.round(
            (position.x + offset.x - gridSize / 2) / gridSize
          );
          const i_y = Math.round(
            (position.y + offset.y - gridSize / 2) / gridSize
          );
          const sizeByGridSize = size.clone().divideScalar(gridSize);
          const clamped_i_x = Math.max(0, Math.min(i_x, sizeByGridSize.x - 1));
          const clamped_i_y = Math.max(0, Math.min(i_y, sizeByGridSize.y - 1));

          position.x = -offset.x + (clamped_i_x + 0.5) * gridSize;
          position.y = -offset.y + (clamped_i_y + 0.5) * gridSize;

          return {
            map,
            position
          };
        } else {
          return {
            map,
            position
          };
        }
      })
    );
}
