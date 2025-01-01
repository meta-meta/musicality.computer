import {Card, createListCollection} from '@chakra-ui/react';
import {SiMidi} from 'react-icons/si';
import {useEffect} from 'react';
import {WebMidi} from 'webmidi';
import {useAppDispatch, useAppSelector} from './redux/hooks.ts';
import {beatClockInSet, inputsSet, lumatoneInSet, lumatoneOutSet, outputsSet} from './redux/midiReducer.ts';
import {ReactIcon} from './components/ui/reactIcon.tsx';
import MidiDeviceSelect, {SelectionType} from './MidiDeviceSelect.tsx';


function MidiConfig() {

  const dispatch = useAppDispatch();

  useEffect(() => {
    const initMidi = async () => {
      await WebMidi.enable({sysex: true});
      const {inputs, outputs} = WebMidi;

      const inputOptions = createListCollection({
        items: inputs.map(i => ({
          label: i.name,
          value: i.id,
          group: (i.name.startsWith('LM-') || i.name === 'BeatClock') ? 'LoopMIDI' : 'PhysicalDevices',
        })),
      });

      const outputOptions = createListCollection({
        items: outputs.map(i => ({
          label: i.name,
          value: i.id,
          group: (i.name.startsWith('LM-') || i.name === 'BeatClock') ? 'LoopMIDI' : 'PhysicalDevices',
        })),
      });

      dispatch(inputsSet(inputOptions));
      dispatch(outputsSet(outputOptions));
    };
    initMidi();
  }, [dispatch]);

  return (
    <Card.Root>
      <Card.Header>
        <ReactIcon
          icon={SiMidi}
          fontSize="3xl"
        />
      </Card.Header>

      <Card.Body>
        <MidiDeviceSelect
          label="Beat Clock"
          selectionType={SelectionType.Input}
          onSelect={val => dispatch(beatClockInSet(val))}
          value={useAppSelector(s => s.midiReducer.beatClockIn)}
        />

        <MidiDeviceSelect
          label="Lumatone In"
          selectionType={SelectionType.Input}
          onSelect={val => dispatch(lumatoneInSet(val))}
          value={useAppSelector(s => s.midiReducer.lumatoneIn)}
        />

        <MidiDeviceSelect
          label="Lumatone Out"
          selectionType={SelectionType.Output}
          onSelect={val => dispatch(lumatoneOutSet(val))}
          value={useAppSelector(s => s.midiReducer.lumatoneOut)}
        />

      </Card.Body>

    </Card.Root>
  );
}

export default MidiConfig;