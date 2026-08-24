export interface SupplementElement {
  name: string;
  dose: string;
  when: string;
  icon: string;
  /** Enlace opcional sugerido por el entrenador para comprar el producto. */
  purchaseLink?: string;
}

export interface Supplements {
  _id: string;
  clientId: string;
  elements: SupplementElement[];
}
