import { configureStore } from '@reduxjs/toolkit'
import {rootReducer} from './rootReducer.ts';
import {LUMATONE_COMPOSITIONS_STORAGE_KEY} from './lumatoneChordComposerReducer.ts';

export const store = configureStore({
  reducer: rootReducer,
})

let lastPersistedComposerState = '';
store.subscribe(() => {
  if (typeof window === 'undefined') return;

  const {compositions, selectedCompositionId} = store.getState().lumatoneChordComposer;
  const serialized = JSON.stringify({compositions, selectedCompositionId});
  if (serialized === lastPersistedComposerState) return;

  window.localStorage.setItem(LUMATONE_COMPOSITIONS_STORAGE_KEY, serialized);
  lastPersistedComposerState = serialized;
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
