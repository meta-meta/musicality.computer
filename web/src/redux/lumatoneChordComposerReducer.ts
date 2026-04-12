import type {PayloadAction} from '@reduxjs/toolkit';
import {createSlice} from '@reduxjs/toolkit';
import type {LumatoneChordData} from '../lumatone/lumatoneTypes.ts';

export const LUMATONE_COMPOSITIONS_STORAGE_KEY = 'lumatoneChordComposer.compositions.v1';

export interface LumatonePanel extends LumatoneChordData {
  id: string;
}

export interface LumatoneComposition {
  id: string;
  name: string;
  sequence: LumatonePanel[];
  updatedAt: number;
}

interface LumatoneChordComposerState {
  compositions: LumatoneComposition[];
  cursor: number;
  selectedCompositionId: string | null;
  sequence: LumatonePanel[];
}

type PersistedLumatoneChordComposerState = {
  compositions?: LumatoneComposition[];
  selectedCompositionId?: string | null;
};

function clonePanel(panel: LumatonePanel): LumatonePanel {
  return {
    ...panel,
    intervals: panel.intervals.map(([q, r]) => [q, r]),
    fromIntervals: panel.fromIntervals?.map(([q, r]) => [q, r]),
    fromRootInterval: panel.fromRootInterval ? [...panel.fromRootInterval] : undefined,
    intervalNextRoot: panel.intervalNextRoot ? [...panel.intervalNextRoot] : undefined,
  };
}

function cloneSequence(sequence: LumatonePanel[]): LumatonePanel[] {
  return sequence.map(clonePanel);
}

function loadPersistedState(): PersistedLumatoneChordComposerState {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(LUMATONE_COMPOSITIONS_STORAGE_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as PersistedLumatoneChordComposerState;
    return {
      compositions: Array.isArray(parsed.compositions) ? parsed.compositions : [],
      selectedCompositionId: parsed.selectedCompositionId ?? null,
    };
  } catch {
    return {};
  }
}

const persisted = loadPersistedState();

const initialState: LumatoneChordComposerState = {
  compositions: persisted.compositions ?? [],
  cursor: 0,
  selectedCompositionId: persisted.selectedCompositionId ?? null,
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
    compositionSelect: (state, action: PayloadAction<string | null>) => {
      const id = action.payload;
      if (!id) {
        state.selectedCompositionId = null;
        return;
      }
      const composition = state.compositions.find(c => c.id === id);
      if (!composition) return;

      state.selectedCompositionId = id;
      state.sequence = cloneSequence(composition.sequence);
      state.cursor = state.sequence.length;
    },
    compositionNewDraft: (state) => {
      state.selectedCompositionId = null;
      state.sequence = [];
      state.cursor = 0;
    },
    compositionForkFromCurrent: (state) => {
      state.selectedCompositionId = null;
      state.cursor = Math.max(0, Math.min(state.cursor, state.sequence.length));
    },
    compositionSave: (state, action: PayloadAction<{name: string}>) => {
      const name = action.payload.name.trim() || 'Untitled';
      const now = Date.now();
      const savedSequence = cloneSequence(state.sequence);

      const existingIndex = state.selectedCompositionId
        ? state.compositions.findIndex(c => c.id === state.selectedCompositionId)
        : -1;

      if (existingIndex >= 0) {
        state.compositions[existingIndex] = {
          ...state.compositions[existingIndex],
          name,
          sequence: savedSequence,
          updatedAt: now,
        };
        return;
      }

      const id = `${now}-${Math.random().toString(36).slice(2, 10)}`;
      state.compositions.push({
        id,
        name,
        sequence: savedSequence,
        updatedAt: now,
      });
      state.selectedCompositionId = id;
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
  compositionForkFromCurrent,
  compositionNewDraft,
  compositionSave,
  compositionSelect,
  blankPanelInsertBeforeSelected,
  chordAdd,
  chordAddOrReplaceAtCursor,
  chordDeleteSelected,
  chordRemove,
  chordReplace,
} = lumatoneChordComposerSlice.actions;

export default lumatoneChordComposerSlice.reducer;
