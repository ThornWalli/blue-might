export enum FACTION {
  NEUTRAL = 'neutral',
  BLUE = 'blue',
  ENEMY = 'enemy'
}

export default Object.freeze({
  [FACTION.NEUTRAL]: {
    id: FACTION.NEUTRAL,
    name: 'Neutral Faction',
    colors: [0x808080, 0xffffff],
    mapColor: 0x808080
  },
  [FACTION.BLUE]: {
    id: FACTION.BLUE,
    name: 'Blue Faction',
    colors: [0x0055aa, 0xcccccc],
    mapColor: 0x0055aa
  },
  [FACTION.ENEMY]: {
    id: FACTION.ENEMY,
    name: 'Enemy Faction',
    colors: [0x205010, 0xa0b0a0],
    mapColor: 0xff0000
  }
});
