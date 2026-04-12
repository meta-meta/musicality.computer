import type {PayloadAction} from '@reduxjs/toolkit';
import {createSlice} from '@reduxjs/toolkit';
import type {LumatoneChordData} from '../lumatone/lumatoneTypes.ts';

export interface LumatonePanel extends LumatoneChordData {
  id: string;
}

interface LumatoneChordComposerState {
  cursor: number;
  sequence: LumatonePanel[];
}

const initialState: LumatoneChordComposerState = {
  cursor: 0,
  sequence: [],
};

function newPanel(chord: LumatoneChordData): LumatonePanel {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    ...chord,
  };
}

function newBlankPanel(): LumatonePanel {
  return newPanel({
    root: 60,
    intervals: [],
    fromIntervals: [],
    fromRootInterval: [0, 0],
  });
}

function isCursorInRange(state: LumatoneChordComposerState) {
  return state.cursor >= 0 && state.cursor < state.sequence.length;
}

export const lumatoneChordComposerSlice = createSlice({
  name: 'lumatoneChordComposer',
  initialState,
  reducers: {
    cursorPrevious: (state) => {
      state.cursor = Math.max(0, state.cursor - 1);
    },
    cursorNext: (state) => {
      state.cursor = Math.min(state.sequence.length, state.cursor + 1);
    },
    cursorSet: (state, action: PayloadAction<number>) => {
      state.cursor = Math.max(0, Math.min(action.payload, state.sequence.length));
    },
    chordAdd: (state, action: PayloadAction<LumatoneChordData>) => {
      state.sequence.push(newPanel(action.payload));
      state.cursor = state.sequence.length;
    },
    chordRemove: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (index < 0 || index >= state.sequence.length) return;
      state.sequence.splice(index, 1);
      if (state.cursor > index) {
        state.cursor = state.cursor - 1;
      }
      state.cursor = Math.max(0, Math.min(state.cursor, state.sequence.length));
    },
    chordReplace: (state, action: PayloadAction<{index: number; chord: LumatoneChordData}>) => {
      const {index, chord} = action.payload;
      if (index < 0 || index >= state.sequence.length) return;
      state.sequence[index] = {
        id: state.sequence[index].id,
        ...chord,
      };
    },
    blankPanelInsertBeforeSelected: (state) => {
      const insertAt = Math.max(0, Math.min(state.cursor, state.sequence.length));
      state.sequence.splice(insertAt, 0, newBlankPanel());
      state.cursor = insertAt;
    },
    chordDeleteSelected: (state) => {
      if (!isCursorInRange(state)) return;
      const index = state.cursor;
      state.sequence.splice(index, 1);
      state.cursor = Math.max(0, Math.min(index, state.sequence.length));
    },
    chordAddOrReplaceAtCursor: (state, action: PayloadAction<LumatoneChordData>) => {
      const chord = action.payload;
      if (!isCursorInRange(state)) {
        state.sequence.push(newPanel(chord));
        state.cursor = state.sequence.length;
        return;
      }
      state.sequence[state.cursor] = {
        id: state.sequence[state.cursor].id,
        ...chord,
      };
    },
  },
});

export const {
  cursorNext,
  cursorPrevious,
  cursorSet,
  blankPanelInsertBeforeSelected,
  chordAdd,
  chordAddOrReplaceAtCursor,
  chordDeleteSelected,
  chordRemove,
  chordReplace,
} = lumatoneChordComposerSlice.actions;

export default lumatoneChordComposerSlice.reducer;
