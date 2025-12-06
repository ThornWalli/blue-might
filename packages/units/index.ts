import BlueMight from './blue_might/BlueMight';
import ControlTower_1 from './control_tower_1/ControlTower_1';
import LandingPort_1 from './landing_port_1/LandingPort_1';
import Tank_1 from './tank_1/Tank_1';
import Tree_1 from './tree_1/Tree_1';

export { default as ControlTower_1 } from './control_tower_1/ControlTower_1';
export { default as Tank_1 } from './tank_1/Tank_1';
export { default as LandingPort_1 } from './landing_port_1/LandingPort_1';
export { default as Tree_1 } from './tree_1/Tree_1';
export { default as BlueMight } from './blue_might/BlueMight';

const units = {
  [ControlTower_1.KEY]: ControlTower_1,
  [Tank_1.KEY]: Tank_1,
  [LandingPort_1.KEY]: LandingPort_1,
  [Tree_1.KEY]: Tree_1,
  [BlueMight.KEY]: BlueMight
};

export { units };
