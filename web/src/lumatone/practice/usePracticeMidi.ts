import {useEffect, useState} from 'react';
import {WebMidi} from 'webmidi';
import type {MessageEvent, NoteMessageEvent} from 'webmidi';
import {useAppSelector} from '../../redux/hooks.ts';
import {MidiStatus} from '../../redux/midiReducer.ts';

export function usePracticeMidi() {
  const inputId = useAppSelector(s => s.midi.lumatoneIn);
  const status = useAppSelector(s => s.midi.midiStatus);
  const inputs = useAppSelector(s => s.midi.inputs);
  const [notes, setNotes] = useState<number[]>([]);
  useEffect(() => {
    setNotes([]);
    if (status !== MidiStatus.Enabled || !WebMidi.enabled || !inputId) return;
    const input = WebMidi.getInputById(inputId);
    if (!input) return;
    // Releasing a pitch on one channel must not clear it on another.
    const held = new Map<string, number>();
    const publish = () => setNotes([...new Set(held.values())]);
    const release = (event: NoteMessageEvent) => {
      held.delete(`${event.message.channel}:${event.note.number}`);
      publish();
    };
    const press = (event: NoteMessageEvent) => {
      if (event.dataBytes[1] === 0) {release(event); return;}
      held.set(`${event.message.channel}:${event.note.number}`, event.note.number);
      publish();
    };
    const clear = () => {held.clear(); publish();};
    const clearChannel = (event: MessageEvent) => {
      for (const key of held.keys()) {
        if (key.startsWith(`${event.message.channel}:`)) held.delete(key);
      }
      publish();
    };
    input.addListener('noteon', press);
    input.addListener('noteoff', release);
    input.addListener('allnotesoff', clearChannel);
    input.addListener('allsoundoff', clearChannel);
    input.addListener('disconnected', clear);
    return () => {
      input.removeListener('noteon', press);
      input.removeListener('noteoff', release);
      input.removeListener('allnotesoff', clearChannel);
      input.removeListener('allsoundoff', clearChannel);
      input.removeListener('disconnected', clear);
    };
  }, [inputId, status, inputs]);
  return notes;
}
