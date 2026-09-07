export type PhotoView = 'stacked' | 'grid';

export function isPhotoView(v: string | null | undefined): v is PhotoView {
  return v === 'stacked' || v === 'grid';
}
