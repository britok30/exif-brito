export const SITE_URL = 'https://www.kelbrxto.com';
export const SITE_NAME = 'Brito';
export const SITE_TITLE = 'Brito — A Photographic Journal';
export const SITE_DESCRIPTION = 'A photographic journal by Brito. Travel, street scenes, landscapes, and quiet moments, collected across cities and coastlines.';
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString();
export const serializeJsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');
