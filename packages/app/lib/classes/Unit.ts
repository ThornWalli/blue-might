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
import DamageUnitModule from './unitModule/Damage';
import CollisionUnitModule, { COLLISION_TYPE } from './unitModule/Collision';
import FactionUnitModule from './unitModule/Faction';

export enum GROUND_ADJUSTMENT_MODE {
  MIN_HEIGHT = 'min-height',
  GROUND = 'ground',
  FLIGHT = 'flight',
  NONE = 'none'
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
  | typeof CollisionUnitModule
  | typeof DamageUnitModule
  | typeof FactionUnitModule
)[];

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UnitOptions {}

export interface ModuleOptions {
  [key: string]: UnitModuleOptions;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModuleStates extends Record<any, UnitModuleState> {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ModuleDebug extends Record<any, boolean> {}

export interface UnitConstructorOptions<
  Options extends UnitOptions = UnitOptions
> {
  preview?: boolean;
  id?: string;
  name: string;
  position?: Vector3;
  rotation?: Euler;
  options?: Options;
  moduleOptions?: Partial<ModuleOptions>;
  moduleStates?: Partial<ModuleStates>;
  moduleDebug?: Partial<ModuleDebug>;
}

export interface UnitModules {
  animation: AnimationUnitModule;
  selection: SelectionUnitModule;
  pathfinding: PathfindingUnitModule;
  collision: CollisionUnitModule;
  damage: DamageUnitModule;
  faction: FactionUnitModule;
}

export interface SetupContext {
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
  static KEY = 'unit';
  static NAME = 'Unit';

  preview: boolean;

  id: UnitIdentifier;
  name: string;

  observables: Observables = {} as Observables;

  modules: Modules = {} as Modules;
  moduleList: ModuleList;
  subscription = new Subscription();
  options: Options = {} as Options;
  root: Group;

  private moduleDebug: Partial<ModuleDebug> = {};

  getRoot() {
    return this.root;
  }
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
      preview,
      id,
      name,
      position,
      rotation,
      options,
      moduleOptions,
      moduleStates,
      moduleDebug
    }: UnitConstructorOptions = {
      name: 'Unit'
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

    this.preview = preview ?? false;

    this.moduleDebug = { ...this.moduleDebug, ...moduleDebug };

    this.id = id || crypto.randomUUID();
    this.name = name;

    this._position = position ?? new Vector3(0, 0, 0);
    this._rotation = rotation ?? new Euler(0, 0, 0);

    this.lastPosition = this._position.clone();

    this.options = {
      ...this.options,
      ...options
    } as Options;

    //#region modules

    moduleList.unshift(
      CollisionUnitModule,
      DamageUnitModule,
      AnimationUnitModule,
      SelectionUnitModule,
      PathfindingUnitModule,
      FactionUnitModule
    );

    this.moduleList = moduleList as ModuleList;

    const preparedModules = (moduleList as ModuleList)
      .filter(moduleClass => {
        return !this.preview || (this.preview && moduleClass.PREVIEW);
      })
      .map(ModuleClass => {
        const types = ModuleClass.TYPES;

        const { options, state } = types.reduce<{
          options: any;
          state: any;
        }>(
          (acc, type) => {
            acc.options = {
              ...acc.options,
              ...(moduleOptions?.[type] ?? {})
            };
            acc.state = {
              ...acc.state,
              ...(moduleStates?.[type] ?? {})
            };
            return acc;
          },
          { options: {}, state: {} }
        );

        const moduleInstance = new ModuleClass(
          this,
          options,
          state,
          this.moduleDebug[ModuleClass.TYPE] ?? false
        );
        return ModuleClass.TYPES.map(type => [type, moduleInstance]);
      })
      .flat();
    this.modules = Object.fromEntries(preparedModules);

    //#endregion

    this.root = this.setupRoot(name);
  }

  setModuleDebug(debug: { [key: string]: boolean }) {
    this.moduleDebug = { ...this.moduleDebug, ...debug };
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

    const modules: UnitModule[] = Object.values(this.modules);

    for (const module of modules) {
      await module.setup();
    }

    let mesh = await this.createMesh(context);
    for (const module of modules) {
      mesh = await module.setupMesh({ mesh, root: this.root, ...context });
    }

    // Filter modules that have update method
    const updateModules = modules.filter(
      module => typeof module.update === 'function'
    );
    this._updateModules = updateModules;

    this.addToRoot(mesh);

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

  async afterSetup(_context: SetupContext) {
    for (const module of Object.values(this.modules)) {
      await module.afterSetup();
    }
    this.setPosition(this._position!);
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

  updateGroundAlignment(position?: Vector3, ignoredUnits: Unit[] = []) {
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
          const groundHeight = groundModule.getTerrainHeightAt(
            position.x,
            position.z,
            ignoredUnits
          );
          this._position.y = groundHeight;

          // Gelände-Normale berechnen (für Neigung)
          this.calculateGroundNormal();
        }
        break;

      case GROUND_ADJUSTMENT_MODE.FLIGHT:
        // const groundHeight = groundModule.getSurfaceHeightAt(
        //   position.x,
        //   position.z,
        //   ignoredUnits
        // );
        // this._position.y = groundHeight;

        // // Gelände-Normale berechnen (für Neigung)
        // this.calculateGroundNormal();
        // Keine Anpassung
        this._position.y = Math.max(
          this._position.y,
          Math.max(this.getMinGroundHeight(), 0)
        );
        break;

      case GROUND_ADJUSTMENT_MODE.NONE: // NEU: Y-Position unverändert lassen
        // Keine Anpassung
        break;

      default:
        break;
    }

    // Rotation berechnen
    this.updateMeshTransform();

    return this._position;
  }

  checkCollision() {
    return this._map?.checkCollision(this) ?? COLLISION_TYPE.NONE;
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

  lastPosition: Vector3 = new Vector3();

  setPosition(position: Vector3) {
    let desired = position.clone();
    const from = this.lastPosition.clone();

    // Schritt 1: Führe Bodenausrichtung für die gewünschte Position durch (wenn nötig)
    if (
      this._map &&
      this.groundAdjustmentMode !== GROUND_ADJUSTMENT_MODE.NONE
    ) {
      desired = this.updateGroundAlignment(desired, [this]) ?? desired;
    }

    // Schritt 2: Prüfe, ob die neue Position eine Kollision verursacht
    this._position.copy(desired);
    const collisionType = this.checkCollision();

    // Fall A: Keine blockierende Kollision
    if (collisionType < COLLISION_TYPE.BLOCKED) {
      this._position.copy(desired);
      this.lastPosition.copy(desired);
      this.observables.position$.next(desired);
      this.updateMeshTransform();
      return;
    }

    // Fall B: Blockierende Kollision!
    const delta = desired.clone().sub(from);
    const isHorizontalMove = Math.abs(delta.x) + Math.abs(delta.z) > 0.01;

    // Fall B.1: Es ist eine Landung/Platzierung. Kollision ist erwartet (z.B. auf Gebäude). Akzeptieren.
    if (!isHorizontalMove) {
      this._position.copy(desired);
      this.lastPosition.copy(desired);
      this.observables.position$.next(desired);
      this.updateMeshTransform();
      return;
    }

    this._position.copy(this.lastPosition);
    this.root.position.copy(this.lastPosition);
    this.observables.position$.next(this.lastPosition.clone());
    this.updateMeshTransform();

    // Optional: Hier könnte man die "Sweep & Slide"-Logik (Binärsuche etc.)
    // einfügen, um das Fahrzeug an der Wand entlang gleiten zu lassen, anstatt es nur zu stoppen.
    // Fürs Erste stellen wir aber das simple "Stoppen" wieder her.
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
  ): T {
    return Object.values(this.modules).find(m => m instanceof ModuleClass) as T;
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

    if (this.checkCollision() >= COLLISION_TYPE.BLOCKED) {
      this._rotation.y = lastYaw; // Wenn ja, mache es rückgängig.
    }

    // Aktualisiere nur die visuellen Aspekte. Ändere NICHT die Position.
    this.calculateGroundNormal();
    this.updateMeshTransform();

    this.observables.rotation$.next(this._rotation.clone());
  }

  // --- PITCH --------------------------------------------------------
  getPitch() {
    return this.pitchWrapper.rotation.x;
  }

  setPitch(p: number) {
    this._playerPitch = p;
    this.updateMeshTransform(); // Nur Mesh aktualisieren, nicht die Position
  }

  // --- ROLL ---------------------------------------------------------
  getRoll() {
    return this.rollWrapper.rotation.z;
  }

  setRoll(r: number) {
    this._playerRoll = r;
    this.updateMeshTransform();
  }
}
