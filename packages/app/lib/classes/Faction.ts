export type FactionIdentifier = string;

export default class Faction {
  id: FactionIdentifier;
  name: string;
  colors: number[];
  mapColor: number;

  constructor({
    id,
    name,
    colors,
    mapColor
  }: {
    id?: FactionIdentifier;
    name: string;
    colors: number[];
    mapColor: number;
  }) {
    this.id = id || crypto.randomUUID();
    this.name = name;
    this.colors = colors;
    this.mapColor = mapColor;
  }

  equal(faction: Faction): boolean {
    return this.id === faction.id;
  }
}
