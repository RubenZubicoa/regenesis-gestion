import { todayIsoDate } from './weight';

export const PROGRESS_IMAGE_POSES = ['De frente', 'Lateral', 'De espaldas'] as const;

export type ProgressImagePose = (typeof PROGRESS_IMAGE_POSES)[number];

export function isProgressImagePose(value: unknown): value is ProgressImagePose {
  return typeof value === 'string' && (PROGRESS_IMAGE_POSES as readonly string[]).includes(value);
}

export function progressImageDateInput(iso?: string | null): string {
  const raw = iso?.trim() ?? '';
  if (!raw) return todayIsoDate();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const date = new Date(raw.includes('T') ? raw : `${raw.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(date.getTime())) return todayIsoDate();

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export interface ProgressImage {
  _id: string;
  clientId: string;
  image: string;
  pose?: ProgressImagePose;
  /** Día en que se tomó la foto (YYYY-MM-DD). */
  date?: string;
  createdAt: string;
  updatedAt?: string;
}

export function progressImageTakenAt(image: Pick<ProgressImage, 'date' | 'createdAt'>): string {
  return progressImageDateInput(image.date || image.createdAt);
}
