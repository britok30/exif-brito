import { expect, it } from 'vitest';
import { planDestinationMembership } from './destinations';
const album = (id: string, locations: string[]) => ({ id, location: { automaticLocations: locations } });
const photo = (id: string, locationName: string, hidden = false) => ({ id, locationName, hidden, tags: [], takenAt: new Date('2025-08-01') });
it('adds new published Rome photographs without duplicating or reordering existing members', () => {
  const plan = planDestinationMembership([album('rome', ['Rome, Italy'])], [{ albumId: 'rome', photoId: 'existing', sortOrder: 7 }], [photo('new', 'Rome, Italy'), photo('existing', 'Rome, Italy'), photo('draft', 'Rome, Italy', true)]);
  expect(plan).toEqual({ add: [{ albumId: 'rome', photoId: 'new', sortOrder: 8 }], remove: [] });
});
it('supports both a city collection and its regional collection using the full Google label', () => {
  const plan = planDestinationMembership([album('positano', ['Positano, Italy']), album('coast', ['Positano, Italy', 'Amalfi, Italy'])], [], [photo('new', 'Positano, SA, Italy')]);
  expect(plan.add.map(p => p.albumId)).toEqual(['positano', 'coast']);
});
it('moves corrected locations only in automatic destination collections, keeping curated series and hidden members', () => {
  const members = ['rome','custom'].map(albumId => ({ albumId, photoId: 'changed', sortOrder: 0 }));
  members.push({ albumId: 'rome', photoId: 'hidden', sortOrder: 1 });
  const plan = planDestinationMembership([album('rome', ['Rome, Italy']), album('positano', ['Positano, Italy']), { id:'custom',location:null }], members, [photo('changed','Positano, Italy'), photo('hidden','Positano, Italy',true)]);
  expect(plan.remove).toEqual([{ albumId:'rome',photoId:'changed' }]);
  expect(plan.add).toEqual([{ albumId:'positano',photoId:'changed',sortOrder:0 }]);
});
it('does not guess a destination when a city is unknown', () => {
  expect(planDestinationMembership([album('rome',['Rome, Italy'])],[],[photo('unknown','Italy')])).toEqual({add:[],remove:[]});
});
