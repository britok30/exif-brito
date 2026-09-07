import { expect, it } from 'vitest';
import { formatCaptureDate, formatExposureTime } from './format';

it('formats long and fractional exposures without rounding long exposures to 1/0s', () => {
  expect(formatExposureTime(30)).toBe('30s');
  expect(formatExposureTime(1.3)).toBe('1.3s');
  expect(formatExposureTime(1 / 250)).toBe('1/250s');
  expect(formatExposureTime(0)).toBeUndefined();
});
it('keeps the original camera calendar date', () => {
  expect(formatCaptureDate({ takenAtNaive: '2023-12-31T23:30:00' })).toBe('December 31, 2023');
});
