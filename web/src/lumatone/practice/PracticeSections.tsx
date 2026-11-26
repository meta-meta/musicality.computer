import {Box, Button, chakra, Flex, Text} from '@chakra-ui/react';
import {useEffect, useMemo, useRef} from 'react';
import {getNoteColorHsl, orderColor} from '../colors.ts';
import {pointyHexAxialToPixel} from '../hexUtils.ts';
import {pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import type {MelodyAttack} from '../leadSheet/stella.ts';
import {usePracticeScore} from './PracticeScoreContext.tsx';
import {sectionNotes} from './practiceSections.ts';
import {spreadOverlappingMoves} from './arrowLanes.ts';
import type {PracticeSection} from './practiceSections.ts';

const R = 10;
const hex = Array.from({length: 6}, (_, index) => {
  const angle = Math.PI / 2 + index * Math.PI / 3;
  return `${(Math.cos(angle) * (R - 1)).toFixed(2)},${(Math.sin(angle) * (R - 1)).toFixed(2)}`;
}).join(' ');

// The section's path on the isomorphic layout, small: one hexagon per distinct
// cell and one arrow per move, in the same style as a note group on the board.
export function SectionPathGraphic({notes, transpose}: {notes: MelodyAttack[]; transpose: number}) {
  const drawing = useMemo(() => {
    const visits = notes.map(note => {
      const {x, y} = pointyHexAxialToPixel(note.at);
      return {key: `${note.at.q},${note.at.r}`, x: x * R, y: y * R, note: note.note + transpose};
    });
    const cells = [...new Map(visits.map(cell => [cell.key, cell])).values()];
    const moves = visits.flatMap((from, index) => {
      const to = visits[index + 1];
      return to && to.key !== from.key ? [{from, to, index}] : [];
    });
    const shifts = spreadOverlappingMoves(moves, 3.2, 12);
    const segments = moves.map(({from, to, index}, order) => {
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const unit = {x: (to.x - from.x) / distance, y: (to.y - from.y) / distance};
      const shift = shifts[order];
      const padding = Math.min(R * 0.55, distance * 0.3);
      const point = (along: number, side = 0) => `${(from.x + unit.x * along - unit.y * side + shift.x).toFixed(2)} ${(from.y + unit.y * along + unit.x * side + shift.y).toFixed(2)}`;
      const tip = distance - padding, head = Math.min(3.6, (tip - padding) * 0.45);
      return {index, color: orderColor(order, moves.length), d: `M ${point(padding)} L ${point(tip - head)}`,
        head: `M ${point(tip)} L ${point(tip - head, head * 0.42)} L ${point(tip - head, -head * 0.42)} Z`};
    });
    const xs = cells.map(cell => cell.x), ys = cells.map(cell => cell.y);
    const left = Math.min(...xs) - R - 2, top = Math.min(...ys) - R - 2;
    return {cells, segments, first: visits[0], viewBox: `${left} ${top} ${Math.max(...xs) + R + 2 - left} ${Math.max(...ys) + R + 2 - top}`};
  }, [notes, transpose]);
  if (!drawing.cells.length) return <div style={{width: 132, height: 72}}/>;
  return <svg data-section-path={notes.length} viewBox={drawing.viewBox} width={132} height={72} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style={{display: 'block'}}>
    {drawing.cells.map(cell => <polygon key={cell.key} data-section-cell={cell.note} points={hex} transform={`translate(${cell.x.toFixed(2)},${cell.y.toFixed(2)})`} fill={getNoteColorHsl(cell.note).toString({format: 'hex'})}/>)}
    <circle cx={drawing.first.x} cy={drawing.first.y} r={2.2} fill="currentColor"/>
    {drawing.segments.map(segment => <g key={segment.index} data-section-move={segment.index} data-move-color={segment.color}>
      <path d={segment.d} fill="none" stroke="#111" strokeWidth={1.7} strokeOpacity={0.6}/>
      <path d={segment.head} fill={segment.color} stroke="#111" strokeOpacity={0.6} strokeWidth={0.4} strokeLinejoin="round"/>
      <path d={segment.d} fill="none" stroke={segment.color} strokeWidth={0.8}/>
    </g>)}
  </svg>;
}

// Saved loops as a row of cards. Choosing one loads it as the loop and shows
// its path on the board for unjudged free play.
export function PracticeSections({sections, selected, melody, transpose, mode, disabled, editingDisabled, canSave, onSave, onSelect, onRename, onDelete}: {
  sections: PracticeSection[]; selected: string | null; melody: MelodyAttack[]; transpose: number; mode: LabelMode; disabled: boolean; editingDisabled: boolean;
  canSave: boolean; onSave: () => void; onSelect: (id: string | null) => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void;
}) {
  const {beatLabel} = usePracticeScore();
  const current = sections.find(section => section.id === selected);
  // Selection is independent of focus and never scrolls the page: only the card
  // row moves sideways, and only as far as needed to show the selected card.
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const strip = row.current, card = strip?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!strip || !card) return;
    const left = card.offsetLeft - strip.offsetLeft, right = left + card.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollLeft = left;
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollLeft = right - strip.clientWidth;
  }, [selected]);
  return <Box as="section" aria-label="Practice sections" borderWidth="1px" borderRadius="md" p={2}>
    <Flex gap={2} align="center" wrap="wrap" mb={sections.length ? 2 : 0}>
      <Text fontSize="sm" fontWeight="semibold">Sections</Text>
      <Button size="xs" variant="outline" disabled={editingDisabled || !canSave} title={canSave ? undefined : 'Set loop points around at least one note first'} onClick={onSave}>Save loop as section</Button>
      {current && <>
        <input aria-label="Section name" value={current.name} maxLength={60} style={{width: '16ch', minWidth: 0}} onChange={event => onRename(current.id, event.target.value)}/>
        <Button size="xs" variant="ghost" disabled={disabled} onClick={() => onSelect(null)}>Leave free play</Button>
        <Button size="xs" variant="ghost" colorPalette="red" disabled={editingDisabled} onClick={() => onDelete(current.id)}>Delete</Button>
      </>}
      <Text fontSize="xs" color="fg.muted">{current ? 'Free play: the section stays on the board and nothing is judged until you start practice. ← / → move to the previous or next section; while playing, it is cued for the next beat.'
        : sections.length ? 'Choose a card to play a section freely.' : 'Drag on the Loop lane, then save the loop to keep it as a section.'}</Text>
    </Flex>
    {sections.length > 0 && <Flex ref={row} role="listbox" aria-label="Saved sections" aria-orientation="horizontal" gap={2} overflowX="auto" pb={1} style={{scrollSnapType: 'x proximity'}}>
      {sections.map(section => {
        const notes = sectionNotes(melody, section.start, section.end).notes;
        const active = section.id === selected;
        return <chakra.button type="button" key={section.id} role="option" aria-selected={active} data-section-card={section.id} disabled={disabled}
          aria-label={`${section.name}: ${notes.length} notes from ${beatLabel(section.start)}. ${notes.slice(0, 12).map(note => pitchLabel(note.note + transpose, mode)).join(' ')}`}
          flexShrink={0} width="148px" p={2} textAlign="left" borderWidth="2px" borderRadius="md" borderColor={active ? 'cyan.400' : 'border'} bg={active ? 'bg.muted' : 'bg'}
          cursor={disabled ? 'default' : 'pointer'} opacity={disabled && !active ? 0.6 : 1} style={{scrollSnapAlign: 'start'}} onClick={() => onSelect(active ? null : section.id)}>
          <SectionPathGraphic notes={notes} transpose={transpose}/>
          <Text fontSize="xs" fontWeight="semibold" truncate>{section.name}</Text>
          <Text fontSize="xs" color="fg.muted" truncate>{beatLabel(section.start).replace(' · beat 1.00', '')} · {notes.length} note{notes.length === 1 ? '' : 's'}</Text>
        </chakra.button>;
      })}
    </Flex>}
  </Box>;
}
