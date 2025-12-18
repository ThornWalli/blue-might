// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { ReplaySubject, Subscription } from 'rxjs';
// import { Euler, Quaternion, Vector3, type Object3D } from 'three';
// import { Group } from 'three';
// import PlayerUnitModule from './unitModule/Player';
// import type UnitModule from './UnitModule';
// import type { UnitModuleOptions, UnitModuleState } from './UnitModule';

// import { OBJECT_USER_DATA, setMainObjectRecursive } from '../utils/object';

// import type { UnitIdentifier } from '../types/unit';
// import type Map from './Map';
// import type { AnimationLoopValue } from './Renderer';
// import { AnimationUnitModule } from './unitModule/Animation';
// import SelectionUnitModule from './unitModule/Selection';

// type AbstractConstructor<T = any> = abstract new (...args: any[]) => T;

// declare module '../../lib/utils/object' {
//   interface ObjectUserData {
//     UNIT: string;
//   }
// }
// OBJECT_USER_DATA.UNIT = 'unit';

// export type UnitModuleList = (
//   | typeof PlayerUnitModule
//   | typeof AnimationUnitModule
//   | typeof SelectionUnitModule
// )[];

// // eslint-disable-next-line @typescript-eslint/no-empty-object-type
// export interface UnitOptions {}

// export interface UnitConstructorOptions<
//   Options extends UnitOptions = UnitOptions
// > {
//   id?: string;
//   name: string;
//   options?: Options;
//   moduleOptions?: { [key: string]: UnitModuleOptions };
//   moduleStates?: { [key: string]: UnitModuleState };
//   position?: Vector3;
//   rotation?: number;
// }

// export interface UnitModules {
//   player: PlayerUnitModule;
//   animation: AnimationUnitModule;
//   selection: SelectionUnitModule;
// }

// export interface SetupContext {
//   unit: Unit;
//   map?: Map;
// }

// export interface UnitObservables {
//   position$: ReplaySubject<Vector3>;
//   rotation$: ReplaySubject<number>;
//   materialReady$: ReplaySubject<void>;
//   map$: ReplaySubject<Map | null>;
// }

// export default class Unit<
//   Options extends UnitOptions = UnitOptions,
//   Modules extends UnitModules = UnitModules,
//   ModuleList extends UnitModuleList = UnitModuleList,
//   Observables extends UnitObservables = UnitObservables
// > {
//   debug = false;

//   static KEY = 'unit';
//   static NAME = 'Unit';

//   id: UnitIdentifier;
//   name: string;

//   observables: Observables = {} as Observables;

//   modules: Modules = {} as Modules;
//   moduleList: ModuleList;

//   subscription = new Subscription();
//   options: Options = {} as Options;
//   root: Group;
//   private _updateModules: UnitModule[] = [];
//   private _map: Map | null = null;
//   private normalizeGroundAlignment: boolean = true;
//   private _position: Vector3 = new Vector3(0, 0, 0);
//   private _rotation: number = 0;
//   /**
//    * Gelände-Neigung (Pitch/Roll)
//    * x = pitch
//    * y = yaw
//    * z = roll
//    */
//   private _tilt: Vector3 = new Vector3(0, 0, 0);
//   constructor(
//     {
//       id,
//       debug,
//       name,
//       position,
//       rotation,
//       options,
//       moduleOptions,
//       moduleStates
//     }: UnitConstructorOptions & { debug?: boolean } = {
//       name: 'Unit',
//       position: new Vector3(0, 0, 0),
//       options: {} as Options,
//       moduleOptions: {},
//       moduleStates: {}
//     },
//     moduleList: unknown[] = []
//   ) {
//     //#region observables
//     this.observables.materialReady$ = new ReplaySubject<void>(1);
//     this.observables.position$ = new ReplaySubject<Vector3>(1);
//     this.observables.rotation$ = new ReplaySubject<number>(1);
//     //#endregion

//     this.id = id || crypto.randomUUID();
//     this.name = name;

//     this.debug = debug ?? false;

//     this._position = position || new Vector3(0, 0, 0);
//     this._rotation = rotation || 0;

//     this.options = {
//       ...this.options,
//       ...options
//     } as Options;

//     //#region modules

//     moduleList.unshift(
//       PlayerUnitModule,
//       AnimationUnitModule,
//       SelectionUnitModule
//     );

//     this.moduleList = moduleList as ModuleList;

