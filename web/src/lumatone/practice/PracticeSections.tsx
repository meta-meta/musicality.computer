import {Box, Button, chakra, Flex, Text} from '@chakra-ui/react';
import {useMemo} from 'react';
import {getNoteColorHsl} from '../colors.ts';
import {pointyHexAxialToPixel} from '../hexUtils.ts';
import {pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';
import type {MelodyAttack} from '../leadSheet/stella.ts';
import {usePracticeScore} from './PracticeScoreContext.tsx';
import {sectionNotes} from './practiceSections.ts';
import type {PracticeSection} from './practiceSections.ts';

const R = 10;
const hex = Array.from({length: 6}, (_, index) => {
  const angle = Math.PI / 2 + index * Math.PI / 3;
  return `${(Math.cos(angle) * (R - 1)).toFixed(2)},${(Math.sin(angle) * (R - 1)).toFixed(2)}`;
}).join(' ');

// The section's path on the isomorphic layout, small: one hexagon per distinct
// cell and one arrow per move, in the same style as a note group on the board.
export function SectionPathGraphic({notes, transpose, id}: {notes: MelodyAttack[]; transpose: number; id: string}) {
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
    const segments = moves.map(({from, to, index}) => {
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const unit = {x: (to.x - from.x) / distance, y: (to.y - from.y) / distance};
      const shift = moves.some(move => move.from.key === to.key && move.to.key === from.key) ? 2 : 0;
      const padding = Math.min(R * 0.55, distance * 0.3);
      const point = (along: number) => `${(from.x + unit.x * along - unit.y * shift).toFixed(2)} ${(from.y + unit.y * along + unit.x * shift).toFixed(2)}`;
      return {index, d: `M ${point(padding)} L ${point(distance - padding)}`};
    });
    const xs = cells.map(cell => cell.x), ys = cells.map(cell => cell.y);
    const left = Math.min(...xs) - R - 2, top = Math.min(...ys) - R - 2;
    return {cells, segments, first: visits[0], viewBox: `${left} ${top} ${Math.max(...xs) + R + 2 - left} ${Math.max(...ys) + R + 2 - top}`};
  }, [notes, transpose]);
  if (!drawing.cells.length) return <div style={{width: 132, height: 72}}/>;
  return <svg data-section-path={notes.length} viewBox={drawing.viewBox} width={132} height={72} preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false" style={{display: 'block'}}>
    <defs><marker id={id} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" markerUnits="userSpaceOnUse" orient="auto"><path d="M 1 1.5 L 9 5 L 1 8.5 Z" fill="currentColor"/></marker></defs>
    {drawing.cells.map(cell => <polygon key={cell.key} data-section-cell={cell.note} points={hex} transform={`translate(${cell.x.toFixed(2)},${cell.y.toFixed(2)})`} fill={getNoteColorHsl(cell.note).toString({format: 'hex'})}/>)}
    <circle cx={drawing.first.x} cy={drawing.first.y} r={2.2} fill="currentColor"/>
    {drawing.segments.map(segment => <path key={segment.index} data-section-move={segment.index} d={segment.d} fill="none" stroke="currentColor" strokeWidth={1} markerEnd={`url(#${id})`}/>)}
  </svg>;
}

// Saved loops as a row of cards. Choosing one loads it as the loop and shows
// its path on the board for unjudged free play.
export function PracticeSections({sections, selected, melody, transpose, mode, disabled, canSave, onSave, onSelect, onRename, onDelete}: {
  sections: PracticeSection[]; selected: string | null; melody: MelodyAttack[]; transpose: number; mode: LabelMode; disabled: boolean;
  canSave: boolean; onSave: () => void; onSelect: (id: string | null) => void; onRename: (id: string, name: string) => void; onDelete: (id: string) => void;
}) {
  const {beatLabel} = usePracticeScore();
  const current = sections.find(section => section.id === selected);
  return <Box as="section" aria-label="Practice sections" borderWidth="1px" borderRadius="md" p={2}>
    <Flex gap={2} align="center" wrap="wrap" mb={sections.length ? 2 : 0}>
      <Text fontSize="sm" fontWeight="semibold">Sections</Text>
      <Button size="xs" variant="outline" disabled={disabled || !canSave} title={canSave ? undefined : 'Set loop points around at least one note first'} onClick={onSave}>Save loop as section</Button>
      {current && <>
        <input aria-label="Section name" value={current.name} maxLength={60} style={{width: '16ch', minWidth: 0}} onChange={event => onRename(current.id, event.target.value)}/>
        <Button size="xs" variant="ghost" disabled={disabled} onClick={() => onSelect(null)}>Leave free play</Button>
        <Button size="xs" variant="ghost" colorPalette="red" disabled={disabled} onClick={() => onDelete(current.id)}>Delete</Button>
      </>}
      <Text fontSize="xs" color="fg.muted">{current ? 'Free play: the section stays on the board and nothing is judged until you start practice.'
        : sections.length ? 'Choose a card to play a section freely.' : 'Drag on the Loop lane, then save the loop to keep it as a section.'}</Text>
    </Flex>
    {sections.length > 0 && <Flex role="listbox" aria-label="Saved sections" aria-orientation="horizontal" gap={2} overflowX="auto" pb={1} style={{scrollSnapType: 'x proximity'}}>
      {sections.map(section => {
        const notes = sectionNotes(melody, section.start, section.end).notes;
        const active = section.id === selected;
        return <chakra.button type="button" key={section.id} role="option" aria-selected={active} data-section-card={section.id} disabled={disabled}
          aria-label={`${section.name}: ${notes.length} notes from ${beatLabel(section.start)}. ${notes.slice(0, 12).map(note => pitchLabel(note.note + transpose, mode)).join(' ')}`}
          flexShrink={0} width="148px" p={2} textAlign="left" borderWidth="2px" borderRadius="md" borderColor={active ? 'cyan.400' : 'border'} bg={active ? 'bg.muted' : 'bg'}
          cursor={disabled ? 'default' : 'pointer'} opacity={disabled && !active ? 0.6 : 1} style={{scrollSnapAlign: 'start'}} onClick={() => onSelect(active ? null : section.id)}>
          <SectionPathGraphic notes={notes} transpose={transpose} id={`section-arrow-${section.id}`}/>
          <Text fontSize="xs" fontWeight="semibold" truncate>{section.name}</Text>
          <Text fontSize="xs" color="fg.muted" truncate>{beatLabel(section.start).replace(' · beat 1.00', '')} · {notes.length} note{notes.length === 1 ? '' : 's'}</Text>
        </chakra.button>;
      })}
    </Flex>}
  </Box>;
}
