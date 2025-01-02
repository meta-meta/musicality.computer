import midiReducer from './midiReducer.ts';
import lumatoneEditorReducer from './lumatoneEditorReducer.ts';

export const rootReducer = {
  lumatoneEditor: lumatoneEditorReducer,
  midi: midiReducer,
}