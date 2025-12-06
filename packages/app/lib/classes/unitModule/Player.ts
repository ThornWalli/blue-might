import { ConeGeometry, Mesh, MeshStandardMaterial, Object3D } from 'three';
import type Player from '../Player';
import UnitModule, {
  type UnitModuleOptions,
  type UnitModuleSetupContext,
  type UnitModuleState
} from '../UnitModule';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type Unit from '../Unit';

type Options = UnitModuleOptions;
type State = UnitModuleState;

export default class PlayerUnitModule extends UnitModule<Options, State> {
  hasPlayer() {
    return this._player !== null;
  }
  static override TYPE = 'player';

  root: Object3D;
  private _player: Player | null = null;

  constructor(unit: Unit, options: Options, state: State, debug: boolean) {
    super(unit, options, state, debug);

    this.root = new Object3D();
  }

  override async setupMesh(context: UnitModuleSetupContext) {
    const mesh = await super.setupMesh(context);
    this.root.add(mesh);
    return this.root;
  }

  createIndicator() {
    const radius = 0.1;
    const height = 0.2;
    const radialSegments = 4;
    const coneTop = new ConeGeometry(radius, height, radialSegments);
    const coneBottom = new ConeGeometry(radius, height, radialSegments);

    coneBottom.rotateX(Math.PI);
    coneBottom.translate(0, -height, 0);

    const mergedGeometry = mergeGeometries([coneTop, coneBottom]);

    const mesh = new Mesh(
      mergedGeometry,
      new MeshStandardMaterial({
        color: 0x0066ff,
        transparent: true,
        opacity: 0.7,
        metalness: 0.0,
        roughness: 0.1,
        envMapIntensity: 1.0
      })
    );

    return mesh;
  }

  getPlayer() {
    return this._player;
  }
  setPlayer(player: Player | null) {
    this._player = player;
  }

  isCurrentPlayer() {
    return this._player?.equal(
      this.getUnit()?.getMap()?.app.modules.player.getCurrentPlayer()
    );
  }
}
