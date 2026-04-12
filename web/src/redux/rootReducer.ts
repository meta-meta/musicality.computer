import midiReducer from './midiReducer.ts';
import lumatoneEditorReducer from './lumatoneEditorReducer.ts';
import lumatoneChordComposerReducer from './lumatoneChordComposerReducer.ts';

export const rootReducer = {
  lumatoneEditor: lumatoneEditorReducer,
  lumatoneChordComposer: lumatoneChordComposerReducer,
  midi: midiReducer,
}
