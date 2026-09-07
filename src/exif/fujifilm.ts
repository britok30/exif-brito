// MakerNote tag IDs and values adapted from:
// - github.com/exiftool/exiftool/blob/master/lib/Image/ExifTool/FujiFilm.pm
// - exiftool.org/TagNames/FujiFilm.html
import type { ExifData } from 'ts-exif-parser';

export const FUJIFILM_MAKE = 'FUJIFILM';

export const isFujifilmExif = (exif: ExifData) =>
  exif.tags?.Make?.toUpperCase() === FUJIFILM_MAKE;

// --- MakerNote byte-level parser ---

const BYTE_OFFSET_TAG_COUNT = 12;
const BYTE_OFFSET_FIRST_TAG = 14;
const BYTE_OFFSET_TAG_TYPE = 2;
const BYTE_OFFSET_TAG_SIZE = 4;
const BYTE_OFFSET_TAG_VALUE = 8;
const BYTES_PER_TAG = 12;
const BYTES_PER_TAG_VALUE = 4;

type TagVisitor = (tagId: number, numbers: number[]) => void;

export const parseFujifilmMakerNote = (bytes: Uint8Array, visit: TagVisitor) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tagCount = view.getUint16(BYTE_OFFSET_TAG_COUNT, true);

  for (let i = 0; i < tagCount; i++) {
    const index = BYTE_OFFSET_FIRST_TAG + i * BYTES_PER_TAG;
    if (index + BYTES_PER_TAG > bytes.length) continue;

    const tagId = view.getUint16(index, true);
    const tagType = view.getUint16(index + BYTE_OFFSET_TAG_TYPE, true);
    const valueCount = view.getUint16(index + BYTE_OFFSET_TAG_SIZE, true);

    const read = (readOne: (o: number) => number, size: number) => {
      const values: number[] = [];
      if (valueCount * size <= BYTES_PER_TAG_VALUE) {
        for (let j = 0; j < valueCount; j++) {
          values.push(readOne(index + BYTE_OFFSET_TAG_VALUE + j * size));
        }
      } else {
        const offset = view.getUint16(index + BYTE_OFFSET_TAG_VALUE, true);
        for (let j = 0; j < valueCount; j++) {
          values.push(readOne(offset + j * size));
        }
      }
      visit(tagId, values);
    };

    switch (tagType) {
      case 1: read(o => view.getInt8(o), 1); break;
      case 3: read(o => view.getUint16(o, true), 2); break;
      case 4: read(o => view.getUint32(o, true), 4); break;
      case 9: read(o => view.getInt32(o, true), 4); break;
    }
  }
};

// --- Simulation ---

const TAG_ID_SATURATION = 0x1003;
const TAG_ID_FILM_MODE = 0x1401;

export type FujifilmSimulation =
  | 'monochrome' | 'monochrome-ye' | 'monochrome-r' | 'monochrome-g'
  | 'sepia' | 'acros' | 'acros-ye' | 'acros-r' | 'acros-g'
  | 'provia' | 'portrait' | 'portrait-saturation' | 'astia'
  | 'portrait-sharpness' | 'portrait-ex' | 'velvia'
  | 'pro-neg-std' | 'pro-neg-hi' | 'classic-chrome' | 'eterna'
  | 'classic-neg' | 'eterna-bleach-bypass' | 'nostalgic-neg' | 'reala';

const simulationFromSaturation = (value?: number): FujifilmSimulation | undefined => {
  switch (value) {
    case 0x300: return 'monochrome';
    case 0x301: return 'monochrome-r';
    case 0x302: return 'monochrome-ye';
    case 0x303: return 'monochrome-g';
    case 0x310: return 'sepia';
    case 0x500: return 'acros';
    case 0x501: return 'acros-r';
    case 0x502: return 'acros-ye';
    case 0x503: return 'acros-g';
  }
};

const simulationFromFilmMode = (value?: number): FujifilmSimulation | undefined => {
  switch (value) {
    case 0x000: return 'provia';
    case 0x100: return 'portrait';
    case 0x110: return 'portrait-saturation';
    case 0x120: return 'astia';
    case 0x130: return 'portrait-sharpness';
    case 0x300: return 'portrait-ex';
    case 0x200:
    case 0x400: return 'velvia';
    case 0x500: return 'pro-neg-std';
    case 0x501: return 'pro-neg-hi';
    case 0x600: return 'classic-chrome';
    case 0x700: return 'eterna';
    case 0x800: return 'classic-neg';
    case 0x900: return 'eterna-bleach-bypass';
    case 0xa00: return 'nostalgic-neg';
    case 0xb00: return 'reala';
  }
};

