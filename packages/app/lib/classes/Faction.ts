export type FactionIdentifier = string;

export default class Faction {
  id: FactionIdentifier;
  name: string;
  colors: number[];

  constructor({
    id,
    name,
    colors
  }: {
    id?: FactionIdentifier;
    name: string;
    colors: number[];
  }) {
    this.id = id || crypto.randomUUID();
    this.name = name;
    this.colors = colors;
  }
}
