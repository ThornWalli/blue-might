/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReplaySubject, Subscription } from 'rxjs';
import { Euler, Quaternion, Vector3, type Object3D } from 'three';
import { Group } from 'three';

import type UnitModule from './UnitModule';
import type { UnitModuleOptions, UnitModuleState } from './UnitModule';

import { OBJECT_USER_DATA, setMainObjectRecursive } from '../utils/object';

import type { UnitIdentifier } from '../types/unit';
import type Map from './Map';
import type { AnimationLoopValue } from './Renderer';
import { AnimationUnitModule } from './unitModule/Animation';
import SelectionUnitModule from './unitModule/Selection';
import PathfindingUnitModule from './unitModule/Pathfinding';

export enum GROUND_ADJUSTMENT_MODE {
  MIN_HEIGHT = 'min-height',
  GROUND = 'ground',
  FLIGHT = 'flight'
}

type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;

declare module '../../lib/utils/object' {
  interface ObjectUserData {
    UNIT: string;
  }
}
OBJECT_USER_DATA.UNIT = 'unit';

export type UnitModuleList = (
  | typeof AnimationUnitModule
  | typeof SelectionUnitModule
  | typeof PathfindingUnitModule
)[];

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UnitOptions {}

export interface UnitConstructorOptions<
  Options extends UnitOptions = UnitOptions
> {
  id?: string;
  name: string;
  options?: Options;
  moduleOptions?: { [key: string]: UnitModuleOptions };
  moduleStates?: { [key: string]: UnitModuleState };
  position?: Vector3;
  rotation?: Euler;
}

export interface UnitModules {
  animation: AnimationUnitModule;
  selection: SelectionUnitModule;
  pathfinding: PathfindingUnitModule;
}

export interface SetupContext {
  unit: Unit;
  map?: Map;
}

export interface UnitObservables {
  position$: ReplaySubject<Vector3>;
  rotation$: ReplaySubject<Euler>;
  ready$: ReplaySubject<void>;
  materialReady$: ReplaySubject<void>;
  visible$: ReplaySubject<boolean>;
}

export default class Unit<
  Options extends UnitOptions = UnitOptions,
  Modules extends UnitModules = UnitModules,
  ModuleList extends UnitModuleList = UnitModuleList,
  Observables extends UnitObservables = UnitObservables
