/* eslint-disable complexity */
import {
  Box3,
  Mesh,
  MeshLambertMaterial,
  Sphere,
  SphereGeometry,
  Vector3
} from 'three';
import { ReplaySubject, Subscription } from 'rxjs';

import UnitModule, {
  type UnitModuleObservables,
  type UnitModuleOptions,
  type UnitModuleState
} from '../UnitModule';
import type Unit from '../Unit';
import type { AnimationLoopValue } from '../Renderer';

declare module '../Unit' {
  interface ModuleStates {
    attack: Partial<AttackUnitModuleState>;
  }
  interface ModuleOptions {
    attack: Partial<AttackUnitModuleOptions>;
  }
  interface ModuleDebug {
    attack: boolean;
  }
}

export interface AttackUnitModuleObservables extends UnitModuleObservables {
  target$: ReplaySubject<Unit | undefined>;
}

export interface AttackUnitModuleOptions extends UnitModuleOptions {
  changeByDistance: boolean;
}

export interface AttackUnitModuleState extends UnitModuleState {
  radius: number;
  target?: Unit;
}

export default class AttackUnitModule extends UnitModule<
  AttackUnitModuleOptions,
  AttackUnitModuleState,
  AttackUnitModuleObservables
> {
  static override TYPE = 'attack';

  private sphere: Sphere;
  private debugSphere: Mesh | null = null;
  private box: Box3 = new Box3();

  constructor(
    unit: Unit,
    options: AttackUnitModuleOptions,
    state: AttackUnitModuleState,
    debug: boolean
  ) {
    super(unit, options, { ...state, radius: state.radius ?? 4 }, debug);

    //#region observables
    this.observables.target$ = new ReplaySubject<Unit | undefined>(1);
    //#endregion

    this.sphere = new Sphere(new Vector3(), this.state.radius);
  }

  override async setup() {
    await super.setup();
    this.subscription.add(
      this.getUnit().observables.position$.subscribe(position => {
        this.sphere.center.copy(position);
        // this.debugSphere?.position.copy(position);
      })
    );

    if (this.debug) {
      this.setupDebug();
    }
  }

  override update(_v: AnimationLoopValue): void {
    // Wenn bereits ein Ziel vorhanden und die Option "changeByDistance" deaktiviert ist wird nicht automatisch ein neues Ziel gesucht.
    if (!this.options.changeByDistance && this.state.target) {
      return;
    }

    const unit = this.getUnit();
    const unitsInRadius =
      unit
        .getMap()
        ?.modules.units.chunkManager.getUnitsInRadius(
          unit.getPosition(),
          this.state.radius
        ) ?? [];

    const intersectingUnits: Unit[] = [];
    for (const targetUnit of unitsInRadius) {
      if (!this.isAttackAllowed(targetUnit)) {
        continue;
      }
      const intersected = this.intersect(targetUnit);
      if (intersected) {
        intersectingUnits.push(intersected);
      }
    }

    (this.debugSphere?.material as MeshLambertMaterial)?.color.set(0x00ff00);
    if (intersectingUnits.length) {
      if (this.state.target !== intersectingUnits[0]) {
        this.setTarget(intersectingUnits[0]);
      }
      (this.debugSphere?.material as MeshLambertMaterial)?.color.set(0xff0000);
      // console.log('Units intersecting attack sphere:', intersectingUnits);
      // Hier kannst du Angriffe auslösen, z.B. targetUnit.getModule('damage')?.takeDamage(...)
    }
  }

  private intersect(unit: Unit) {
    const collisionModule = unit.modules.collision;
    if (collisionModule) {
      // Hole die Welt-Bounding Box der Ziel-Unit
      const targetBox = collisionModule.getWorldOBB();
      if (targetBox.intersectsSphere(this.sphere)) {
        return unit;
      }
    } else {
      // Fallback: Prüfe Distanz zur Position, wenn kein Kollisionsmodul vorhanden
      const distance = this.getUnit()
        .getPosition()
        .distanceTo(unit.getPosition());
      if (distance <= this.state.radius) {
        return unit;
      }
    }
  }

  private setTarget(target: Unit | undefined) {
    this.state.target = target;
    if (target) {
      const unitSubscription = new Subscription();
      unitSubscription.add(
        target.observables.position$.subscribe(() => {
          if (!this.intersect(target)) {
            this.setTarget(undefined);
            unitSubscription?.unsubscribe();
          }
        })
      );
      unitSubscription.add(
        target.modules.damage.observables.destroyed$.subscribe(() => {
          this.setTarget(undefined);
          unitSubscription?.unsubscribe();
        })
      );
      this.subscription.add(unitSubscription);
    }
    this.observables.target$.next(this.state.target);
    console.log('New attack target:', target);
  }

  private isAttackAllowed(target: Unit): boolean {
    const unit = this.getUnit();
    const isDestroyed = target.modules.damage?.isDestroyed();
    const isFriend = unit.modules.faction.isFriendlyFaction(
      target.modules.faction.getFaction()
    );
    return !isDestroyed && !isFriend;
  }

  private setupDebug() {
    const debugSphere = new Mesh(
      new SphereGeometry(this.sphere.radius, 16, 16),
      new MeshLambertMaterial({ color: 0xff0000, wireframe: true })
    );
    this.debugSphere = debugSphere;
    this.getUnit().getMap()?.app.getScene().add(this.debugSphere);
  }
}
