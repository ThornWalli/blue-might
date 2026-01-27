import { convertColor } from '@blue-might/app/utils/export';

export type FactoryColors = [number | string, number | string];
export type FactionIdentifier = string;

export interface FactionDescription {
  builtin?: boolean;
  id: FactionIdentifier;
  name: string;
  colors: FactoryColors;
  mapColor: number | string;
}

export default class Faction implements FactionDescription {
  builtin?: boolean | undefined;
  id: FactionIdentifier;
  name: string;
  colors: FactoryColors;
  mapColor: number | string;

  constructor({
    builtin,
    id,
    name,
    colors,
    mapColor
  }: Exclude<FactionDescription, 'id'> & {
    id?: FactionIdentifier;
  }) {
    this.builtin = builtin ?? false;
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
      colors: this.colors.map(color => convertColor(color)) as FactoryColors,
      mapColor: convertColor(this.mapColor)
    };
  }
}