> {
  getForwardXZFromYaw(target = new Vector3()): Vector3 {
    const qYaw = this.getYawQuaternion();
    target.set(0, 0, 1).applyQuaternion(qYaw);
    target.y = 0;
    return target.normalize();
  }

  getYawQuaternion(): Quaternion {
    return new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      this._rotation.y
    );
  }

  debug = false;

  static KEY = 'unit';
  static NAME = 'Unit';

  id: UnitIdentifier;
  name: string;

  observables: Observables = {} as Observables;

  modules: Modules = {} as Modules;
  moduleList: ModuleList;

  subscription = new Subscription();
  options: Options = {} as Options;
  root: Group;
  private _updateModules: UnitModule[] = [];
  private _map: Map | null = null;
  private groundAdjustmentMode: GROUND_ADJUSTMENT_MODE =
    GROUND_ADJUSTMENT_MODE.GROUND;
  private _position: Vector3 = new Vector3(0, 0, 0);
  private _rotation: Euler = new Euler(0, 0, 0);
  /**
   * Gelände-Neigung (Pitch/Roll)
   * x = pitch
   * y = yaw
   * z = roll
   */
  private _tilt: Vector3 = new Vector3(0, 0, 0);
  constructor(
    {
      id,
      debug,
      name,
      position,
      rotation,
      options,
      moduleOptions,
      moduleStates
    }: UnitConstructorOptions & { debug?: boolean } = {
      name: 'Unit',
      position: new Vector3(0, 0, 0),
      options: {} as Options,
      moduleOptions: {},
      moduleStates: {}
    },
    moduleList: unknown[] = []
  ) {
    //#region observables
    this.observables.ready$ = new ReplaySubject<void>(1);
    this.observables.materialReady$ = new ReplaySubject<void>(1);
    this.observables.position$ = new ReplaySubject<Vector3>(1);
    this.observables.rotation$ = new ReplaySubject<Euler>(1);
    this.observables.visible$ = new ReplaySubject<boolean>(1);
    //#endregion

    this.id = id || crypto.randomUUID();
    this.name = name;

    this.debug = debug ?? this.debug;

    this._position = position || new Vector3(0, 0, 0);
    this._rotation = rotation || new Euler(0, 0, 0);

    this.options = {
      ...this.options,
      ...options
    } as Options;

    //#region modules

    moduleList.unshift(
      AnimationUnitModule,
      SelectionUnitModule,
      PathfindingUnitModule
    );

    this.moduleList = moduleList as ModuleList;

    const preparedModules = (moduleList as ModuleList).map(ModuleClass => {
      const options = moduleOptions?.[ModuleClass.TYPE] ?? {};
      const state = moduleStates?.[ModuleClass.TYPE] ?? {};

      const moduleInstance = new ModuleClass(
        this,
        options as any,
        state as any,
        this.debug
      );
      return [ModuleClass.TYPE, moduleInstance];
    });
    this.modules = Object.fromEntries(preparedModules);

    //#endregion

    this.root = this.setupRoot(name);
  }

  get key(): string {
    return (this.constructor as typeof Unit).KEY;
  }

  equal(unit: Unit) {
    return this.id === unit.id;
  }

  createMesh(_context: SetupContext): Promise<Object3D> {
    return Promise.resolve(new Group() as Object3D);
  }

  async setup(context: SetupContext) {
    this._map = context.map ?? null;

    let mesh = await this.createMesh(context);

    const modules: UnitModule[] = Object.values(this.modules);

    // Setup modules

    for (const module of modules) {
      await module.setup();
      mesh = await module.setupMesh({ mesh, root: this.root, ...context });
    }

    this.setPosition(this._position!);
    this.addToRoot(mesh);

    // Filter modules that have update method
    const updateModules = modules.filter(
      module => typeof module.update === 'function'
    );
    this._updateModules = updateModules;

    for (const module of modules) {
      await module.afterSetup();
    }

    this.updateMeshTransform();

    this.observables.ready$.next();
  }

  pitchWrapper!: Group;
  rollWrapper!: Group;
  tiltWrapper!: Group;
  setupRoot(name: string) {
    const root = new Group();

    this.pitchWrapper = new Group(); // player pitch
    this.pitchWrapper.name = `${name}_pitchWrapper`;
    this.rollWrapper = new Group(); // player roll
    this.rollWrapper.name = `${name}_rollWrapper`;
    this.tiltWrapper = new Group(); // NEW: terrain tilt
    this.tiltWrapper.name = `${name}_tiltWrapper`;

    this.tiltWrapper.add(this.pitchWrapper);
    this.pitchWrapper.add(this.rollWrapper);

    root.add(this.tiltWrapper);

    root.name = name;
    root.userData[OBJECT_USER_DATA.MAIN_OBJECT] = root.id;
    root.userData[OBJECT_USER_DATA.UNIT] = this;
    setMainObjectRecursive(root, root);
    return root;
  }

  afterSetup(_context: SetupContext) {
    // Override in subclasses
  }

  addToRoot(object: Object3D) {
    this.rollWrapper.add(object);
    setMainObjectRecursive(object, this.root);
  }

  destroy() {
    this.subscription.unsubscribe();
    Object.values(this.modules).forEach(module => module.destroy());
    this.root.removeFromParent();
    this.root.remove();
  }

  getMap() {
    return this._map;
  }

  update(v: AnimationLoopValue) {
    this._updateModules.forEach(module => module.update(v));
  }

  equals(unit: Unit): boolean {
    return this.id === unit.id;
  }

  setMaterialReady() {
    this.observables.materialReady$.next();
    this.observables.materialReady$.complete();
  }

  getPosition() {
    return this._position;
  }

  getGroundAdjustmentMode() {
    return this.groundAdjustmentMode;
  }

  setGroundAdjustmentMode(groundAdjustmentMode: GROUND_ADJUSTMENT_MODE) {
    this.groundAdjustmentMode = groundAdjustmentMode;
  }

  updateGroundAlignment(position?: Vector3) {
    const groundModule = this._map?.modules.ground;
    if (!groundModule) {
      this.updateMeshTransform();
      return;
    }
    if (position) {
      this._position.copy(position);
    }
    position = this._position;

    switch (this.groundAdjustmentMode) {
      case GROUND_ADJUSTMENT_MODE.MIN_HEIGHT:
        this._position.y = this.getMinGroundHeight();
        break;

      case GROUND_ADJUSTMENT_MODE.GROUND:
        {
          const groundHeight = groundModule.getHeightAt(position.x, position.z);
          this._position.y = groundHeight;

          // Gelände-Normale berechnen (für Neigung)
          this.calculateGroundNormal();
        }
        break;

      case GROUND_ADJUSTMENT_MODE.FLIGHT:
        // Keine Anpassung
        this._position.y = Math.max(
          this._position.y,
          Math.max(this.getMinGroundHeight(), 0)
        );
        break;

      default:
        break;
    }

    // Rotation berechnen
    this.updateMeshTransform();
  }

  checkCollision() {
    return this._map && this._map.checkCollision(this);
  }

  getRotation() {
    return this._rotation;
  }

  setRotation(rotation: Euler) {
    this.setYaw(rotation.y); // Nur Heading
  }

  private calculateGroundNormal() {
    const sampleDistance = 1;
    const rotation = this._rotation.y;
    const groundModule = this._map?.modules.ground;
    if (!groundModule) return;
    // 4 Punkte um das Fahrzeug herum samplen
    const front = groundModule.getHeightAt(
      this._position.x + Math.sin(rotation) * sampleDistance,
      this._position.z + Math.cos(rotation) * sampleDistance
    );

    const back = groundModule.getHeightAt(
      this._position.x - Math.sin(rotation) * sampleDistance,
      this._position.z - Math.cos(rotation) * sampleDistance
    );

    const left = groundModule.getHeightAt(
      this._position.x + Math.cos(rotation) * sampleDistance,
      this._position.z - Math.sin(rotation) * sampleDistance
    );

    const right = groundModule.getHeightAt(
      this._position.x - Math.cos(rotation) * sampleDistance,
      this._position.z + Math.sin(rotation) * sampleDistance
    );

    // Pitch (Neigung vorne/hinten)
    const pitch = Math.atan2(back - front, sampleDistance * 2);

    // Roll (Neigung links/rechts)
    const roll = Math.atan2(left - right, sampleDistance * 2);

    this._tilt.set(pitch, 0, roll);
  }

  getMinGroundHeight(): number {
    const sampleDistance = 1;
    const rotation = this._rotation.y;
    const groundModule = this._map?.modules.ground;
    if (!groundModule) return this._position.y;

    const front = groundModule.getHeightAt(
      this._position.x + Math.sin(rotation) * sampleDistance,
      this._position.z + Math.cos(rotation) * sampleDistance
    );
    const back = groundModule.getHeightAt(
      this._position.x - Math.sin(rotation) * sampleDistance,
      this._position.z - Math.cos(rotation) * sampleDistance
    );
    const left = groundModule.getHeightAt(
      this._position.x + Math.cos(rotation) * sampleDistance,
      this._position.z - Math.sin(rotation) * sampleDistance
    );
    const right = groundModule.getHeightAt(
      this._position.x - Math.cos(rotation) * sampleDistance,
      this._position.z + Math.sin(rotation) * sampleDistance
    );

    return Math.min(front, back, left, right);
  }

  private _playerPitch = 0;
  private _playerRoll = 0;

  private updateMeshTransform() {
    // 1. Position setzen
    this.root.position.copy(this._position);

    // 2. Root = nur Yaw
    this.root.rotation.set(0, this._rotation.y, 0);

    // 3. Terrain-Tilt als Quaternion
    const terrainQuat = new Quaternion().setFromEuler(
      new Euler(this._tilt.x, 0, this._tilt.z)
    );
    this.tiltWrapper.setRotationFromQuaternion(terrainQuat);

    // 4. Spieler Pitch/Roll
    this.pitchWrapper.rotation.x = this._playerPitch; // wir speichern sie gleich!
    this.rollWrapper.rotation.z = this._playerRoll;
  }

  lastPosition: Vector3 = new Vector3();
  setPosition(position: Vector3) {
    const desired = position.clone();

    // Ground-Ausrichtung vorbereiten
    if (this._map) {
      this.updateGroundAlignment(desired);
    } else {
      this._position.copy(desired);
      this.root.position.copy(desired);
    }

    // Direkt frei?
    if (!this.checkCollision()) {
      this.lastPosition.copy(desired);
      this.observables.position$.next(desired);
      return;
    }

    // --- Sweep entlang der Bewegung (from -> desired) ---
    const from = this.lastPosition.clone();
    const delta = desired.clone().sub(from);

    // Keine sinnvolle Bewegung?
    if (delta.lengthSq() === 0) {
      // bleibe auf lastPosition
      this._position.copy(this.lastPosition);
      this.root.position.copy(this.lastPosition);
      return;
    }

    // Binärsuche: größtes t in [0,1] ohne Kollision
    const maxIter = 12;
    let lo = 0; // kollisionsfrei
    let hi = 1; // kollidiert
    // Sicherstellen, dass lo wirklich frei ist:
    this._position.copy(from);
    this.updateGroundAlignment(from);
    if (this.checkCollision()) {
      // Startpunkt steckt schon drin -> kleiner Rückzug entgegen delta
      const backoffEps = 0.1;
      const safe = from
        .clone()
        .add(delta.clone().normalize().multiplyScalar(-backoffEps));
      this._position.copy(safe);
      this.updateGroundAlignment(safe);
      if (!this.checkCollision()) {
        this.root.position.copy(this._position);
        this.lastPosition.copy(this._position);
        this.observables.position$.next(this._position.clone());
        return;
      }
      // Notfall: bleibe auf lastPosition
      this._position.copy(this.lastPosition);
      this.root.position.copy(this.lastPosition);
      return;
    }

    // hi ist kollidiert, lo ist frei -> suche Grenze
    for (let i = 0; i < maxIter; i++) {
      const mid = (lo + hi) * 0.5;
      const test = from.clone().addScaledVector(delta, mid);

      this._position.copy(test);
      this.updateGroundAlignment(test);

      if (this.checkCollision()) {
        hi = mid;
      } else {
        lo = mid;
      }
    }

    // Nimm die letzte freie Position + kleiner Sicherheitsabstand weg vom Hindernis
    const epsilon = 0.03;
    const safePos = from
      .clone()
      .addScaledVector(delta, lo)
      .add(delta.clone().normalize().multiplyScalar(-epsilon));

    this._position.copy(safePos);
    this.updateGroundAlignment(safePos);

    if (!this.checkCollision()) {
      this.root.position.copy(this._position);
      this.lastPosition.copy(this._position);
      this.observables.position$.next(this._position.clone());
      return;
    }

    // Fallback: achsweises Sliding
    const axisTry = (ax: 'x' | 'z') => {
      const axisDelta = new Vector3(
        ax === 'x' ? delta.x : 0,
        0,
        ax === 'z' ? delta.z : 0
      );
      let alo = 0,
        ahi = 1;
      for (let i = 0; i < maxIter; i++) {
        const mid = (alo + ahi) * 0.5;
        const test = from.clone().addScaledVector(axisDelta, mid);
        this._position.copy(test);
        this.updateGroundAlignment(test);
        if (this.checkCollision()) ahi = mid;
        else alo = mid;
      }
      const slidePos = from
        .clone()
        .addScaledVector(axisDelta, alo)
        .add(axisDelta.clone().normalize().multiplyScalar(-epsilon));
      this._position.copy(slidePos);
      this.updateGroundAlignment(slidePos);
      return !this.checkCollision();
    };

    if (axisTry('x') || axisTry('z')) {
      this.root.position.copy(this._position);
      this.lastPosition.copy(this._position);
      this.observables.position$.next(this._position.clone());
      return;
    }

    // Letzter Fallback: bleibe auf lastPosition, ohne sie zu überschreiben
    this._position.copy(this.lastPosition);
    this.root.position.copy(this.lastPosition);
  }

  //#region visibility
  private visible: boolean = true;
  setVisible(visible = this.visible && this.chunkVisible) {
    if (this.visible === visible) return;
    this.root.visible = visible;
    this.observables.visible$.next(visible);
  }
  //#endregion

  //#region chunk management
  currentChunkKey: string | null = null;
  private chunkVisible = true;
  setChunkVisible(visible: boolean) {
    this.chunkVisible = visible;
    this.setVisible();
  }
  //#endregion

  //#region modules
  getModule<M extends UnitModule>(moduleType: string) {
    return this.modules[moduleType as keyof Modules] as M;
  }

  getModuleByType<T extends UnitModule>(
    ModuleClass: AbstractConstructor<T>
  ): T | undefined {
    return Object.values(this.modules).find(m => m instanceof ModuleClass) as
      | T
      | undefined;
  }

  hasModuleType(ModuleClass: typeof UnitModule | any) {
    return Object.values(this.modules).some(m => m instanceof ModuleClass);
  }
  //#endregion

  // --- YAW (Root) --------------------------------------------------
  getYaw() {
    return this._rotation.y;
  }

  setYaw(yaw: number) {
    const lastYaw = this._rotation.y;
    this._rotation.y = yaw;
    this.updateGroundAlignment();
    if (this.checkCollision()) {
      this._rotation.y = lastYaw;
    }
    this.observables.rotation$.next(this._rotation.clone());
  }

  // --- PITCH --------------------------------------------------------
  getPitch() {
    return this.pitchWrapper.rotation.x;
  }

  setPitch(p: number) {
    this._playerPitch = p;
    this.updateGroundAlignment();
  }

  // --- ROLL ---------------------------------------------------------
  getRoll() {
    return this.rollWrapper.rotation.z;
  }

  setRoll(r: number) {
    this._playerRoll = r;
    this.updateGroundAlignment();
  }
}
