import {Box, Button, Flex, Heading, Input, Stack, Text} from '@chakra-ui/react';
import {useEffect, useMemo, useRef, useState} from 'react';
import {WebMidi} from 'webmidi';
import type {NoteMessageEvent} from 'webmidi';
import {NativeSelectField, NativeSelectRoot} from './components/chakra-ui/native-select.tsx';
import {ChordDataFrame} from './lumatone/chords/ChordPrimitives.tsx';
import {LumatoneChordCard} from './lumatone/chords/LumatoneChordCard.tsx';
import {useCurrentLumatoneChord} from './lumatone/chords/useCurrentLumatoneChord.ts';
import {chordComposerButtonsMappings} from './lumatone/mappingFunctions.ts';
import {useAppDispatch, useAppSelector} from './redux/hooks.ts';
import {MidiStatus} from './redux/midiReducer.ts';
import {
  blankPanelInsertBeforeSelected,
  chordAdd,
  chordDeleteSelected,
  chordReplace,
  compositionForkFromCurrent,
  compositionNewDraft,
  compositionSave,
  compositionSelect,
  cursorNext,
  cursorPrevious,
} from './redux/lumatoneChordComposerReducer.ts';

type ComposerButtonAction = keyof Pick<typeof chordComposerButtonsMappings,
  'selectPrevious' | 'selectNext' | 'insertBlankBeforeSelected' | 'addReplaceSelected' | 'deleteSelected'>;

export function LumatoneComposer() {
  const dispatch = useAppDispatch();
  const currentChord = useCurrentLumatoneChord();
  const chordSequence = useAppSelector((s) => s.lumatoneChordComposer.sequence);
  const chordComposerCursor = useAppSelector((s) => s.lumatoneChordComposer.cursor);
  const compositions = useAppSelector((s) => s.lumatoneChordComposer.compositions);
  const selectedCompositionId = useAppSelector((s) => s.lumatoneChordComposer.selectedCompositionId);
  const [compositionNameInput, setCompositionNameInput] = useState('');
  const currentChordRef = useRef(currentChord);
  const chordComposerCursorRef = useRef(chordComposerCursor);
  const chordSequenceLengthRef = useRef(chordSequence.length);
  const lumatoneIn = useAppSelector(s => s.midi.lumatoneIn);
  const midiStatus = useAppSelector(s => s.midi.midiStatus);
  const noteActionMap = useMemo(() => {
    const map = new Map<number, ComposerButtonAction | 'ambiguous'>();
    (Object.entries(chordComposerButtonsMappings) as [ComposerButtonAction, {note: number}][]).forEach(([action, mapping]) => {
      const existing = map.get(mapping.note);
      map.set(mapping.note, existing && existing !== action ? 'ambiguous' : action);
    });
    return map;
  }, []);

  useEffect(() => {
    currentChordRef.current = currentChord;
  }, [currentChord]);

  useEffect(() => {
    chordComposerCursorRef.current = chordComposerCursor;
  }, [chordComposerCursor]);

  useEffect(() => {
    chordSequenceLengthRef.current = chordSequence.length;
  }, [chordSequence.length]);

  useEffect(() => {
    const selectedComposition = compositions.find((c) => c.id === selectedCompositionId);
    if (selectedComposition) {
      setCompositionNameInput(selectedComposition.name);
    }
  }, [compositions, selectedCompositionId]);

  useEffect(() => {
    if (midiStatus !== MidiStatus.Enabled || !WebMidi.enabled) return;
    if (!lumatoneIn) return;
    const deviceIn = WebMidi.getInputById(lumatoneIn);
    if (!deviceIn) return;

    const handleNoteOn = (e: NoteMessageEvent) => {
      const action = noteActionMap.get(e.note.number);
      if (!action || action === 'ambiguous') return;

      if (action === 'selectPrevious') {
        dispatch(cursorPrevious());
        return;
      }

      if (action === 'selectNext') {
        dispatch(cursorNext());
        return;
      }

      if (action === 'deleteSelected') {
        dispatch(chordDeleteSelected());
        return;
      }

      if (action === 'insertBlankBeforeSelected') {
        dispatch(blankPanelInsertBeforeSelected());
        return;
      }

      if (action === 'addReplaceSelected' && currentChordRef.current) {
        const cursor = chordComposerCursorRef.current;
        if (cursor < 0 || cursor >= chordSequenceLengthRef.current) {
          dispatch(chordAdd(currentChordRef.current));
          return;
        }
        dispatch(chordReplace({index: cursor, chord: currentChordRef.current}));
      }
    };

    deviceIn.addListener('noteon', handleNoteOn, {channels: [16]});

    return () => {
      deviceIn.removeListener('noteon', handleNoteOn);
    };
  }, [noteActionMap, dispatch, lumatoneIn, midiStatus]);


  return (
    <Stack gap={8}>
      <Stack>
        <Heading size="md">
          Currently playing:
        </Heading>
        {currentChord ? (
          <LumatoneChordCard
            chordData={currentChord}
          />
        ) : <ChordDataFrame/>}
      </Stack>

      <Stack>
        <Flex align="center" gap={3} wrap="wrap">
          <Heading size="md">
            Composer sequence:
          </Heading>

          <NativeSelectRoot size="sm" width="16rem">
            <NativeSelectField
              value={selectedCompositionId ?? ''}
              onChange={(event) => {
                const selectedId = event.currentTarget.value || null;
                if (!selectedId) {
                  dispatch(compositionNewDraft());
                  setCompositionNameInput('');
                  return;
                }
                dispatch(compositionSelect(selectedId));
              }}
            >
              <option value="">Draft (unsaved)</option>
              {compositions.map((composition) => (
                <option key={composition.id} value={composition.id}>
                  {composition.name}
                </option>
              ))}
            </NativeSelectField>
          </NativeSelectRoot>

          <Input
            size="sm"
            width="14rem"
            placeholder="Composition name"
            value={compositionNameInput}
            onChange={(event) => {
              setCompositionNameInput(event.currentTarget.value);
            }}
          />

          <Button
            size="sm"
            variant="subtle"
            onClick={() => {
              dispatch(compositionSave({name: compositionNameInput}));
            }}
          >
            Save
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const selectedComposition = compositions.find((c) => c.id === selectedCompositionId);
              if (selectedComposition) {
                setCompositionNameInput(`${selectedComposition.name} (fork)`);
              }
              dispatch(compositionForkFromCurrent());
            }}
          >
            Fork
          </Button>
        </Flex>

        {chordSequence.length > 0 ? (
          <Flex gap={2} wrap="wrap">
            {chordSequence.map((chordPanel, chordIndex) => (
              <Box
                key={chordPanel.id}
                borderRadius="3xl"
                boxShadow={chordComposerCursor === chordIndex ? '0 0 0 2px var(--chakra-colors-orange-400)' : 'none'}
              >
                <LumatoneChordCard
                  chordData={chordPanel}
                />
              </Box>
            ))}

            {chordComposerCursor >= chordSequence.length && (
              <Box
                borderRadius="3xl"
                boxShadow="0 0 0 2px var(--chakra-colors-orange-400)"
              >
                <ChordDataFrame/>
              </Box>
            )}
          </Flex>
        ) : (
          <Flex gap={2} wrap="wrap">
            <Box
              borderRadius="3xl"
              boxShadow={chordComposerCursor >= chordSequence.length ? '0 0 0 2px var(--chakra-colors-orange-400)' : 'none'}
            >
              <ChordDataFrame/>
            </Box>
            <Text color="fg.muted">No panels yet.</Text>
          </Flex>
        )}
      </Stack>

    </Stack>
  );
}
