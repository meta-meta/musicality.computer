import type {PayloadAction} from '@reduxjs/toolkit';
import {createSlice} from '@reduxjs/toolkit';

export const MIDI_SELECTIONS_STORAGE_KEY = 'midi.selections.v1';

export enum MidiStatus {
  Idle,
  Initializing,
  Enabled,
  Unauthorized,
  NoDevicesFound,
}

// Define a type for the slice state
interface State {
  beatClockIn: string | null;
  ewiIn: string | null;
  inputs: { label: string, value: string, group: string }[];
  lumatoneIn: string | null;
  lumatoneOut: string | null;
  midiStatus: MidiStatus;
  outputs: { label: string, value: string, group: string }[];
}

type PersistedMidiSelections = {
  ewiIn?: string | null;
  lumatoneIn?: string | null;
  lumatoneOut?: string | null;
};

function loadPersistedMidiSelections(): PersistedMidiSelections {
  if (typeof window === 'undefined') return {};
  const raw = window.localStorage.getItem(MIDI_SELECTIONS_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as PersistedMidiSelections;
    return {
      ewiIn: parsed.ewiIn ?? null,
      lumatoneIn: parsed.lumatoneIn ?? null,
      lumatoneOut: parsed.lumatoneOut ?? null,
    };
  } catch {
    return {};
  }
}

const persistedSelections = loadPersistedMidiSelections();

// Define the initial state using that type
const initialState: State = {
  beatClockIn: null,
  ewiIn: persistedSelections.ewiIn ?? null,
  inputs: [],
  lumatoneIn: persistedSelections.lumatoneIn ?? null,
  lumatoneOut: persistedSelections.lumatoneOut ?? null,
  midiStatus: MidiStatus.Idle,
  outputs: [],
};

export const midiSlice = createSlice({
  name: 'counter',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    inputsSet: (state, action: PayloadAction<{ label: string, value: string, group: string }[]>) => {
      state.inputs = action.payload;
    },
    outputsSet: (state, action: PayloadAction<{ label: string, value: string, group: string }[]>) => {
      state.outputs = action.payload;
    },
    beatClockInSet: (state, action: PayloadAction<string>) => {
      state.beatClockIn = action.payload;
    },
    ewiInSet: (state, action: PayloadAction<string>) => {
      state.ewiIn = action.payload;
    },
    lumatoneInSet: (state, action: PayloadAction<string>) => {
      state.lumatoneIn = action.payload;
    },
    lumatoneOutSet: (state, action: PayloadAction<string>) => {
      state.lumatoneOut = action.payload;
    },
    midiStatusSet: (state, action: PayloadAction<MidiStatus>) => {
      state.midiStatus = action.payload;
    },
  },
});

export const {
  beatClockInSet,
  ewiInSet,
  inputsSet,
  lumatoneInSet,
  lumatoneOutSet,
  midiStatusSet,
  outputsSet,
} = midiSlice.actions;

// // Other code such as selectors can use the imported `RootState` type
// export const selectCount = (state: RootState) => state.counter.value

export default midiSlice.reducer;
