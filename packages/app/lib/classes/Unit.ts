/* eslint-disable complexity */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReplaySubject, Subscription } from 'rxjs';
import type { Object3D, Scene, Vector3Tuple, EulerTuple } from 'three';
import { Euler, Quaternion, Vector3, Group } from 'three';

import { OBJECT_USER_DATA, setMainObjectRecursive } from '../utils/object';
import {
  GROUND_ADJUSTMENT_MODE,
  UNIT_TYPE,
  type SetupContext,
  type UnitIdentifier
} from '../types/unit';
import { prepareForRaycast } from '../utils/raycast';
import { TILE_TYPE } from '../utils/pathfinding';

import type UnitModule from './UnitModule';
import type { UnitModuleOptions, UnitModuleState } from './UnitModule';
import type Map from './Map';
import type { AnimationLoopValue } from './Renderer';
import { AnimationUnitModule } from './unitModule/Animation';
import SelectionUnitModule from './unitModule/Selection';
import PathfindingUnitModule from './unitModule/Pathfinding';
import DamageUnitModule from './unitModule/Damage';
import CollisionUnitModule, { COLLISION_TYPE } from './unitModule/Collision';
import FactionUnitModule from './unitModule/Faction';
import type MovableUnitModule from './unitModule/Movable';
import type PatrolUnitModule from './unitModule/Patrol';

type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;

export interface RawUnitDescription<
  Options = UnitOptions,
  V3 = Vector3Tuple,
  E = EulerTuple
> {
  key: string;
  debug?: boolean;
  id?: string;
  name?: string;
  position?: V3;
  rotation?: E;
  options?: Partial<Options>;
  moduleOptions?: Partial<ModuleOptions>;
  moduleStates?: Partial<ModuleStates>;
  moduleDebug?: Partial<ModuleDebug>;
  visible?: boolean;
}
export type UnitDescription<Options = UnitOptions> = RawUnitDescription<
  Options,
  Vector3,
  Euler
>;

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

export type UnitConstructorOptions<Options extends UnitOptions = UnitOptions> =
  Partial<
    Exclude<UnitDescription<Options>, 'options' | 'position' | 'rotation'> & {
      preview?: boolean;
      id?: UnitIdentifier;
      position: Vector3;
      rotation: Euler;
      options: Options;
      moduleStates: Partial<ModuleStates>;
    }
  >;

export interface UnitModules {
  animation: AnimationUnitModule;
  selection: SelectionUnitModule;
  pathfinding: PathfindingUnitModule;
  collision: CollisionUnitModule;
  damage: DamageUnitModule;
  faction: FactionUnitModule;
}

export interface UnitObservables {
  destroyed$: ReplaySubject<void>;
  position$: ReplaySubject<Vector3>;
  rotation$: ReplaySubject<Euler>;
  ready$: ReplaySubject<void>;
  materialReady$: ReplaySubject<void>;
  visible$: ReplaySubject<boolean>;
  active$: ReplaySubject<boolean>;
  map$: ReplaySubject<Map | null>;
}

export default class Unit<
  Modules extends UnitModules = UnitModules,
  ModuleList extends UnitModuleList = UnitModuleList,
  Options extends UnitOptions = UnitOptions,
  Observables extends UnitObservables = UnitObservables
