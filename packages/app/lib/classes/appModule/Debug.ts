import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type App from '../App';
import type { Observable } from 'rxjs';
import {
  ReplaySubject,
  EMPTY,
  filter,
  share,
  switchMap,
  map as rxjsMap
} from 'rxjs';
import {
  Vector2,
  BoxGeometry,
  Mesh,
  MeshLambertMaterial,
  Object3D,
  Vector3
} from 'three';
import type Map from '../Map';
import { disposeObject3D } from '../../utils/object';

export interface PositionMarker {
  id: string;
  position: Vector2;
}

enum HELPER {
  HOVER = 'hover',
  CURRENT = 'current'
}

interface Observables extends AppModuleObservables {
  startAddMarker$: ReplaySubject<void>;
  abortAddMarker$: ReplaySubject<void>;
  endAddMarker$: ReplaySubject<Vector2>;
  startMove$: ReplaySubject<void>;
  endMove$: ReplaySubject<Vector2>;
  positionMarkers$: ReplaySubject<PositionMarker[]>;
  currentPosition$: ReplaySubject<Vector2>;
  lockGrid$: ReplaySubject<boolean>;
}

interface State extends AppModuleState {
  currentPosition: Vector2;
  positionMarkers: PositionMarker[];
  selectMovePosition: boolean;
  selectMarkerPosition: boolean;
  lockGrid: boolean;
}
export default class DebugAppModule extends AppModule<State, Observables> {
  static override TYPE = 'debug';

  private helper: Record<HELPER, Object3D | undefined> = {
    [HELPER.CURRENT]: undefined,
    [HELPER.HOVER]: undefined
  };
  private positionMarkerObjects: Object3D[] = [];

  constructor(app: App) {
    super(app, {
      currentPosition: new Vector2(0, 0),
      positionMarkers: [],
      selectMovePosition: false,
      selectMarkerPosition: false,
      lockGrid: false
    } as State);

    //#region observables
    this.observables.startAddMarker$ = new ReplaySubject<void>(1);
    this.observables.abortAddMarker$ = new ReplaySubject<void>(1);
    this.observables.endAddMarker$ = new ReplaySubject<Vector2>(1);
    this.observables.startMove$ = new ReplaySubject<void>(1);
    this.observables.endMove$ = new ReplaySubject<Vector2>(1);
    this.observables.positionMarkers$ = new ReplaySubject<PositionMarker[]>(1);
    this.observables.currentPosition$ = new ReplaySubject<Vector2>(1);
    this.observables.lockGrid$ = new ReplaySubject<boolean>(1);
    //#endregion
  }

  setLockGrid(lock: boolean) {
    this.state.lockGrid = lock;
    this.observables.lockGrid$.next(lock);
  }

  private createPositionHelper(type: HELPER) {
    let color = 0xffff00;
    if (type === HELPER.HOVER) {
      color = 0x0000ff;
    }
    const size = 0.1;
    const geometry = new BoxGeometry(size, size, size);
    const material = new MeshLambertMaterial({ color });

    const mesh = new Mesh(geometry, material);
    mesh.position.y = size / 2;
    const obj = new Object3D();
    obj.add(mesh);
    this.app.renderer.scene.add(obj);
    this.helper[type] = obj;
  }

  private updatePositionHelper(type: HELPER, map: Map, position: Vector2) {
    const helper = this.helper[type];
    if (!helper) return;

    const y = map.modules.ground.getAvgHeightAt(position.x, position.y);
    helper.position.set(position.x, y, position.y);
  }

  private removePositionHelper(type: HELPER) {
    const helper = this.helper[type];
    if (helper) {
      disposeObject3D(helper);
      this.helper[type] = undefined;
    }
  }

  startMove() {
    const currentPosition = this.state.currentPosition;
    const unit = this.app.modules.selection.getSelectedUnit();
    if (!unit || !currentPosition) return;

    const y = this.app.modules.map
      .getMap()!
      .modules.ground.getAvgHeightAt(currentPosition.x, currentPosition.y);
    const position = new Vector3(currentPosition.x, y, currentPosition.y);
    this.observables.startMove$.next();
    unit?.modules.pathfinding.move(position);
  }

  startAddMarker() {
    this.state.selectMarkerPosition = true;
    this.observables.startAddMarker$.next();
    // const positionMarkers = this.getPositionMarkers();
    // this.addMarker(this.state.currentPosition.clone());
    // this.setPositionMarkers([...positionMarkers]);
  }

  abortAddMarker() {
    this.state.selectMarkerPosition = false;
    this.observables.abortAddMarker$.next();
  }

