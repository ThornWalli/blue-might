export type FactionIdentifier = string;

export interface FactionDescription {
  id: FactionIdentifier;
  name: string;
  colors: number[];
  mapColor: number;
}

export default class Faction implements FactionDescription {
  id: FactionIdentifier;
  name: string;
  colors: number[];
  mapColor: number;

  constructor({
    id,
    name,
    colors,
    mapColor
  }: Exclude<FactionDescription, 'id'> & {
    id?: FactionIdentifier;
  }) {
    this.id = id || crypto.randomUUID();
    this.name = name;
    this.colors = colors;
    this.mapColor = mapColor;
  }

  equal(faction: Faction): boolean {
    return this.id === faction.id;
  }

  toDescription(): FactionDescription {
    return {
      id: this.id,
      name: this.name,
      colors: this.colors,
      mapColor: this.mapColor
    };
  }
}
