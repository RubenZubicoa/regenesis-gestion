export type FilesAttachmentField = 'meal' | 'workout' | 'shoppingList';

export interface FilesAttachment {
  _id: string;
  clientId: string;
  /** URL del adjunto de comidas en S3. */
  meal: string;
  /** URL del adjunto de entrenamiento en S3. */
  workout: string;
  /** URL del adjunto de lista de la compra en S3. */
  shoppingList: string;
  createdAt: string;
  updatedAt: string;
}

export function filesAttachmentName(url: string | undefined | null): string {
  if (!url?.trim()) return '';
  const clean = url.trim().split('#')[0].split('?')[0];
  try {
    const path = decodeURIComponent(new URL(clean).pathname);
    return path.split('/').filter(Boolean).pop() || 'Archivo adjunto';
  } catch {
    return clean.split('/').filter(Boolean).pop() || 'Archivo adjunto';
  }
}
