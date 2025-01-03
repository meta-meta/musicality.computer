import {Badge, Card, Flex, Text} from '@chakra-ui/react';
import {SiMidi} from 'react-icons/si';
import {useEffect} from 'react';
import {Input, Output, WebMidi} from 'webmidi';
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
import {ReactIcon} from './components/chakra-ui/reactIcon.tsx';
import MidiDeviceSelect, {SelectionType} from './MidiDeviceSelect.tsx';
import {Field} from './components/chakra-ui/field.tsx';
import ExternalLink from './components/ExternalLink.tsx';
import {FaYoutube} from 'react-icons/fa6';


function MidiConfig() {

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

  const status = useAppSelector(s => s.midi.midiStatus);
  const statusColor = status == MidiStatus.Enabled
    ? 'green'
    : status == MidiStatus.Unauthorized
      ? 'red'
      : status == MidiStatus.NoDevicesFound
        ? 'yellow'
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

      <Card.Body gap={2}>
        <Field
          label="Beat Clock"
          helperText={
          <Text>
            Some components can sync with MIDI Beat Clock&nbsp;
            <ExternalLink
              href="https://www.youtube.com/watch?v=3y_QszRkC94"
              icon={<FaYoutube/>}
              label="MIDI clock in REAPER"
            />
          </Text>
          }
        >
          <MidiDeviceSelect
            selectionType={SelectionType.Input}
            onSelect={val => dispatch(beatClockInSet(val))}
            value={useAppSelector(s => s.midi.beatClockIn)}
          />
        </Field>

        <Field
          label="Lumatone In"
        >
          <MidiDeviceSelect
            selectionType={SelectionType.Input}
            onSelect={val => dispatch(lumatoneInSet(val))}
            value={useAppSelector(s => s.midi.lumatoneIn)}
          />
        </Field>


        <Field
          label="Lumatone Out"
        >
          <MidiDeviceSelect

            selectionType={SelectionType.Output}
            onSelect={val => dispatch(lumatoneOutSet(val))}
            value={useAppSelector(s => s.midi.lumatoneOut)}
          />
        </Field>


      </Card.Body>

    </Card.Root>
  );
}

export default MidiConfig;