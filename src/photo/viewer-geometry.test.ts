import { expect, it } from 'vitest';
import { FIT, constrainView, zoomView, swipeDirection } from './viewer-geometry';
const size = { width: 400, height: 600, imageWidth: 800, imageHeight: 1200 };
it('keeps pinch anchors stationary and clamps zoom limits', () => {
  expect(zoomView(FIT, 2, { x: 50, y: 80 }, size)).toEqual({ scale: 2, x: -50, y: -80 });
  expect(zoomView(FIT, 9, { x: 0, y: 0 }, size).scale).toBe(4);
  expect(zoomView({ scale: 2, x: 80, y: -120 }, 0.5, { x: 30, y: 20 }, size)).toEqual(FIT);
});
it('prevents panning past image edges, including letterboxed photographs', () => {
  expect(constrainView({ scale: 2, x: 900, y: -900 }, size)).toEqual({ scale: 2, x: 200, y: -300 });
  expect(constrainView({ scale: 2, x: 50, y: 100 }, { ...size, imageWidth: 1600, imageHeight: 400 }).y).toBe(0);
});
it('distinguishes swipes from vertical movement, taps, pans and pinches', () => {
  expect(swipeDirection(-100, 10, 1, false)).toBe(1);
  expect(swipeDirection(100, 10, 1, false)).toBe(-1);
  for (const [x,y,scale,pinched] of [[20,0,1,false],[80,100,1,false],[100,0,2,false],[100,0,1,true]] as const) expect(swipeDirection(x,y,scale,pinched)).toBe(0);
});