const FUJIFILM_SIMULATION_LABELS: Record<FujifilmSimulation, string> = {
  'monochrome': 'Monochrome',
  'monochrome-ye': 'Monochrome + Ye',
  'monochrome-r': 'Monochrome + R',
  'monochrome-g': 'Monochrome + G',
  'sepia': 'Sepia',
  'acros': 'ACROS',
  'acros-ye': 'ACROS + Ye',
  'acros-r': 'ACROS + R',
  'acros-g': 'ACROS + G',
  'provia': 'PROVIA / Standard',
  'portrait': 'Portrait',
  'portrait-saturation': 'Portrait Saturation',
  'astia': 'ASTIA / Soft',
  'portrait-sharpness': 'Portrait Sharpness',
  'portrait-ex': 'Portrait Ex',
  'velvia': 'Velvia / Vivid',
  'pro-neg-std': 'PRO Neg. Std',
  'pro-neg-hi': 'PRO Neg. Hi',
  'classic-chrome': 'Classic Chrome',
  'eterna': 'ETERNA / Cinema',
  'classic-neg': 'Classic Neg.',
  'eterna-bleach-bypass': 'ETERNA Bleach Bypass',
  'nostalgic-neg': 'Nostalgic Neg.',
  'reala': 'REALA ACE',
};

export const labelForFujifilmSimulation = (film: string): string =>
  FUJIFILM_SIMULATION_LABELS[film as FujifilmSimulation] ?? film;

export const getFujifilmSimulation = (makerNote: Uint8Array): FujifilmSimulation | undefined => {
  let fromSat: FujifilmSimulation | undefined;
  let fromMode: FujifilmSimulation | undefined;
  parseFujifilmMakerNote(makerNote, (tag, nums) => {
    if (tag === TAG_ID_SATURATION) fromSat = simulationFromSaturation(nums[0]);
    else if (tag === TAG_ID_FILM_MODE) fromMode = simulationFromFilmMode(nums[0]);
  });
  return fromSat ?? fromMode;
};

// --- Recipe ---

const TAG_ID_DYNAMIC_RANGE = 0x1400;
const TAG_ID_DYNAMIC_RANGE_SETTING = 0x1402;
const TAG_ID_DEVELOPMENT_DYNAMIC_RANGE = 0x1403;
const TAG_ID_WHITE_BALANCE = 0x1002;
const TAG_ID_WHITE_BALANCE_FINE_TUNE = 0x100a;
const TAG_ID_WHITE_BALANCE_COLOR_TEMPERATURE = 0x1005;
const TAG_ID_NOISE_REDUCTION = 0x100e;
const TAG_ID_NOISE_REDUCTION_BASIC = 0x100b;
const TAG_ID_HIGHLIGHT = 0x1041;
const TAG_ID_SHADOW = 0x1040;
const TAG_ID_SHARPNESS = 0x1001;
const TAG_ID_CLARITY = 0x100f;
const TAG_ID_COLOR_CHROME_EFFECT = 0x1048;
const TAG_ID_COLOR_CHROME_FX_BLUE = 0x104e;
const TAG_ID_GRAIN_EFFECT_ROUGHNESS = 0x1047;
const TAG_ID_GRAIN_EFFECT_SIZE = 0x104c;
const TAG_ID_BW_ADJUSTMENT = 0x1049;
const TAG_ID_BW_MAGENTA_GREEN = 0x104b;

type WeakStrong = 'off' | 'weak' | 'strong';

export interface FujifilmRecipe {
  dynamicRange: {
    range: 'standard' | 'wide';
    setting: 'auto' | 'manual' | 'standard' | 'wide-1' | 'wide-2' | 'film-simulation';
    development: number;
  };
  whiteBalance: {
    type: string;
    colorTemperature?: number;
    red: number;
    blue: number;
  };
  highISONoiseReduction?: number;
  noiseReductionBasic?: string;
  highlight?: number;
  shadow?: number;
  color?: number;
  sharpness?: number;
  clarity?: number;
  colorChromeEffect?: WeakStrong;
  colorChromeFXBlue?: WeakStrong;
  grainEffect: {
    roughness: WeakStrong;
    size: 'off' | 'small' | 'large';
  };
  bwAdjustment?: number;
  bwMagentaGreen?: number;
}

export const processTone = (value: number) => (value === 0 ? 0 : -(value / 16));

export const processSaturation = (value: number) => {
  switch (value) {
    case 0x4e0: return -4;
    case 0x4c0: return -3;
    case 0x400: return -2;
    case 0x180: return -1;
    case 0x80:  return 1;
    case 0x100: return 2;
    case 0xc0:  return 3;
    case 0xe0:  return 4;
    default:    return 0;
  }
};

export const processNoiseReduction = (value: number) => {
  switch (value) {
    case 0x2e0: return -4;
    case 0x2c0: return -3;
    case 0x200: return -2;
    case 0x280: return -1;
    case 0x180: return 1;
    case 0x100: return 2;
    case 0x1c0: return 3;
    case 0x1e0: return 4;
    default:    return 0;
  }
};

export const processNoiseReductionLegacy = (value: number) => {
  switch (value) {
    case 0x40: return 'low';
    case 0x80: return 'normal';
    default:   return 'n/a';
  }
};

export const processSharpness = (value: number) => {
  switch (value) {
    case 0x0:  return -4;
    case 0x1:  return -3;
    case 0x2:  return -2;
    case 0x82: return -1;
    case 0x84: return 1;
    case 0x4:  return 2;
    case 0x5:  return 3;
    case 0x6:  return 4;
    default:   return 0;
  }
};

