import { expect, it } from 'vitest';
import { formatCameraMake, formatCameraName } from './camera';

it('names cameras the way people say them', () => {
  expect(formatCameraName('FUJIFILM', 'X100VI')).toBe('Fujifilm X100VI');
  expect(formatCameraName('LEICA CAMERA AG', 'LEICA Q2')).toBe('Leica Q2');
  expect(formatCameraName('NIKON CORPORATION', 'NIKON Z 6')).toBe('Nikon Z 6');
  expect(formatCameraName('NIKON CORPORATION', 'NIKON D750')).toBe('Nikon D750');
  expect(formatCameraName('Apple', 'iPhone 12 Pro Max')).toBe('iPhone 12 Pro Max');
  expect(formatCameraName('SONY', 'ILCE-7M4')).toBe('Sony ILCE-7M4');
  expect(formatCameraName('OM Digital Solutions', 'OM-1')).toBe('OM System OM-1');
});

it('copes with partial or unknown data', () => {
  expect(formatCameraName(null, null)).toBeUndefined();
  expect(formatCameraName('FUJIFILM', null)).toBe('Fujifilm');
  expect(formatCameraName(null, 'X100VI')).toBe('X100VI');
  expect(formatCameraMake('SOME MAKER CO., LTD.')).toBe('Some maker');
  expect(formatCameraMake('Insta360')).toBe('Insta360');
});
