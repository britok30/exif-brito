export interface SearchEntry {
  id: string;
  name: string;
  subtitle: string;
  keywords: string;
  path: string;
  section: 'Photographs' | 'Collections';
  /** Proxy path of a small rendition, or null when none is available. */
  image: string | null;
}
