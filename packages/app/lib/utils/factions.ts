import Faction from '../classes/Faction';

export const blueFaction = new Faction({
  id: 'blue-faction',
  name: 'Blue Faction',
  colors: [0x0055aa, 0xcccccc],
  mapColor: 0x0055aa
});
export const enemyFaction = new Faction({
  id: 'enemy-faction',
  name: 'Enemy Faction',
  colors: [0x205010, 0xa0b0a0],
  mapColor: 0xff0000
});
