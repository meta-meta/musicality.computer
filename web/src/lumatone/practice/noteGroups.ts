// Melodic note groups for the practice display. Two readings are offered:
// "beams" follows the source notation (or its beat-level equivalent when a
// score carries no beam data), and "contour" follows the melodic direction.
// Both are display heuristics, not an analysis of phrase structure.
export type NoteGroupMode = 'off' | 'beams' | 'contour';
export type GroupNote = {note: number; start: number; duration: number; beam?: 'begin' | 'continue' | 'end'};
// Inclusive melody indices. Groups cover every note; unattached notes are singletons.
export type NoteGroup = {start: number; end: number};

const EPSILON = 1e-6;
const restBefore = (melody: GroupNote[], index: number) => index > 0
  && melody[index].start > melody[index - 1].start + melody[index - 1].duration + EPSILON;

function fromBoundaries(length: number, startsGroup: (index: number) => boolean): NoteGroup[] {
  const groups: NoteGroup[] = [];
  for (let index = 0; index < length; index++) {
    // Always consult the rule so stateful rules also see the first note.
    if (startsGroup(index) || index === 0) groups.push({start: index, end: index});
    else groups[groups.length - 1].end = index;
  }
  return groups;
}

// Written beams: a group runs from "begin" to "end". A rest or an unbeamed
// note closes an unfinished group, so malformed source data cannot leak.
function writtenBeams(melody: GroupNote[]) {
  let open = false;
  return fromBoundaries(melody.length, index => {
    const beam = melody[index].beam;
    const joins = open && !restBefore(melody, index) && (beam === 'continue' || beam === 'end');
    open = beam === 'begin' || (joins && beam === 'continue');
    return !joins;
  });
}

// Without beam data, join notes shorter than a beat that start within the same
// beat of the same bar, which is where simple-meter notation would beam them.
function beatBeams(melody: GroupNote[], bars: number[]) {
  const beatOf = (start: number) => {
    const bar = bars.reduce((last, barStart, index) => barStart <= start + EPSILON ? index : last, -1);
    return `${bar}:${Math.floor(start - (bar < 0 ? Math.floor(start) : bars[bar]) + EPSILON)}`;
  };
  return fromBoundaries(melody.length, index => index === 0 || restBefore(melody, index)
    || melody[index].duration >= 1 - EPSILON || melody[index - 1].duration >= 1 - EPSILON
    || beatOf(melody[index].start) !== beatOf(melody[index - 1].start));
}

// Contour: a group is one sweep in a single melodic direction. It ends at a
// rest, after a note that is long beside its successor (at least a beat and
// twice the next note), or where the direction reverses. The turning note
// stays with the sweep that reached it; repeated pitches keep the direction.
function contourGroups(melody: GroupNote[]) {
  let direction = 0;
  return fromBoundaries(melody.length, index => {
    if (index === 0) return true;
    const previous = melody[index - 1], current = melody[index];
    const step = Math.sign(current.note - previous.note);
    const long = previous.duration >= 1 - EPSILON && previous.duration >= 2 * current.duration - EPSILON;
    const boundary = restBefore(melody, index) || long || (step !== 0 && direction !== 0 && step !== direction);
    direction = boundary ? 0 : step || direction;
    return boundary;
  });
}

export function hasWrittenBeams(melody: GroupNote[]) {
  return melody.some(note => note.beam);
}

export function melodyGroups(melody: GroupNote[], mode: NoteGroupMode, bars: number[] = []): NoteGroup[] {
  if (mode === 'off' || !melody.length) return [];
  if (mode === 'contour') return contourGroups(melody);
  return hasWrittenBeams(melody) ? writtenBeams(melody) : beatBeams(melody, bars);
}

export function groupAt(groups: NoteGroup[], index: number) {
  return index < 0 ? undefined : groups.find(group => index >= group.start && index <= group.end);
}