  override async setup() {
    await super.setup();

    const app = this.app;

    this.createPositionHelper(HELPER.CURRENT);
    this.createPositionHelper(HELPER.HOVER);

    const map$ = app.modules.map.observables.map$.pipe(
      filter(Boolean),
      share()
    );

    this.subscription.add(
      map$
        .pipe(
          switchMap(
            map =>
              map?.modules.ground.observables.hover$.pipe(
                rxjsMap(position => {
                  return {
                    position,
                    map
                  };
                })
              ) || EMPTY
          ),
          this.snapToGrid()
        )
        .subscribe(({ map, position }) => {
          this.updatePositionHelper(HELPER.HOVER, map, position);
        })
    );

    this.subscription.add(
      map$
        .pipe(
          switchMap(
            map =>
              map?.modules.ground.observables.select$.pipe(
                rxjsMap(position => {
                  return {
                    position,
                    map
                  };
                })
              ) || EMPTY
          ),
          this.snapToGrid()
        )
        .subscribe(({ map, position }) => {
          this.state.currentPosition = position;
          this.observables.currentPosition$.next(position);

          if (this.state.selectMarkerPosition) {
            this.state.selectMarkerPosition = false;
            this.addMarker(position);
            this.observables.endAddMarker$.next(position);
          } else {
            this.updatePositionHelper(HELPER.CURRENT, map, position);
          }
        })
    );

    // this.subscription.add(
    //   app.modules.debug.observables.endMove$.subscribe(position => {
    //     startMove.value = false;
    //     const y = app.modules.map
    //       .getMap()!
    //       .modules.ground.getHeightAt(currentPosition.value);
    //     unit.value?.modules.pathfinding.move(
    //       new Vector3(position.x, y, position.y)
    //     );
    //   })
    // );
    // if (this.positionHelper) {
    //   app.renderer.scene.remove(this.positionHelper);
    //   this.positionHelper.remove();
    // }

    // this.positionHelper = this.createPositionMarker();
    // app.renderer.scene.add(this.positionHelper);

    // this.subscription.add(
    //   map$
    //     .pipe(
    //       switchMap(
    //         map =>
    //           map?.modules.ground.observables.hover$.pipe(
    //             rxjsMap(position => {
    //               return {
    //                 position,
    //                 map
    //               };
    //             })
    //           ) || EMPTY
    //       ),
    //       rxjsMap(({ position }) => {
    //         // position an pathfinding grid anpassen
    //         return position.clone().floor();
    //       })
    //     )
    //     .subscribe(position => {
    //       console.log('hover position', position);
    //     })
    // );

    // this.subscription.add(
    //   map$
    //     .pipe(
    //       switchMap(
    //         map =>
    //           map?.modules.ground.observables.select$.pipe(
    //             rxjsMap(position => {
    //               return {
    //                 position,
    //                 map
    //               };
    //             })
    //           ) || EMPTY
    //       )
    //     )
    //     .subscribe(({ position }) => {
    //       if (this.state.selectMovePosition) {
    //         this.state.selectMovePosition = false;
    //         this.observables.endMove$.next(position);
    //       } else if (this.state.selectMarkerPosition) {
    //         this.state.selectMarkerPosition = false;
    //         this.observables.endAddMarker$.next(position);
    //         this.addMarker(position);
    //       }
    //     })
    // );
    // // // this.subscription.add(
    // // //   this.app.modules.map.observables.map$
    // // //     .pipe(switchMap(map => map ?? EMPTY))
    // // //     .subscribe()
    // // // );
    this.subscription.add(
      map$
        .pipe(
          switchMap(map =>
            map
              ? this.observables.positionMarkers$.pipe(
                  rxjsMap(markers => ({
                    map,
                    markers
                  }))
                )
              : EMPTY
          )
        )
        .subscribe(({ map, markers }) => {
          this.refreshMarkerObjects(map, markers);
        })
    );
  }

  snapToGrid() {
    return (
      source: Observable<{
        map: Map;
        position: Vector2;
      }>
    ) =>
      source.pipe(
        rxjsMap(({ map, position }) => {
          if (this.state.lockGrid) {
            const size = map.modules.pathfinding
              .getGroundNavigatorSmall()
              .getGridSize();
            position.x = Math.ceil(position.x / size) * size - size / 2;
            position.y = Math.ceil(position.y / size) * size - size / 2;
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

  addMarker(position: Vector2) {
    this.state.positionMarkers = [
      ...this.state.positionMarkers,
      {
        id: crypto.randomUUID(),
        position: position.clone()
      }
    ];
    this.observables.positionMarkers$.next(this.state.positionMarkers);
  }

  getPositionMarkers() {
    return this.state.positionMarkers;
  }

  createPositionMarker(options?: { color?: number }) {
    const size = 0.1;
    const geometry = new BoxGeometry(size, size, size);
    const material = new MeshLambertMaterial({
      color: options?.color ?? 0xcccccc
    });

    const mesh = new Mesh(geometry, material);
    mesh.position.y = size / 2;
    const obj = new Object3D();
    obj.add(mesh);
    return obj;
  }

  setPositionMarkers(positions: PositionMarker[]) {
    this.state.positionMarkers = [...positions];
    this.observables.positionMarkers$.next(this.state.positionMarkers);
  }

  private refreshMarkerObjects(map: Map, markers: PositionMarker[]) {
    this.positionMarkerObjects.forEach(obj => {
      this.app.renderer.scene.remove(obj);
      obj.remove();
    });
    this.positionMarkerObjects = [];

    markers.forEach(({ position }) => {
      const marker = this.createPositionMarker({
        color: 0xffff00
      });
      const y = map.modules.ground.getHeightAt(position.x, position.y);
      marker.position.set(position.x, y, position.y);
      this.app.renderer.scene.add(marker);
      this.positionMarkerObjects.push(marker);
    });
  }

  moveMarkerUp(marker: PositionMarker) {
    const markers = this.state.positionMarkers;
    const index = markers.findIndex(m => m.position.equals(marker.position));
    if (index <= 0) return;
    const temp = markers[index - 1]!;
    markers[index - 1] = markers[index]!;
    markers[index] = temp;
    this.setPositionMarkers(markers);
  }
  moveMarkerDown(marker: PositionMarker) {
    const markers = this.state.positionMarkers;
    const index = markers.findIndex(m => m.position.equals(marker.position));
    if (index === -1 || index >= markers.length - 1) return;
    const temp = markers[index + 1]!;
    markers[index + 1] = markers[index]!;
    markers[index] = temp;
    this.setPositionMarkers(markers);
  }

  removeMarker(marker: PositionMarker) {
    const markers = this.state.positionMarkers;
    const index = markers.findIndex(m => m.position.equals(marker.position));
    if (index === -1) return;
    markers.splice(index, 1);
    this.setPositionMarkers(markers);
  }
}