//     const preparedModules = (moduleList as ModuleList).map(ModuleClass => {
//       const options = moduleOptions?.[ModuleClass.TYPE] ?? {};
//       const state = moduleStates?.[ModuleClass.TYPE] ?? {};
//       const moduleInstance = new ModuleClass(
//         this,
//         options as any,
//         state as any,
//         this.debug
//       );
//       return [ModuleClass.TYPE, moduleInstance];
//     });
//     this.modules = Object.fromEntries(preparedModules);

//     //#endregion

//     this.root = this.setupRoot(name);
//   }

//   get key(): string {
//     return (this.constructor as typeof Unit).KEY;
//   }

//   equal(unit: Unit) {
//     return this.id === unit.id;
//   }

//   createMesh(_context: SetupContext): Promise<Object3D> {
//     return Promise.resolve(new Group() as Object3D);
//   }

//   async setup(context: SetupContext) {
//     this._map = context.map ?? null;

//     let mesh = await this.createMesh(context);

//     const modules: UnitModule[] = Object.values(this.modules);

//     // Setup modules

//     for (const module of modules) {
//       await module.setup();
//       mesh = await module.setupMesh({ mesh, root: this.root, ...context });
//     }

//     this.setPosition(this._position!);
//     this.addToRoot(mesh);

//     // Filter modules that have update method
//     const updateModules = modules.filter(
//       module => typeof module.update === 'function'
//     );
//     this._updateModules = updateModules;

//     for (const module of modules) {
//       await module.afterSetup();
//     }

//     this.updateMeshTransform();
//   }

//   setupRoot(name: string) {
//     const root = new Group();
//     root.name = name;
//     root.userData[OBJECT_USER_DATA.MAIN_OBJECT] = root.id;
//     root.userData[OBJECT_USER_DATA.UNIT] = this;
//     setMainObjectRecursive(root, root);
//     return root;
//   }

//   afterSetup(_context: SetupContext) {
//     // Override in subclasses
//   }

//   addToRoot(object: Object3D) {
//     this.root.add(object);
//     setMainObjectRecursive(object, this.root);
//   }

//   destroy() {
//     this.subscription.unsubscribe();
//     Object.values(this.modules).forEach(module => module.destroy());
//     this.root.removeFromParent();
//     this.root.remove();
//   }

//   getMap() {
//     return this._map;
//   }

//   update(v: AnimationLoopValue) {
//     this._updateModules.forEach(module => module.update(v));
//   }

//   equals(unit: Unit): boolean {
//     return this.id === unit.id;
//   }

//   setMaterialReady() {
//     this.observables.materialReady$.next();
//     this.observables.materialReady$.complete();
//   }

//   getPosition() {
//     return this._position;
//   }

//   getNormalizeGroundAlignment() {
//     return this.normalizeGroundAlignment;
//   }

//   setNormalizeGroundAlignment(normalize: boolean) {
//     this.normalizeGroundAlignment = normalize;
//   }

//   updateGroundAlignment(position: Vector3 = this._position) {
//     const groundModule = this._map?.modules.ground;
//     if (!groundModule) {
//       this.updateMeshTransform();
//       return;
//     }

//     this._position.copy(position);

//     if (this.normalizeGroundAlignment) {
//       const groundHeight = groundModule.getHeightAt(position.x, position.z);
//       this._position.y = groundHeight;
//       // Gelände-Normale berechnen (für Neigung)
//       this.calculateGroundNormal();
//     } else {
//       this._position.y = this.getMinGroundHeight();
//     }

//     // Rotation berechnen
//     this.updateMeshTransform();
//   }

//   checkCollision() {
//     return this._map && this._map.checkCollision(this);
//   }

//   getRotation() {
//     return this._rotation;
//   }
//   setRotation(rotation: number) {
//     const lastRotation = this._rotation;
//     this._rotation = rotation;
//     this.updateMeshTransform();
//     if (this.checkCollision()) {
//       this._rotation = lastRotation;
//     }
//     this.observables.rotation$.next(rotation);
//   }

//   private calculateGroundNormal() {
//     const sampleDistance = 1;
//     const rotation = this._rotation;
//     const groundModule = this._map?.modules.ground;
//     if (!groundModule) return;
//     // 4 Punkte um das Fahrzeug herum samplen
//     const front = groundModule.getHeightAt(
//       this._position.x + Math.sin(rotation) * sampleDistance,
//       this._position.z + Math.cos(rotation) * sampleDistance
//     );

