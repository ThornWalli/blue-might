import type { UnitOptions } from '@blue-might/app/lib/classes/Unit';
import type Unit from '@blue-might/app/lib/classes/Unit';

import type { RawUnitDescription_Church_1 } from './building/church_1/Church_1';
import type { RawUnitDescription_Tower_1 } from './building/tower_1/Tower_1';
import type { RawUnitDescription_ControlTower_1 } from './building/control_tower_1/ControlTower_1';
import type { RawUnitDescription_Factory_1 } from './building/factory_1/Factory_1';
import type { RawUnitDescription_FactoryChimney_1 } from './building/factory_chimney_1/FactoryChimney_1';
import type { RawUnitDescription_House_1 } from './building/house_1/House_1';
import type { RawUnitDescription_LandingPortSupplyStation_1 } from './building/landing_port_supply_station_1/LandingPortSupplyStation_1';
import type { RawUnitDescription_Lighthouse_1 } from './building/lighthouse_1/Lighthouse_1';
import type { RawUnitDescription_MissleLauncher_1 } from './turret/missle_launcher_1/MissleLauncher_1';
import type { RawUnitDescription_Turret_1 } from './turret/turret_1/Turret_1';
import type { RawUnitDescription_CombatHelicopter_1 } from './vehicle/combat_helicopter_1/CombatHelicopter_1';
import type { RawUnitDescription_CombatTank_1 } from './vehicle/combat_tank_1/CombatTank_1';
import type { RawUnitDescription_Soldat_1 } from './vehicle/soldat_1/Soldat_1';
import type { RawUnitDescription_Tank_1 } from './vehicle/tank_1/Tank_1';
import type { RawUnitDescription_SeaLandingPortSupplyStation_1 } from './building/sea_landing_port_supply_station_1/SeaLandingPortSupplyStation_1';
import type { RawUnitDescription_Flag_1 } from './building/flag_1/Flag_1';
import type { RawUnitDescription_LandingPort_1 } from './building/landing_port_1/LandingPort_1';
import type { RawUnitDescription_LandingPortRescue_1 } from './building/landing_port_rescue_1/LandingPortRescue_1';
import type { RawUnitDescription_Windsock_1 } from './building/windsock_1/Windsock_1';
import type { RawUnitDescription_SupplyStation_1 } from './building/supply_station_1/SupplyStation_1';
import type { RawUnitDescription_Barrack_1 } from './building/barrack_1/Barrack_1';
import type { RawUnitDescription_BarrackRescue_1 } from './building/barrack_rescue_1/BarrackRescue_1';
import type { RawUnitDescription_CombatSubmarine_1 } from './vehicle/combat_submarine_1/CombatSubmarine_1';
import type { RawUnitDescription_CombatFregatte_1 } from './vehicle/combat_fregatte_1/CombatFregatte_1';
import type { RawUnitDescription_Tree_1 } from './tree/tree_1/Tree_1';
import type { RawUnitDescription_Tree_2 } from './tree/tree_2/Tree_2';
import type { RawUnitDescription_CombatShip_1 } from './vehicle/combat_ship_1/CombatShip_1';
import type { RawUnitDescription_SeaSupplyStation_1 } from './building/sea_supply_station_1/SeaSupplyStation_1';
import type Church_1 from './building/church_1/Church_1';
import type Tower_1 from './building/tower_1/Tower_1';
import type ControlTower_1 from './building/control_tower_1/ControlTower_1';
import type Factory_1 from './building/factory_1/Factory_1';
import type FactoryChimney_1 from './building/factory_chimney_1/FactoryChimney_1';
import type House_1 from './building/house_1/House_1';
import type LandingPortSupplyStation_1 from './building/landing_port_supply_station_1/LandingPortSupplyStation_1';
import type Lighthouse_1 from './building/lighthouse_1/Lighthouse_1';
import type MissleLauncher_1 from './turret/missle_launcher_1/MissleLauncher_1';
import type Turret_1 from './turret/turret_1/Turret_1';
import type CombatHelicopter_1 from './vehicle/combat_helicopter_1/CombatHelicopter_1';
import type CombatTank_1 from './vehicle/combat_tank_1/CombatTank_1';
import type Soldat_1 from './vehicle/soldat_1/Soldat_1';
import type Tank_1 from './vehicle/tank_1/Tank_1';
import type SeaLandingPortSupplyStation_1 from './building/sea_landing_port_supply_station_1/SeaLandingPortSupplyStation_1';
import type Flag_1 from './building/flag_1/Flag_1';
import type LandingPort_1 from './building/landing_port_1/LandingPort_1';
import type LandingPortRescue_1 from './building/landing_port_rescue_1/LandingPortRescue_1';
import type Windsock_1 from './building/windsock_1/Windsock_1';
import type SupplyStation_1 from './building/supply_station_1/SupplyStation_1';
import type Barrack_1 from './building/barrack_1/Barrack_1';
import type BarrackRescue_1 from './building/barrack_rescue_1/BarrackRescue_1';
import type CombatSubmarine_1 from './vehicle/combat_submarine_1/CombatSubmarine_1';
import type CombatFregatte_1 from './vehicle/combat_fregatte_1/CombatFregatte_1';
import type CombatShip_1 from './vehicle/combat_ship_1/CombatShip_1';
import type Tree_1 from './tree/tree_1/Tree_1';
import type Tree_2 from './tree/tree_2/Tree_2';

