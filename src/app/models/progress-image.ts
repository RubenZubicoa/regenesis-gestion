export const PROGRESS_IMAGE_POSES = ['De frente', 'Lateral', 'De espaldas'] as const;

export type ProgressImagePose = (typeof PROGRESS_IMAGE_POSES)[number];

export function isProgressImagePose(value: unknown): value is ProgressImagePose {
  return typeof value === 'string' && (PROGRESS_IMAGE_POSES as readonly string[]).includes(value);
}

export interface ProgressImage {
  _id: string;
  clientId: string;
  image: string;
  pose?: ProgressImagePose;
  createdAt: string;
  updatedAt?: string;
}
