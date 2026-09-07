export interface ViewTransform { scale: number; x: number; y: number }
export interface ViewSize { width: number; height: number; imageWidth: number; imageHeight: number }
export const FIT: ViewTransform = { scale: 1, x: 0, y: 0 };
export function constrainView(view: ViewTransform, size: ViewSize): ViewTransform {
  const scale = Math.max(1, Math.min(4, view.scale));
  const fit = Math.min(size.width / size.imageWidth, size.height / size.imageHeight);
  const limitX = Math.max(0, (size.imageWidth * fit * scale - size.width) / 2);
  const limitY = Math.max(0, (size.imageHeight * fit * scale - size.height) / 2);
  return { scale, x: Math.max(-limitX, Math.min(limitX, view.x)) || 0, y: Math.max(-limitY, Math.min(limitY, view.y)) || 0 };
}
/** Coordinates are relative to the center of the fitted image. */
export function zoomView(view: ViewTransform, scale: number, anchor: { x: number; y: number }, size: ViewSize): ViewTransform {
  const target = Math.max(1, Math.min(4, scale));
  const ratio = target / view.scale;
  return constrainView({ scale: target, x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio }, size);
}
export function swipeDirection(dx: number, dy: number, scale: number, pinched: boolean): -1 | 0 | 1 {
  return !pinched && scale <= 1.01 && Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5 ? (dx < 0 ? 1 : -1) : 0;
}
