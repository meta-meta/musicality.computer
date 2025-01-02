import type {PayloadAction} from '@reduxjs/toolkit';
import {createSlice} from '@reduxjs/toolkit';

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
  inputs: { label: string, value: string, group: string }[];
  lumatoneIn: string | null;
  lumatoneOut: string | null;
  midiStatus: MidiStatus;
  outputs: { label: string, value: string, group: string }[];
}

// Define the initial state using that type
const initialState: State = {
  beatClockIn: null,
  inputs: [],
  lumatoneIn: null,
  lumatoneOut: null,
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