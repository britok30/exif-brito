import { expect, it, vi } from 'vitest';
vi.mock('@/photo/query', () => ({ getPhotos: vi.fn(async () => [
  { id: 'aaaaaaa1', title: 'Fish & <Chips>', locationName: 'Lisbon, Portugal', tags: ['food'], caption: null, semanticDescription: 'A plate',
    url: 'https://test-bucket.s3.us-east-2.amazonaws.com/photos/one.jpg', thumbnailUrl: 'https://test-bucket.s3.us-east-2.amazonaws.com/photos/thumb/one.jpg',
    width: 3000, height: 2000, takenAt: new Date('2024-05-01T10:00:00Z'), takenAtNaive: '2024-05-01T10:00:00', createdAt: new Date('2024-05-02T10:00:00Z'), excludeFromFeeds: false },
  { id: 'aaaaaaa2', title: 'Private', excludeFromFeeds: true, tags: [], takenAt: new Date(), takenAtNaive: '2024-01-01T00:00:00', url: 'x', thumbnailUrl: null },
]) }));
import { GET } from './route';

it('publishes escaped RSS without excluded photographs or storage URLs', async () => {
  const response = await GET();
  const xml = await response.text();
  expect(response.headers.get('content-type')).toContain('application/rss+xml');
  expect(xml).toContain('<title>Fish &amp; &lt;Chips&gt;</title>');
  expect(xml).toContain('<link>https://www.kelbrxto.com/p/aaaaaaa1</link>');
  expect(xml).not.toContain('Private');
  expect(xml).not.toContain('amazonaws');
  expect(xml).toContain('<category>food</category>');
});