export const processClarity = (value: number) => value / 1000;

export const processWeakStrong = (value: number): WeakStrong => {
  switch (value) {
    case 32: return 'weak';
    case 64: return 'strong';
    default: return 'off';
  }
};

export const processGrainSize = (
  value: number,
): FujifilmRecipe['grainEffect']['size'] => {
  switch (value) {
    case 16: return 'small';
    case 32: return 'large';
    default: return 'off';
  }
};

export const processWhiteBalanceType = (value: number) => {
  switch (value) {
    case 0x1:   return 'auto-white-priority';
    case 0x2:   return 'auto-ambiance-priority';
    case 0x100: return 'daylight';
    case 0x200: return 'cloudy';
    case 0x300: return 'daylight-fluorescent';
    case 0x301: return 'day-white-fluorescent';
    case 0x302: return 'white-fluorescent';
    case 0x303: return 'warm-white-fluorescent';
    case 0x304: return 'living-room-warm-white-fluorescent';
    case 0x400: return 'incandescent';
    case 0x500: return 'flash';
    case 0x600: return 'underwater';
    case 0xf00: return 'custom';
    case 0xf01: return 'custom-2';
    case 0xf02: return 'custom-3';
    case 0xf03: return 'custom-4';
    case 0xf04: return 'custom-5';
    case 0xff0: return 'kelvin';
    default:    return 'auto';
  }
};

export const processDynamicRangeSetting = (
  value: number,
): FujifilmRecipe['dynamicRange']['setting'] => {
  switch (value) {
    case 0x001:  return 'manual';
    case 0x100:  return 'standard';
    case 0x200:
    case 0x201:  return 'wide-1';
    case 0x8000: return 'film-simulation';
    default:     return 'auto';
  }
};

export const processWhiteBalanceComponent = (value: number) => value / 20;

export const getFujifilmRecipe = (makerNote: Uint8Array): FujifilmRecipe => {
  const recipe: FujifilmRecipe = {
    dynamicRange: { range: 'standard', setting: 'auto', development: 100 },
    whiteBalance: { type: 'auto', red: 0, blue: 0 },
    grainEffect: { roughness: 'off', size: 'off' },
  };

  parseFujifilmMakerNote(makerNote, (tag, nums) => {
    switch (tag) {
      case TAG_ID_DYNAMIC_RANGE:
        recipe.dynamicRange.range = nums[0] === 3 ? 'wide' : 'standard';
        break;
      case TAG_ID_DYNAMIC_RANGE_SETTING:
        recipe.dynamicRange.setting = processDynamicRangeSetting(nums[0]);
        break;
      case TAG_ID_DEVELOPMENT_DYNAMIC_RANGE:
        recipe.dynamicRange.development = nums[0];
        break;
      case TAG_ID_WHITE_BALANCE:
        recipe.whiteBalance.type = processWhiteBalanceType(nums[0]);
        break;
      case TAG_ID_WHITE_BALANCE_FINE_TUNE:
        recipe.whiteBalance.red = processWhiteBalanceComponent(nums[0]);
        recipe.whiteBalance.blue = processWhiteBalanceComponent(nums[1]);
        break;
      case TAG_ID_WHITE_BALANCE_COLOR_TEMPERATURE:
        recipe.whiteBalance.colorTemperature = nums[0];
        break;
      case TAG_ID_NOISE_REDUCTION:
        recipe.highISONoiseReduction = processNoiseReduction(nums[0]);
        break;
      case TAG_ID_NOISE_REDUCTION_BASIC:
        recipe.noiseReductionBasic = processNoiseReductionLegacy(nums[0]);
        break;
      case TAG_ID_HIGHLIGHT: recipe.highlight = processTone(nums[0]); break;
      case TAG_ID_SHADOW:    recipe.shadow = processTone(nums[0]); break;
      case TAG_ID_SATURATION: recipe.color = processSaturation(nums[0]); break;
      case TAG_ID_SHARPNESS: recipe.sharpness = processSharpness(nums[0]); break;
      case TAG_ID_CLARITY:   recipe.clarity = processClarity(nums[0]); break;
      case TAG_ID_COLOR_CHROME_EFFECT:
        recipe.colorChromeEffect = processWeakStrong(nums[0]); break;
      case TAG_ID_COLOR_CHROME_FX_BLUE:
        recipe.colorChromeFXBlue = processWeakStrong(nums[0]); break;
      case TAG_ID_GRAIN_EFFECT_ROUGHNESS:
        recipe.grainEffect.roughness = processWeakStrong(nums[0]); break;
      case TAG_ID_GRAIN_EFFECT_SIZE:
        recipe.grainEffect.size = processGrainSize(nums[0]); break;
      case TAG_ID_BW_ADJUSTMENT:   recipe.bwAdjustment = nums[0]; break;
      case TAG_ID_BW_MAGENTA_GREEN: recipe.bwMagentaGreen = nums[0]; break;
    }
  });

  return recipe;
};
