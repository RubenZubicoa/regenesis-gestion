export interface MeasurementMaster {
  _id: string;
  key: string;
  label: string;
  unit: string;
  icon: string;
}

/** Datos para crear un tipo de medida (sin `_id`). */
export type CreateMeasurementMasterInput = Omit<MeasurementMaster, '_id'>;

/** Datos parciales para actualizar un tipo de medida. */
export type UpdateMeasurementMasterInput = Partial<CreateMeasurementMasterInput>;

export type MeasurementMasterDraft = CreateMeasurementMasterInput;

export function emptyMeasurementMasterDraft(): MeasurementMasterDraft {
  return { key: '', label: '', unit: 'cm', icon: 'body-outline' };
}

export function toMeasurementMasterDraft(master: MeasurementMaster): MeasurementMasterDraft {
  return {
    key: master.key,
    label: master.label,
    unit: master.unit,
    icon: master.icon,
  };
}

export function slugifyMeasurementKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}
