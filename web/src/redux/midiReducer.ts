import type {PayloadAction} from '@reduxjs/toolkit';
import {createSlice} from '@reduxjs/toolkit';
import {createListCollection, ListCollection} from '@chakra-ui/react';

export enum MidiStatus {
  Idle,
  Connecting,
  Connected,
  Unauthorized,
}

// Define a type for the slice state
interface MidiState {
  beatClockIn: string | null;
  inputs: ListCollection<{ label: string, value: string, group: string }>;
  lumatoneIn: string | null;
  lumatoneOut: string | null;
  midiStatus: MidiStatus;
  outputs: ListCollection<{ label: string, value: string, group: string }>;
}

// Define the initial state using that type
const initialState: MidiState = {
  beatClockIn: null,
  inputs: createListCollection({
    items: [],
  }),
  lumatoneIn: null,
  lumatoneOut: null,
  midiStatus: MidiStatus.Idle,
  outputs: createListCollection({
    items: [],
  }),
};

export const midiSlice = createSlice({
  name: 'counter',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    inputsSet: (state, action: PayloadAction<ListCollection>) => {
      state.inputs = action.payload;
    },
    outputsSet: (state, action: PayloadAction<ListCollection>) => {
      state.outputs = action.payload;
    },
    beatClockInSet: (state, action: PayloadAction<string>) => {
      state.beatClockIn = action.payload;
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
  inputsSet,
  lumatoneInSet,
  lumatoneOutSet,
  midiStatusSet,
  outputsSet,
} = midiSlice.actions;

// // Other code such as selectors can use the imported `RootState` type
// export const selectCount = (state: RootState) => state.counter.value

export default midiSlice.reducer;