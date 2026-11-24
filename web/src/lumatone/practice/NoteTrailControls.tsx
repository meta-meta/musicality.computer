import {Box, Flex, Text} from '@chakra-ui/react';
import {trailCurves} from './noteTrail.ts';
import type {useNoteTrailSettings} from './useNoteTrailSettings.ts';
import type {NoteTrailSettings} from './noteTrail.ts';

export function NoteTrailControls({settings, setSettings, error}: ReturnType<typeof useNoteTrailSettings>) {
  const numeric = (key: 'dropMs' | 'level' | 'fadeMs', value: number, max: number) => {
    if (Number.isFinite(value)) setSettings(current => ({...current, [key]: Math.max(0, Math.min(max, value))}));
  };
  return <Box as="details" width="100%" mt={2}>
    <Box as="summary" cursor="pointer">Input note trails</Box>
    <Flex gap={3} wrap="wrap" mt={2}>
      <Flex as="label" gap={2}><input type="checkbox" checked={settings.enabled} onChange={event => setSettings(current => ({...current, enabled: event.target.checked}))}/>Fade after note off</Flex>
      <Flex as="label" gap={2} align="center">Quick drop
        <input aria-label="Note-off quick drop duration" type="number" min={0} max={5000} step={10} value={settings.dropMs} style={{width: 70}} onChange={event => numeric('dropMs', Number(event.target.value), 5000)}/>ms
      </Flex>
      <Flex as="label" gap={2} align="center">Drop to
        <input aria-label="Note-off remaining highlight" type="number" min={0} max={100} step={5} value={Math.round(settings.level * 100)} style={{width: 60}} onChange={event => numeric('level', Number(event.target.value) / 100, 1)}/>%
      </Flex>
      <Flex as="label" gap={2} align="center">Memory fade
        <input aria-label="Note-off memory fade duration" type="number" min={0} max={120} step={0.5} value={settings.fadeMs / 1000} style={{width: 65}} onChange={event => numeric('fadeMs', Number(event.target.value) * 1000, 120000)}/>s
      </Flex>
      {(['dropCurve', 'fadeCurve'] as const).map(key => <Flex as="label" key={key} gap={2} align="center">{key === 'dropCurve' ? 'Drop curve' : 'Memory curve'}
        <select aria-label={key === 'dropCurve' ? 'Note-off drop curve' : 'Note-off memory curve'} value={settings[key]} onChange={event => setSettings(current => ({...current, [key]: event.target.value as NoteTrailSettings[typeof key]}))}>
          {trailCurves.map(curve => <option key={curve} value={curve}>{curve === 'linear' ? 'Linear' : curve === 'ease-out' ? 'Ease out' : 'Ease in / out'}</option>)}
        </select>
      </Flex>)}
    </Flex>
    <Text fontSize="xs" color="fg.muted" mt={2}>Applies to live MIDI and microphone outlines and fill highlights. The quick drop marks release; the memory fade leaves a temporary landmark. Replaying restores full strength. Settings save in this browser.</Text>
    {error && <Text fontSize="xs" color="orange.500">{error}</Text>}
  </Box>;
}
