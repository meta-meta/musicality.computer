import {Heading} from '@chakra-ui/react';
import _ from 'lodash-es';
import {Fragment} from 'react';
import {colorClear, getNoteColorHsl} from '../colors.ts';
import {pointyHexAxialToPixel} from '../hexUtils.ts';
import {toSymbol} from '../util';
import {useColorMode} from '../../components/chakra-ui/color-mode.tsx';
import type {LumatoneChordData} from '../lumatoneTypes.ts';
import {ArrowFromToHex, ChordDataFrame, HexagonPointy} from './ChordPrimitives.tsx';
import {noteName, pitchLabel} from '../leadSheet/labels.ts';
import type {LabelMode} from '../leadSheet/labels.ts';

export function LumatoneChordCard({chordData, diagramOnly = false, labelMode = 'dozenal', commonNotes, guideNotes, omitRoot = false, fromOmitRoot = false, onPlayNote}: {
  chordData: LumatoneChordData; diagramOnly?: boolean; labelMode?: LabelMode;
  commonNotes?: readonly number[]; guideNotes?: readonly number[];
  omitRoot?: boolean; fromOmitRoot?: boolean;
  onPlayNote?: (note: number) => void;
}) {
  const {
    root = 60,
    intervals = [
      [2, 0],
      [0, -1],
      [2, -1],
    ],
    fromRootInterval,
    fromIntervals = [],
  } = chordData;

  const fromRoot = fromRootInterval ?? [0, 0];
  const [qFrom, rFrom] = fromRoot;
  const fromNoteNum = root + qFrom * 2 + rFrom * 7;

  const all = [
    ...(fromOmitRoot ? fromIntervals : [[0, 0], ...fromIntervals]).map(([q, r]) => ([q + qFrom, r + rFrom])),
    ...(omitRoot ? intervals : [[0, 0], ...intervals]),
  ];

  const total = all.reduce((acc, curr) => {
    const [[accBotLeftX, accBotLeftY], [accTopRightX, accTopRightY]] = acc;
    const [x, y] = curr;

    return [
      [Math.min(accBotLeftX, x), Math.min(accBotLeftY, y)],
      [Math.max(accTopRightX, x), Math.max(accTopRightY, y)],
    ];
  }, [[0, 0], [0, 0]]);

  const centerOffset = {
    q: (total[0][0] + total[1][0]) / -2,
    r: (total[0][1] + total[1][1]) / -2,
  };

  const hexRad = 8.5;
  const hexGap = 1.5;
  const axialToCenters = ({q, r}: {q: number; r: number}) => {
    const {q: qCenter, r: rCenter} = centerOffset;
    const coordNorm = pointyHexAxialToPixel({q: q + qCenter, r: r + rCenter});
    return {
      hexGap,
      r: hexRad,
      cx: 50 + coordNorm.x * hexRad,
      cy: 50 + coordNorm.y * hexRad,
    };
  };

  const {colorMode} = useColorMode();
  const isLight = colorMode === 'light';

  const pcsWithRepeats = intervals
    .map(([q, r]) => (1200 + q * 2 + r * 7) % 12)
    .filter(n => n !== 0)
    .sort((a, b) => a - b)
    .map(n => toSymbol(n));

  const pcs = _.uniq(pcsWithRepeats).join('');

  const hasFromRootInterval = Boolean(fromRootInterval);
  const hasRootMotion = hasFromRootInterval && (qFrom !== 0 || rFrom !== 0);
  const mag = hasRootMotion ? Math.sqrt(qFrom * qFrom + rFrom * rFrom) : 1;
  const arrowFrom = axialToCenters({q: qFrom, r: rFrom});
  const arrowTo = axialToCenters({q: 0.4 * (qFrom / mag), r: 0.4 * (rFrom / mag)});
  const centers = all.map(([q, r]) => axialToCenters({q, r}));
  const minX = Math.min(...centers.map(center => center.cx)) - hexRad - 2;
  const minY = Math.min(...centers.map(center => center.cy)) - hexRad - 2;
  const maxX = Math.max(...centers.map(center => center.cx)) + hexRad + 2;
  const maxY = Math.max(...centers.map(center => center.cy)) + hexRad + 2;
  const Frame = diagramOnly ? Fragment : ChordDataFrame;

  return (
    <Frame>
      {!diagramOnly && <Heading
        color="fg"
        fontWeight="md"
        position="absolute"
        size="md"
        textAlign="center"
        width="full"
      >
        {toSymbol(root)}{pcs.length ? '+' : ''}{pcs}
      </Heading>}

      <svg height="100%" width="100%" viewBox={diagramOnly ? `${minX} ${minY} ${maxX - minX} ${maxY - minY}` : '0 0 100 100'} aria-hidden={diagramOnly && !onPlayNote || undefined} style={{userSelect: 'none', WebkitUserSelect: 'none'}}>
        {onPlayNote && <style>{`.lumatone-play-note:focus { outline: none; }
          .lumatone-play-note:focus > .lumatone-note-focus { opacity: 1; }`}</style>}
        {hasFromRootInterval && !fromOmitRoot && (
          <HexagonPointy
            {...axialToCenters({q: qFrom, r: rFrom})}
            fill={getNoteColorHsl(fromNoteNum).range(isLight ? 'white' : 'black')(0.75).toString({format: 'hex'})}
            stroke={getNoteColorHsl(fromNoteNum).range(isLight ? 'white' : 'black')(0.5).toString({format: 'hex'})}
          />
        )}

        {fromIntervals
          .map(([q, r]) => ([q + qFrom, r + rFrom]))
          .filter((from) => !_.find([[0, 0], ...intervals], ([q, r]) => q === from[0] && r === from[1]))
          .map(([qFrom, rFrom], idx) => {
            const noteNum = root + qFrom * 2 + rFrom * 7;

            return (
              <HexagonPointy
                key={idx}
                {...axialToCenters({q: qFrom, r: rFrom})}
                fill={getNoteColorHsl(noteNum).range(isLight ? 'white' : 'black')(0.75).toString({format: 'hex'})}
                stroke="none"
              />
            );
          })}

        {(omitRoot ? intervals : [[0, 0], ...intervals]).map(([q, r], idx) => {
          const noteNum = root + q * 2 + r * 7;
          const isRoot = q === 0 && r === 0;
          const {cx, cy} = axialToCenters({q, r});
          const common = commonNotes?.includes(noteNum);
          const guide = guideNotes?.includes(noteNum);
          const outline = Array.from({length: 6}, (_, index) => {
            const angle = Math.PI / 2 + index * Math.PI / 3;
            return `${cx + Math.cos(angle) * 8.2},${cy + Math.sin(angle) * 8.2}`;
          }).join(' ');

          return (
            <g key={idx} data-common-tone={common ? noteNum : undefined} data-guide-tone={guide ? noteNum : undefined} opacity={guideNotes && !guide && !common ? isRoot ? 0.65 : 0.35 : 1}
              className={onPlayNote ? 'lumatone-play-note' : undefined} data-play-note={onPlayNote ? noteNum : undefined} role={onPlayNote ? 'button' : undefined} tabIndex={onPlayNote ? 0 : undefined}
              aria-label={onPlayNote ? `Play ${noteName(noteNum, labelMode)}` : undefined} style={onPlayNote ? {cursor: 'pointer', pointerEvents: 'auto'} : undefined}
              onClick={onPlayNote ? event => {event.stopPropagation(); onPlayNote(noteNum);} : undefined}
              onKeyDown={onPlayNote ? event => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault(); event.stopPropagation();
                if (!event.repeat) onPlayNote(noteNum);
              } : undefined}>
              <HexagonPointy
                {...axialToCenters({q, r})}
                fill={getNoteColorHsl(noteNum).toString({format: 'hex'})}
                stroke={(isRoot
                  ? getNoteColorHsl(noteNum).range(isLight ? 'black' : 'white')(0.5)
                  : colorClear).toString({format: 'hex'})}
              />

              <text
                fill={!isLight ? '#000c' : '#fffc'}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: hexRad * (pitchLabel(noteNum, labelMode).length > 1 ? 0.65 : 0.95),
                }}
                x={cx}
                y={cy}
              >
                {pitchLabel(noteNum, labelMode)}
              </text>

              <text
                fill={!isLight ? '#0007' : '#fff7'}
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: hexRad * 0.45,
                }}
                x={cx + hexRad * 0.45}
                y={cy + hexRad * 0.2}
              >
                {Math.floor(noteNum / 12) - 1}
              </text>
              {common && <polygon points={outline} fill="none" stroke={isLight ? '#0e7490' : '#52e6ef'} strokeWidth={0.7}/>}
              {guide && <circle cx={cx + 5.8} cy={cy - 5.5} r={1.3} fill={isLight ? '#b45309' : '#fbbf24'} stroke={isLight ? '#fff' : '#111820'} strokeWidth={0.4}/>}
              {onPlayNote && <polygon className="lumatone-note-focus" points={outline} fill="none" stroke={isLight ? '#111' : '#fff'} strokeWidth={0.7} opacity={0} pointerEvents="none"/>}
            </g>
          );
        })}

        {hasRootMotion && (
          <ArrowFromToHex
            pointerEvents={onPlayNote ? 'none' : undefined}
            from={arrowFrom}
            fromColor={getNoteColorHsl(fromNoteNum).range(isLight ? 'white' : 'black')(0.5).toString({format: 'hex'})}
            to={arrowTo}
            toColor={isLight ? '#666' : '#fff'}
          />
        )}
      </svg>
    </Frame>
  );
}
