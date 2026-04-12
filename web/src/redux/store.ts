import { configureStore } from '@reduxjs/toolkit'
import {rootReducer} from './rootReducer.ts';
import {LUMATONE_COMPOSITIONS_STORAGE_KEY} from './lumatoneChordComposerReducer.ts';
import {LUMATONE_EDITOR_LAYERS_STORAGE_KEY} from './lumatoneEditorReducer.ts';
import {MIDI_SELECTIONS_STORAGE_KEY} from './midiReducer.ts';

export const store = configureStore({
  reducer: rootReducer,
})

let lastPersistedComposerState = '';
let lastPersistedEditorLayers = '';
let lastPersistedMidiSelections = '';
store.subscribe(() => {
  if (typeof window === 'undefined') return;

  const {compositions, selectedCompositionId} = store.getState().lumatoneChordComposer;
  const serializedComposer = JSON.stringify({compositions, selectedCompositionId});
  if (serializedComposer !== lastPersistedComposerState) {
    window.localStorage.setItem(LUMATONE_COMPOSITIONS_STORAGE_KEY, serializedComposer);
    lastPersistedComposerState = serializedComposer;
  }

  const {layers} = store.getState().lumatoneEditor;
  const serializedEditorLayers = JSON.stringify({layers});
  if (serializedEditorLayers !== lastPersistedEditorLayers) {
    window.localStorage.setItem(LUMATONE_EDITOR_LAYERS_STORAGE_KEY, serializedEditorLayers);
    lastPersistedEditorLayers = serializedEditorLayers;
  }

  const {lumatoneIn, lumatoneOut} = store.getState().midi;
  const serializedMidiSelections = JSON.stringify({lumatoneIn, lumatoneOut});
  if (serializedMidiSelections !== lastPersistedMidiSelections) {
    window.localStorage.setItem(MIDI_SELECTIONS_STORAGE_KEY, serializedMidiSelections);
    lastPersistedMidiSelections = serializedMidiSelections;
  }
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch
