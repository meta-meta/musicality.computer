import {Badge, Card, createListCollection, Flex} from '@chakra-ui/react';
import {SiMidi} from 'react-icons/si';
import {useEffect} from 'react';
import {WebMidi} from 'webmidi';
import {useAppDispatch, useAppSelector} from './redux/hooks.ts';
import {
  beatClockInSet,
  inputsSet,
  lumatoneInSet,
  lumatoneOutSet,
  MidiStatus,
  midiStatusSet,
  outputsSet,
} from './redux/midiReducer.ts';
import {ReactIcon} from './components/ui/reactIcon.tsx';
import MidiDeviceSelect, {SelectionType} from './MidiDeviceSelect.tsx';


function MidiConfig() {

  const dispatch = useAppDispatch();

  useEffect(() => {
    const initMidi = async () => {
      dispatch(midiStatusSet(MidiStatus.Connecting));

      try {
        await WebMidi.enable({sysex: true});

      } catch (error) {
        dispatch(midiStatusSet(MidiStatus.Unauthorized));
        return;
      }

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
      dispatch(midiStatusSet(MidiStatus.Connected));

    };
    initMidi();
  }, [dispatch]);

  const status = useAppSelector(s => s.midi.midiStatus);
  const statusColor = status == MidiStatus.Connected
    ? 'green'
    : status == MidiStatus.Unauthorized
      ? 'red'
      : undefined;

  return (
    <Card.Root>
      <Card.Header>
        <Flex gap={2}>
          <ReactIcon
            icon={SiMidi}
            fontSize="3xl"
          />
          <Badge colorPalette={statusColor}>
            {MidiStatus[status]}
          </Badge>
        </Flex>

      </Card.Header>

      <Card.Body>
        <MidiDeviceSelect
          label="Beat Clock"
          selectionType={SelectionType.Input}
          onSelect={val => dispatch(beatClockInSet(val))}
          value={useAppSelector(s => s.midi.beatClockIn)}
        />

        <MidiDeviceSelect
          label="Lumatone In"
          selectionType={SelectionType.Input}
          onSelect={val => dispatch(lumatoneInSet(val))}
          value={useAppSelector(s => s.midi.lumatoneIn)}
        />

        <MidiDeviceSelect
          label="Lumatone Out"
          selectionType={SelectionType.Output}
          onSelect={val => dispatch(lumatoneOutSet(val))}
          value={useAppSelector(s => s.midi.lumatoneOut)}
        />

      </Card.Body>

    </Card.Root>
  );
}

export default MidiConfig;