//     const back = groundModule.getHeightAt(
//       this._position.x - Math.sin(rotation) * sampleDistance,
//       this._position.z - Math.cos(rotation) * sampleDistance
//     );

//     const left = groundModule.getHeightAt(
//       this._position.x + Math.cos(rotation) * sampleDistance,
//       this._position.z - Math.sin(rotation) * sampleDistance
//     );

//     const right = groundModule.getHeightAt(
//       this._position.x - Math.cos(rotation) * sampleDistance,
//       this._position.z + Math.sin(rotation) * sampleDistance
//     );

//     // Pitch (Neigung vorne/hinten)
//     const pitch = Math.atan2(back - front, sampleDistance * 2);

//     // Roll (Neigung links/rechts)
//     const roll = Math.atan2(left - right, sampleDistance * 2);

//     this._tilt.set(pitch, 0, roll);
//   }

//   getMinGroundHeight(): number {
//     const sampleDistance = 1;
//     const rotation = this._rotation;
//     const groundModule = this._map?.modules.ground;
//     if (!groundModule) return this._position.y;

//     const front = groundModule.getHeightAt(
//       this._position.x + Math.sin(rotation) * sampleDistance,
//       this._position.z + Math.cos(rotation) * sampleDistance
//     );
//     const back = groundModule.getHeightAt(
//       this._position.x - Math.sin(rotation) * sampleDistance,
//       this._position.z - Math.cos(rotation) * sampleDistance
//     );
//     const left = groundModule.getHeightAt(
//       this._position.x + Math.cos(rotation) * sampleDistance,
//       this._position.z - Math.sin(rotation) * sampleDistance
//     );
//     const right = groundModule.getHeightAt(
//       this._position.x - Math.cos(rotation) * sampleDistance,
//       this._position.z + Math.sin(rotation) * sampleDistance
//     );

//     return Math.min(front, back, left, right);
//   }

//   /**
//    * Aktualisiert Mesh Position und Rotation
//    */
//   private updateMeshTransform() {
//     // Position
//     this.root.position.copy(this._position);
//     // this.root.translateY(0.001); // Z-Fighting vermeiden

//     // Rotation: Erst Y (Heading), dann Gelände-Anpassung (Pitch/Roll)
//     const quaternion = new Quaternion();

//     // Y-Rotation (Fahrtrichtung)
//     const yaw = new Quaternion().setFromEuler(
//       new Euler(0, this.getRotation(), 0)
//     );

//     // Pitch und Roll (Gelände-Anpassung)
//     const groundRotation = new Quaternion().setFromEuler(
//       new Euler(this._tilt.x, 0, this._tilt.z)
//     );

//     // Kombinieren: Erst Heading, dann Gelände
//     quaternion.multiplyQuaternions(yaw, groundRotation);
//     this.root.quaternion.copy(quaternion);
//     this.root.updateWorldMatrix(true, false);
//     this.root.updateMatrixWorld(true);
//   }

//   setPosition(position: Vector3) {
//     const lastPosition = this._position.clone();
//     if (this._map) {
//       this.updateGroundAlignment(position);
//     } else {
//       this._position.copy(position);
//       this.root.position.copy(position);
//     }
//     if (this.checkCollision()) {
//       this._position.copy(lastPosition);
//       this.root.position.copy(lastPosition);
//     }
//     this.observables.position$.next(position.clone());
//   }

//   //#region visibility
//   private visible: boolean = true;
//   setVisible(visible = this.visible && this.chunkVisible) {
//     this.root.visible = visible;
//   }
//   //#endregion

//   //#region chunk management
//   currentChunkKey: string | null = null;
//   private chunkVisible = true;
//   setChunkVisible(visible: boolean) {
//     this.chunkVisible = visible;
//     this.setVisible();
//   }
//   //#endregion

//   //#region modules
//   getModule<M extends UnitModule>(moduleType: string) {
//     return this.modules[moduleType as keyof Modules] as M;
//   }

//   getModuleByType<T extends UnitModule>(
//     ModuleClass: AbstractConstructor<T>
//   ): T | undefined {
//     return Object.values(this.modules).find(m => m instanceof ModuleClass) as
//       | T
//       | undefined;
//   }

//   hasModuleType(ModuleClass: typeof UnitModule | any) {
//     return Object.values(this.modules).some(m => m instanceof ModuleClass);
//   }
//   //#endregion
// }
