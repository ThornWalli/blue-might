import Soldat_1 from '@blue-might/units/vehicle/soldat_1/Soldat_1';

import CombatHelicopter_1 from './vehicle/combat_helicopter_1/CombatHelicopter_1';
import CombatTank_1 from './vehicle/combat_tank_1/CombatTank_1';
import ControlTower_1 from './building/control_tower_1/ControlTower_1';
import LandingPort_1 from './building/landing_port_1/LandingPort_1';
import Tank_1 from './vehicle/tank_1/Tank_1';
import Tree_1 from './tree/tree_1/Tree_1';
import Barrack_1 from './building/barrack_1/Barrack_1';
import Turret_1 from './turret/turret_1/Turret_1';
import StationaryGun_2 from './turret/stationary_gun_2/StationaryGun_2';
import House_1 from './building/house_1/House_1';
import Tower_1 from './building/tower_1/Tower_1';

export { default as ControlTower_1 } from './building/control_tower_1/ControlTower_1';
export { default as Tank_1 } from './vehicle/tank_1/Tank_1';
export { default as LandingPort_1 } from './building/landing_port_1/LandingPort_1';
export { default as Tree_1 } from './tree/tree_1/Tree_1';
export { default as CombatHelicopter_1 } from './vehicle/combat_helicopter_1/CombatHelicopter_1';
export { default as CombatTank_1 } from './vehicle/combat_tank_1/CombatTank_1';
export { default as Barrack_1 } from './building/barrack_1/Barrack_1';
export { default as Turret_1 } from './turret/turret_1/Turret_1';
export { default as StationaryGun_2 } from './turret/stationary_gun_2/StationaryGun_2';
export { default as Soldat_1 } from './vehicle/soldat_1/Soldat_1';
export { default as House_1 } from './building/house_1/House_1';
export { default as Tower_1 } from './building/tower_1/Tower_1';

const units = {
  [ControlTower_1.KEY]: ControlTower_1,
  [Tank_1.KEY]: Tank_1,
  [LandingPort_1.KEY]: LandingPort_1,
  [Tree_1.KEY]: Tree_1,
  [CombatHelicopter_1.KEY]: CombatHelicopter_1,
  [CombatTank_1.KEY]: CombatTank_1,
  [Barrack_1.KEY]: Barrack_1,
  [Soldat_1.KEY]: Soldat_1,
  [Turret_1.KEY]: Turret_1,
  [StationaryGun_2.KEY]: StationaryGun_2,
  [Soldat_1.KEY]: Soldat_1,
  [House_1.KEY]: House_1,
  [Tower_1.KEY]: Tower_1
};

export { units };
