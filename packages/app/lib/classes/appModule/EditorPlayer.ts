import { ReplaySubject, switchMap } from 'rxjs';
import { ConeGeometry, Euler, Mesh, MeshBasicMaterial, Object3D } from 'three';

import AppModule, {
  type AppModuleObservables,
  type AppModuleState
} from '../AppModule';
import type { App } from '../../types';
import type { PlayerOptions } from '../../types/map';
import { disposeObject3D } from '../../utils/object';

interface Observables extends AppModuleObservables {
  playerOptions$: ReplaySubject<PlayerOptions>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends AppModuleState {}
export default class EditorPlayerAppModule extends AppModule<
  State,
  Observables
> {
  static override TYPE = 'editorPlayer';
  override state: State = {};

  private helperObj: Object3D | null = null;

  constructor(app: App) {
    super(app, {} as State);
    //#region observables
    this.observables.playerOptions$ = new ReplaySubject<PlayerOptions>(1);
    //#endregion
  }

  override destroy(): void {
    if (this.helperObj) {
      disposeObject3D(this.helperObj);
      this.helperObj = null;
    }
  }

  override async setup() {
    await super.setup();

    this.subscription.add(
      this.app.modules.map.observables.map$
        .pipe(switchMap(map => map.observables.playerOptions$))
        .subscribe(options => {
          this.observables.playerOptions$.next(options);
          this.updateHelper();
        })
    );
  }

  updateHelper() {
    if (this.helperObj) {
      disposeObject3D(this.helperObj);
      this.helperObj = null;
    }
    const helper = new Object3D();

    const geomentry = new ConeGeometry(0.125, 0.5, 16);
    geomentry.rotateX(Math.PI / 2);
    geomentry.translate(0, 1, 0);

    const box = new Mesh(geomentry, new MeshBasicMaterial({ color: 0x00ff00 }));
    helper.add(box);
    this.helperObj = helper;
    this.helperObj.position.copy(this.map.getPlayerOptions().position);
    this.helperObj.rotation.copy(
      this.map.getPlayerOptions().rotation ?? new Euler()
    );
    this.app.getScene().add(this.helperObj);
  }

  getPlayerOptions() {
    return this.map.getPlayerOptions();
  }

  setPlayerOptions(options: PlayerOptions) {
    this.map.setPlayerOptions(options);
  }

  private get map() {
    const map = this.app.modules.map.getMap();
    if (!map) throw new Error('Map not found');
    return map;
  }
}
