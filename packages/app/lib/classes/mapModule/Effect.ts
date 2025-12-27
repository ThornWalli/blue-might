import MapModule, {
  type MapModuleObservables,
  type MapModuleState
} from '../MapModule';
declare module '../Map' {
  interface ModuleDebug {
    effect: boolean;
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Observables extends MapModuleObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface State extends MapModuleState {}

/**
 *@deprecated Brauch ich das?
 */
export default class EffectModule extends MapModule<State, Observables> {
  static override TYPE = 'effect';
  override state: State = {};
}
