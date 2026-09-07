'use client';

import { createContext, useContext } from 'react';

/**
 * Whether the collection is showing the journal layout. Read it only from the
 * parts of a tile that must change, so switching layouts on a page of hundreds
 * of tiles re-renders a few dozen components rather than every one.
 */
export const JournalViewContext = createContext(false);
export const useJournalView = () => useContext(JournalViewContext);
