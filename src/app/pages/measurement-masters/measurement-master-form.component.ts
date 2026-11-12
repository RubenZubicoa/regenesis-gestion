import { Component, input, model, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  slugifyMeasurementKey,
  type MeasurementMasterDraft,
} from '../../models/MeasurementMaster';

export const MEASUREMENT_ICON_PRESETS = [
  'body-outline',
  'ellipse-outline',
  'fitness-outline',
  'barbell-outline',
  'resize-outline',
  'analytics-outline',
] as const;

@Component({
  selector: 'app-measurement-master-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './measurement-master-form.component.html',
  styleUrl: './measurement-master-form.component.scss',
})
export class MeasurementMasterFormComponent {
  readonly draft = model.required<MeasurementMasterDraft>();
  readonly syncKeyFromLabel = input(true);
  readonly icons = MEASUREMENT_ICON_PRESETS;

  private readonly keyTouched = signal(false);

  patchLabel(value: string): void {
    this.draft.update((current) => ({
      ...current,
      label: value,
      key:
        this.syncKeyFromLabel() && !this.keyTouched()
          ? slugifyMeasurementKey(value)
          : current.key,
    }));
  }

  patch<K extends keyof MeasurementMasterDraft>(key: K, value: MeasurementMasterDraft[K]): void {
    if (key === 'key') this.keyTouched.set(true);
    this.draft.update((current) => ({ ...current, [key]: value }));
  }
}
