import {useEffect} from 'react';
import {Input, Output, WebMidi} from 'webmidi';
import {useAppDispatch} from './redux/hooks.ts';
import {inputsSet, MidiStatus, midiStatusSet, outputsSet} from './redux/midiReducer.ts';

export function useMidiInitialization() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const initMidi = async () => {
      dispatch(midiStatusSet(MidiStatus.Initializing));

      try {
        await WebMidi.enable({sysex: true});

      } catch (error) {
        dispatch(midiStatusSet(MidiStatus.Unauthorized));
        return;
      }

      const {inputs, outputs} = WebMidi;

      const options = (devices: Input[] | Output[]) => devices.map(i => ({
        label: i.name,
        value: i.id,
        group: (i.name.startsWith('LM-') || i.name === 'BeatClock') ? '» LoopMIDI' : '» PhysicalDevices',
      }));

      dispatch(inputsSet(options(inputs)));
      dispatch(outputsSet(options(outputs)));
      dispatch(midiStatusSet(inputs.length + outputs.length > 0
        ? MidiStatus.Enabled
        : MidiStatus.NoDevicesFound));

    };
    initMidi();
  }, [dispatch]);
}
