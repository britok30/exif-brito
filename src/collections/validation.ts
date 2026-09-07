export function parseCollection(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.title !== 'string' || !v.title.trim() || v.title.trim().length > 255 ||
      typeof v.slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(v.slug) || v.slug.length > 120 ||
      typeof v.description !== 'string' || v.description.length > 5000 ||
      !Array.isArray(v.photoIds) || !v.photoIds.length || v.photoIds.length > 2000 ||
      v.photoIds.some(id => typeof id !== 'string' || !/^[a-z0-9]{8}$/i.test(id)) ||
      new Set(v.photoIds).size !== v.photoIds.length) return null;
  return { title: v.title.trim(), slug: v.slug, description: v.description.trim(), photoIds: v.photoIds as string[] };
}
export function collectionSlug(title: string) {
  return title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120).replace(/-$/, '');
}