> implements UnitDescription<Options> {
  getTileType() {
    return TILE_TYPE.UNIT;
  }
  static KEY = 'unit';
  static NAME = 'Unit';
  static TYPE: UNIT_TYPE = UNIT_TYPE.DEFAULT;

  static get TYPES() {
    const types = [];
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let current = this;

    while (current && current !== Function.prototype) {
      if (
        Object.prototype.hasOwnProperty.call(current, 'TYPE') &&
        current.TYPE
      ) {
        types.push(current.TYPE);
      }
      current = Object.getPrototypeOf(current);
    }

    return types;
  }

  private active: boolean = false;

  debug: boolean;
  preview: boolean;
  id: UnitIdentifier;
  name: string;
  observables: Observables = {} as Observables;
  modules: Modules = {} as Modules;
  moduleList: ModuleList;
  subscription = new Subscription();
  options: Options = {} as Options;
  root: Group;
  visible: boolean = true;
  ready: boolean = false;
  moduleDebug: Partial<ModuleDebug> = {};

  getRoot() {
    return this.root;
  }
  updateModules: UnitModule[] = [];
  map: Map | null = null;
  groundAdjustmentMode: GROUND_ADJUSTMENT_MODE = GROUND_ADJUSTMENT_MODE.GROUND;
  position: Vector3 = new Vector3(0, 0, 0);
  rotation: Euler = new Euler(0, 0, 0);
  playerPitch = 0;
  playerRoll = 0;

  moduleOptions: Partial<ModuleOptions>;
  moduleStates: Partial<ModuleStates>;

  /**
   * Gelände-Neigung (Pitch/Roll)
   * x = pitch
   * y = yaw
   * z = roll
   */
  private _tilt: Vector3 = new Vector3(0, 0, 0);

  constructor(
    {
      debug,
      preview,
      id,
      name,
      position,
      rotation,
      options,
      moduleOptions,
      moduleStates,
      moduleDebug,
      visible
    }: UnitConstructorOptions<Options> = {},
    moduleList: unknown[] = []
  ) {
    this.position = position ?? new Vector3(0, 0, 0);
    this.rotation = rotation ?? new Euler(0, 0, 0);
    this.visible = visible ?? true;

    //#region observables
    this.observables.destroyed$ = new ReplaySubject<void>(1);
    this.observables.ready$ = new ReplaySubject<void>(1);
    this.observables.materialReady$ = new ReplaySubject<void>(1);
    this.observables.position$ = new ReplaySubject<Vector3>(1);
    this.observables.position$.next(this.position.clone());
    this.observables.rotation$ = new ReplaySubject<Euler>(1);
    this.observables.rotation$.next(this.rotation.clone());
    this.observables.visible$ = new ReplaySubject<boolean>(1);
    this.observables.visible$.next(this.visible);
    this.observables.active$ = new ReplaySubject<boolean>(1);
    this.observables.active$.next(this.active);
    this.observables.map$ = new ReplaySubject<Map | null>(1);
    //#endregion

    this.debug = debug ?? false;
    this.preview = preview ?? false;

    this.moduleDebug = { ...this.moduleDebug, ...moduleDebug };

    this.id = id || crypto.randomUUID();
    this.name = name ?? 'Unit';

    this.lastPosition = this.position.clone();

    this.options = {
      ...this.options,
      ...options
    } as Options;

    //#region modules

    moduleList.unshift(
      FactionUnitModule,
      CollisionUnitModule,
      DamageUnitModule,
      AnimationUnitModule,
      SelectionUnitModule,
      PathfindingUnitModule
    );

    this.moduleOptions = moduleOptions || {};
    this.moduleStates = moduleStates || {};
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

    this.root = this.setupRoot(this.name);
  }

  setModuleDebug(debug: Partial<ModuleDebug>) {
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
    this.map = context.map ?? null;
    this.observables.map$.next(this.map);

    const modules: UnitModule[] = Array.from(
      new Set(Object.values(this.modules))
    );

    for (const module of modules) {
      await module.setup();
    }

    let mesh = await this.createMesh(context);
    for (const module of modules) {
      mesh = await module.setupMesh({ mesh, root: this.root, ...context });
    }

    prepareForRaycast(mesh);

    // Filter modules that have update method
    const updateModules = modules.filter(
      module => typeof module.update === 'function'
    );
    this.updateModules = updateModules;

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
    this.setPosition(
      new Vector3(
        this.position!.x,
        this.map?.modules.surface.getSurfaceHeightAt(
          this.position.x,
          this.position.z
        ),
        this.position!.z
      )
    );
    for (const module of new Set(Object.values(this.modules))) {
      await module.afterSetup();
    }
    // Override in subclasses
  }

  async addToScene(scene: Scene) {
    scene.add(this.root);

    for (const module of Object.values(this.modules)) {
      await module.addToScene();
    }
  }

  addToRoot(object: Object3D) {
    this.rollWrapper.add(object);
    setMainObjectRecursive(object, this.root);
  }
  private destroyed = false;
  destroy() {
    this.destroyed = true;
    this.observables.destroyed$.next();

    this.subscription.unsubscribe();
    Object.values(this.modules).forEach(module => module.destroy());
    this.root.removeFromParent();
    this.root.remove();
  }

  isDestroyed() {
    return this.destroyed;
  }

  getActive() {
    return this.active;
  }
  setActive(active: boolean) {
    if (this.active === active) return;
    this.active = active;
    this.observables.active$.next(active);
  }

  getMap() {
    return this.map;
  }

  update(v: AnimationLoopValue) {
    if (this.preview) return;
    this.updateModules.forEach(module => module.update(v));
  }

  renderUpdate(v: AnimationLoopValue) {
    if (this.preview) return;
    this.updateModules.forEach(module => module.renderUpdate(v));
  }

  equals(unit: Unit): boolean {
    return this.id === unit.id;
  }

  setMaterialReady() {
    this.observables.materialReady$.next();
    this.observables.materialReady$.complete();
  }

  getPosition() {
    return this.position;
  }

  getGroundAdjustmentMode() {
    return this.groundAdjustmentMode;
  }

  setGroundAdjustmentMode(groundAdjustmentMode: GROUND_ADJUSTMENT_MODE) {
    this.groundAdjustmentMode = groundAdjustmentMode;
  }

  getRotation() {
    return this.rotation;
  }

  setRotation(rotation: Euler) {
    this.setYaw(rotation.y); // Nur Heading

    this.setPitch(rotation.x); // Pitch
    this.setRoll(rotation.z); // Roll
  }

  private updateMeshTransform() {
    // 1. Position setzen
    this.root.position.copy(this.position);

    // 2. Root = nur Yaw
    this.root.rotation.set(0, this.rotation.y, 0);

    // 3. Terrain-Tilt als Quaternion
    const terrainQuat = new Quaternion().setFromEuler(
      new Euler(this._tilt.x, 0, this._tilt.z)
    );
    this.tiltWrapper.setRotationFromQuaternion(terrainQuat);

    // 4. Spieler Pitch/Roll
    this.pitchWrapper.rotation.x = this.playerPitch; // wir speichern sie gleich!
    this.rollWrapper.rotation.z = this.playerRoll;
  }

  getForwardXZFromYaw(target = new Vector3()): Vector3 {
    const qYaw = this.getYawQuaternion();
    target.set(0, 0, 1).applyQuaternion(qYaw);
    target.y = 0;
    return target.normalize();
  }

  lastPosition: Vector3 = new Vector3();

  checkPosition(position: Vector3, options?: { raycaster?: boolean }): boolean {
    // Temporäre Kopie der aktuellen Position, um sie später zurückzusetzen
    const originalPosition = this.position.clone();
    const originalTilt = this._tilt.clone();

    // Temporär die gewünschte Position setzen (für Kollisions- und Bodenausrichtungsprüfungen)
    this.position.copy(position);

    let valid = true;

    // Schritt 1: Bodenausrichtung prüfen (falls nötig), aber ohne Position zu ändern
    if (
      this.map &&
      this.groundAdjustmentMode !== GROUND_ADJUSTMENT_MODE.NONE &&
      this.groundAdjustmentMode !== GROUND_ADJUSTMENT_MODE.FLIGHT
    ) {
      // Simuliere Bodenausrichtung (ohne this.position zu überschreiben)
      const alignmentInfo = this.updateGroundAlignment(position, [], false);
      this.position.copy(alignmentInfo.position); // Temporär für Kollisionsprüfung
    } else if (this.groundAdjustmentMode === GROUND_ADJUSTMENT_MODE.FLIGHT) {
      const seaLevel = this.map?.modules.surface.getSeaLevel() ?? 0;
      this.position.y = Math.max(
        this.map?.modules.surface.getSurfaceHeightAt(
          position.x,
          position.z,
          u => !u.equals(this),
          options
        ) ?? 0,
        Math.max(position.y, seaLevel)
      );
    }

    // Schritt 2: Kollisionsprüfung
    const collisionType = this.modules.collision.checkCollision();

    if (collisionType >= COLLISION_TYPE.BLOCKED) {
      valid = false;
    } else {
      // Schritt 3: Spezielle Fälle (z.B. vertikale Bewegungen erlauben, wenn keine horizontale Komponente)
      const delta = position.clone().sub(originalPosition);
      const isHorizontalMove = Math.abs(delta.x) + Math.abs(delta.z) > 0.01;
      if (!isHorizontalMove && Math.abs(delta.y) >= 0.0) {
        // Vertikale Platzierungen (z.B. auf Gebäude) immer erlauben, auch bei Kollision
        valid = true;
      }
    }

    // Zurücksetzen der temporären Änderungen
    this.position.copy(originalPosition);
    this._tilt.copy(originalTilt);

    return valid;
  }

  setPosition(
    position: Vector3,
    options?: { force?: boolean; raycaster?: boolean }
  ) {
    let desired = position.clone();

    const unit = this as unknown as Unit<
      UnitModules & {
        movable: MovableUnitModule;
        patrol: PatrolUnitModule;
      }
    >;

    // Schritt 1: Führe Bodenausrichtung für die gewünschte Position durch (wenn nötig)
    if (
      this.map &&
      this.groundAdjustmentMode !== GROUND_ADJUSTMENT_MODE.NONE &&
      this.groundAdjustmentMode !== GROUND_ADJUSTMENT_MODE.FLIGHT &&
      this.groundAdjustmentMode !== GROUND_ADJUSTMENT_MODE.FIGURE
    ) {
      desired =
        this.updateGroundAlignment(desired, [unit], true).position ?? desired;
    } else if (
      !this.map?.app.isUpdateActive() &&
      (this.groundAdjustmentMode === GROUND_ADJUSTMENT_MODE.FLIGHT ||
        this.groundAdjustmentMode === GROUND_ADJUSTMENT_MODE.FIGURE)
    ) {
      desired.y =
        (this.map?.modules.surface.getSurfaceHeightAt(
          desired.x,
          desired.z,
          undefined,
          options
        ) ?? desired.y) + ('helicopter' in unit.modules ? 1 / 2 : 0);
    }

    const isAutopilot = unit.modules.movable?.hasAIControls() ?? false;
    const isPatrol = unit.modules.patrol?.state.active ?? false;

    if (isPatrol || isAutopilot) {
      this.position.copy(desired);
      this.lastPosition.copy(desired);
      this.observables.position$.next(desired);
      this.updateMeshTransform();
      return true;
    }

    // Schritt 2: Prüfe mit checkPosition, ob die Position gültig ist
    if (!options?.force && !this.checkPosition(desired, options)) {
      // Ungültig – zurücksetzen
      this.position.copy(this.lastPosition);
      this.root.position.copy(this.lastPosition);
      this.observables.position$.next(this.lastPosition.clone());
      this.updateMeshTransform();
      return false;
    }
    // Schritt 3: Position setzen (falls gültig oder erzwungen)
    this.position.copy(desired);
    this.lastPosition.copy(desired);
    this.observables.position$.next(desired);
    this.updateMeshTransform();
    return true;
  }

  //#region visibility
  getVisible() {
    return this.visible;
  }
  setVisible(visible = this.visible && this.chunkVisible) {
    if (this.visible === visible) return;
    this.root.traverse(obj => {
      obj.visible = visible;
    });
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

  getMinGroundInfo() {
    const sampleDistance = 0;
    const rotation = this.rotation.y;
    const groundModule = this.map!.modules.surface!;

    const info = groundModule.getTerrainInfoAt(
      this.position.x,
      this.position.z
    );

    const front = groundModule.getTerrainHeightAt(
      this.position.x + Math.sin(rotation) * sampleDistance,
      this.position.z + Math.cos(rotation) * sampleDistance
    );
    const back = groundModule.getTerrainHeightAt(
      this.position.x - Math.sin(rotation) * sampleDistance,
      this.position.z - Math.cos(rotation) * sampleDistance
    );
    const left = groundModule.getTerrainHeightAt(
      this.position.x + Math.cos(rotation) * sampleDistance,
      this.position.z - Math.sin(rotation) * sampleDistance
    );
    const right = groundModule.getTerrainHeightAt(
      this.position.x - Math.cos(rotation) * sampleDistance,
      this.position.z + Math.sin(rotation) * sampleDistance
    );

    return {
      ...info,
      position: info.position.clone().setY(Math.min(front, back, left, right))
    };
  }

  resetGroundNormal() {
    this._tilt.set(0, 0, 0);
  }

  calculateGroundNormal() {
    const sampleDistance = 1;
    const rotation = this.rotation.y;
    const groundModule = this.map?.modules.surface;
    if (!groundModule) return;
    // 4 Punkte um das Fahrzeug herum samplen
    const front = groundModule.getHeightAt(
      this.position.x + Math.sin(rotation) * sampleDistance,
      this.position.z + Math.cos(rotation) * sampleDistance
    );

    const back = groundModule.getHeightAt(
      this.position.x - Math.sin(rotation) * sampleDistance,
      this.position.z - Math.cos(rotation) * sampleDistance
    );

    const left = groundModule.getHeightAt(
      this.position.x + Math.cos(rotation) * sampleDistance,
      this.position.z - Math.sin(rotation) * sampleDistance
    );

    const right = groundModule.getHeightAt(
      this.position.x - Math.cos(rotation) * sampleDistance,
      this.position.z + Math.sin(rotation) * sampleDistance
    );

    // Pitch (Neigung vorne/hinten)
    const pitch = Math.atan2(back - front, sampleDistance * 2);

    // Roll (Neigung links/rechts)
    const roll = Math.atan2(left - right, sampleDistance * 2);

    this._tilt.set(pitch, 0, roll);
  }

  updateGroundAlignment(
    position?: Vector3,
    ignoredUnits: Unit[] = [],
    groundNormals = true
  ) {
    const groundModule = this.map?.modules.surface;

    if (position) {
      this.position.copy(position);
    }
    position = this.position;

    let info: {
      position: Vector3;
      unit?: Unit;
    } = {
      position: position.clone()
    };

    if (!groundModule) {
      this.updateMeshTransform();
      return info;
    }

    switch (this.groundAdjustmentMode) {
      case GROUND_ADJUSTMENT_MODE.MIN_HEIGHT:
        info = this.getMinGroundInfo();

        this.position.setY(info.position.y);
        break;

      case GROUND_ADJUSTMENT_MODE.FIGURE:
        {
          // info = groundModule.getTerrainInfoAt(
          //   position.x,
          //   position.z,
          //   ignoredUnits
          // );

          const seaLevel = this.map?.modules.surface.getSeaLevel() ?? 0;
          const water = this.position.y <= seaLevel;

          // info.position.setY(Math.max(info.position.y, seaLevel));

          // this.position.setY(info.position.y);

          if (!water && groundNormals) {
            this.calculateGroundNormal();
          }
        }
        break;

      case GROUND_ADJUSTMENT_MODE.GROUND:
        {
          info = groundModule.getTerrainInfoAt(
            position.x,
            position.z,
            ignoredUnits
          );
          this.position.setY(info.position.y);

          if (groundNormals) {
            this.calculateGroundNormal();
          }
        }
        break;

      case GROUND_ADJUSTMENT_MODE.FLIGHT:
        info = this.getMinGroundInfo();

        this.position.y = Math.max(
          this.position.y,
          Math.max(info.position.y, 0)
        );
        info.position.setY(this.position.y);
        break;

      case GROUND_ADJUSTMENT_MODE.SEA: // NEU: Für Boote
        if (this.modules.damage.isDestroyed()) {
          info = this.getMinGroundInfo();
          this.position.y = Math.max(info.position.y, this.position.y);
          info.position.setY(this.position.y);
        } else {
          const seaLevel = this.map?.modules.surface.getSeaLevel() ?? 0;
          this.position.y = seaLevel; // Höhe auf Sea Level setzen
          info.position.setY(seaLevel);
        }
        break;

      case GROUND_ADJUSTMENT_MODE.NONE:
        // Keine Anpassung
        break;

      default:
        break;
    }

    // Rotation berechnen
    this.updateMeshTransform();

    return info;
  }

  //#region yaw

  getYawQuaternion(): Quaternion {
    return new Quaternion().setFromAxisAngle(
      new Vector3(0, 1, 0),
      this.rotation.y
    );
  }

  getYaw() {
    return this.rotation.y;
  }

  setYaw(yaw: number) {
    const lastYaw = this.rotation.y;
    if (lastYaw === yaw) return;

    this.rotation.y = yaw;

    if (this.modules.collision.checkCollision() >= COLLISION_TYPE.BLOCKED) {
      this.rotation.y = lastYaw;
    }

    if (
      this.groundAdjustmentMode === GROUND_ADJUSTMENT_MODE.GROUND ||
      this.groundAdjustmentMode === GROUND_ADJUSTMENT_MODE.FIGURE
    ) {
      this.calculateGroundNormal();
    }

    this.updateMeshTransform();

    this.observables.rotation$.next(this.rotation.clone());
  }

  //#endregion

  //#region tilt

  getTilt() {
    return this._tilt;
  }

  //#endregion

  //#region pitch

  getPitch() {
    return this.pitchWrapper.rotation.x;
  }

  setPitch(p: number) {
    this.playerPitch = p;
    this.updateMeshTransform();
  }

  //#endregion

  //#region roll

  getRoll() {
    return this.rollWrapper.rotation.z;
  }

  setRoll(r: number) {
    this.playerRoll = r;
    this.updateMeshTransform();
  }

  //#endregion

  getOptions() {
    return {};
  }

  toDescription(): RawUnitDescription {
    return {
      key: (this.constructor as typeof Unit).KEY,
      id: this.id,
      position: this.getPosition().clone().setY(0).toArray(),
      rotation: this.getRotation().toArray(),
      options: this.getOptions(),
      moduleOptions: Object.fromEntries(
        Object.entries(this.modules).map(([key, module]) => {
          return [key, (module as UnitModule).getOptions()];
        })
      ),
      moduleStates: Object.fromEntries(
        Object.entries(this.modules).map(([key, module]) => {
          return [key, (module as UnitModule).getState()];
        })
      ),
      moduleDebug: this.moduleDebug
    };
  }
}
