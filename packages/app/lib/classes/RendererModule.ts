import Module, { type ModuleObservables, type ModuleState } from './Module';
import type Renderer from './Renderer';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RendererModuleObservables extends ModuleObservables {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RendererModuleState extends ModuleState {}

export default abstract class RendererModule<
  State extends RendererModuleState = RendererModuleState,
  Observables extends RendererModuleObservables = RendererModuleObservables
> extends Module<State, Observables> {
  constructor(
    public renderer: Renderer,
    debug?: boolean
  ) {
    super(debug);
  }
}