export type UnitDescriptions<O extends UnitOptions = UnitOptions> =
  | RawUnitDescription_LandingPortSupplyStation_1<O>
  | RawUnitDescription_MissleLauncher_1<O>
  | RawUnitDescription_Turret_1<O>
  | RawUnitDescription_CombatHelicopter_1<O>
  | RawUnitDescription_CombatTank_1<O>
  | RawUnitDescription_Tank_1<O>
  | RawUnitDescription_Tower_1<O>
  | RawUnitDescription_SeaLandingPortSupplyStation_1<O>
  | RawUnitDescription_SeaSupplyStation_1<O>
  | RawUnitDescription_House_1<O>
  | RawUnitDescription_Soldat_1<O>
  | RawUnitDescription_ControlTower_1<O>
  | RawUnitDescription_Factory_1<O>
  | RawUnitDescription_FactoryChimney_1<O>
  | RawUnitDescription_Lighthouse_1<O>
  | RawUnitDescription_Flag_1<O>
  | RawUnitDescription_LandingPort_1<O>
  | RawUnitDescription_LandingPortRescue_1<O>
  | RawUnitDescription_Church_1<O>
  | RawUnitDescription_Windsock_1<O>
  | RawUnitDescription_SupplyStation_1<O>
  | RawUnitDescription_Barrack_1<O>
  | RawUnitDescription_BarrackRescue_1<O>
  | RawUnitDescription_CombatSubmarine_1<O>
  | RawUnitDescription_CombatFregatte_1<O>
  | RawUnitDescription_CombatShip_1<O>
  | RawUnitDescription_Tree_1<O>
  | RawUnitDescription_Tree_2<O>;

export type Units =
  | Unit
  | Church_1
  | Tower_1
  | ControlTower_1
  | Factory_1
  | FactoryChimney_1
  | House_1
  | LandingPortSupplyStation_1
  | Lighthouse_1
  | MissleLauncher_1
  | Turret_1
  | CombatHelicopter_1
  | CombatTank_1
  | Soldat_1
  | Tank_1
  | SeaLandingPortSupplyStation_1
  | Flag_1
  | LandingPort_1
  | LandingPortRescue_1
  | Church_1
  | Windsock_1
  | SupplyStation_1
  | Barrack_1
  | BarrackRescue_1
  | CombatSubmarine_1
  | CombatFregatte_1
  | CombatShip_1
  | Tree_1
  | Tree_2;

export type VehicleUnits =
  | CombatHelicopter_1
  | CombatTank_1
  | Soldat_1
  | Tank_1
  | CombatSubmarine_1
  | CombatFregatte_1
  | CombatShip_1;
