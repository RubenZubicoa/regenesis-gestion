export interface SupplementElement {
  name: string;
  dose: string;
  when: string;
  icon: string;
}

export interface Supplements {
  _id: string;
  clientId: string;
  elements: SupplementElement[];
}
