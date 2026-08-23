export interface MacroItem {
  key: string;
  label: string;
  shortLabel: string;
  grams: number;
  target: number;
  tone: string;
}

export interface Macros {
  _id: string;
  clientId: string;
  calories: number;
  target: number;
  items: MacroItem[];
}
