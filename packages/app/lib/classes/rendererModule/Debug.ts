import { AxesHelper } from 'three';
import GUI from 'three/examples/jsm/libs/lil-gui.module.min.js';

import RendererModule, { type RendererModuleState } from '../RendererModule';
import type Renderer from '../Renderer';

export interface State extends RendererModuleState {
  gui?: boolean;
  axes?: boolean;
  ghost?: boolean;
}

export default class DebugRendererModule extends RendererModule<State> {
  static override TYPE = 'debug';

  axisHelper?: AxesHelper;
  gui?: GUI;

  constructor(renderer: Renderer, state: State) {
    super(renderer, {
      ...state,
      gui: state.gui ?? true,
      axes: state.axes ?? true,
      ghost: state.ghost ?? false
    });
  }

  setOptions(options: Partial<State>) {
    this.state = { ...this.state, ...options };
    this.setup();
  }

  override async setup() {
    const scene = this.renderer.scene;

    //#region Axes Helper
    if (this.axisHelper) {
      scene.remove(this.axisHelper);
      this.axisHelper = undefined;
    }
    if (this.state.axes) {
      this.axisHelper = new AxesHelper(5);
      scene.add(this.axisHelper);
    }
    //#endregion

    //#region GUI
    if (this.gui) {
      this.gui.destroy();
      this.gui = undefined;
    }

    if (this.state.gui) {
      this.gui = debugGui(this.renderer);
    }
    //#endregion
  }
}

function debugGui(_context: Renderer) {
  const gui = new GUI();
  // const params = {};
  return gui;
}
