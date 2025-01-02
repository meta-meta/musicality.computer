import type {PayloadAction} from '@reduxjs/toolkit';
import {createSlice} from '@reduxjs/toolkit';
import {EditorKeyOffset} from '../lumatone/LumatoneBoard.tsx';
import {MidiChannel} from '../lumatone/lumatoneTypes.ts';
import _ from 'lodash-es';
import {ColorConstructor} from 'colorjs.io';


export type LayerAssignment = {
  id: string,
  isEditing: boolean,
  keys: { [index: string]: EditorKeyOffset },
  layerChannel: MidiChannel,
  layerColor: ColorConstructor,
  layerName: string,
  mappingFnColOffset: number,
  mappingFnName: string,
  mappingFnRowOffset: number,
  order: number,
}

export enum SelectionToolType {
  Box,
}

interface SelectionTool {
  layerAssignmentId: string,
  type: SelectionToolType,
}

// Define a type for the slice state
interface State {
  forceUpdate: boolean;
  layers: { [index: string]: LayerAssignment };
  selectionTool: SelectionTool;
}

// Define the initial state using that type
const initialState: State = {
  forceUpdate: false,
  layers: {},
  selectionTool: {
    layerAssignmentId: '',
    type: SelectionToolType.Box,
  },
};

export const lumatoneEditorSlice = createSlice({
  name: 'counter',
  // `createSlice` will infer the state type from the `initialState` argument
  initialState,
  reducers: {
    forceUpdate: (state) => {
      state.forceUpdate = !state.forceUpdate;
    },
    layerAddOrUpdate: (state, action: PayloadAction<LayerAssignment>) => {
      state.layers[action.payload.id] = action.payload;
    },
    layerRemove: (state, action: PayloadAction<LayerAssignment>) => {
      state.layers = _.omit(state.layers, [action.payload.id]);
    },
    selectionToolSetLayerId: (state, action: PayloadAction<string>) => {
      state.selectionTool.layerAssignmentId = action.payload;
    },
  },
});

export const {
  forceUpdate,
  layerAddOrUpdate,
  layerRemove,
  selectionToolSetLayerId,
} = lumatoneEditorSlice.actions;

// // Other code such as selectors can use the imported `RootState` type
// export const selectCount = (state: RootState) => state.counter.value

export default lumatoneEditorSlice.reducer;