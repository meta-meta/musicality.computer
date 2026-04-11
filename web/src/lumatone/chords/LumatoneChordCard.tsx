import {Heading} from '@chakra-ui/react';
import _ from 'lodash-es';
import {Fragment} from 'react';
import {colorClear, getNoteColorHsl} from '../colors.ts';
import {pointyHexAxialToPixel} from '../hexUtils.ts';
import {toSymbol} from '../util';
import {useColorMode} from '../../components/chakra-ui/color-mode.tsx';
import type {LumatoneChordData} from '../lumatoneTypes.ts';
import {ArrowFromToHex, ChordDataFrame, HexagonPointy} from './ChordPrimitives.tsx';

export function LumatoneChordCard({chordData}: {chordData: LumatoneChordData}) {
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
    ...[[0, 0], ...fromIntervals].map(([q, r]) => ([q + qFrom, r + rFrom])),
    ...[[0, 0], ...intervals],
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

  return (
    <ChordDataFrame>
      <Heading
        color="fg"
        fontWeight="md"
        position="absolute"
        size="md"
        textAlign="center"
        width="full"
      >
        {toSymbol(root)}+{pcs}
      </Heading>

      <svg height="100%" width="100%" viewBox="0 0 100 100">
        {hasFromRootInterval && (
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

        {[[0, 0], ...intervals].map(([q, r], idx) => {
          const noteNum = root + q * 2 + r * 7;
          const isRoot = q === 0 && r === 0;
          const {cx, cy} = axialToCenters({q, r});

          return (
            <Fragment key={idx}>
              <HexagonPointy
                {...axialToCenters({q, r})}
                fill={getNoteColorHsl(noteNum).toString({format: 'hex'})}
                stroke={(isRoot
                  ? getNoteColorHsl(noteNum).range(isLight ? 'black' : 'white')(0.5)
                  : colorClear).toString({format: 'hex'})}
              />

              <text
                fill="#000c"
                textAnchor="middle"
                dominantBaseline="central"
                style={{
                  fontSize: hexRad * 0.95,
                }}
                x={cx}
                y={cy}
              >
                {toSymbol(noteNum)}
              </text>

              <text
                fill="#0007"
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
            </Fragment>
          );
        })}

        {hasRootMotion && (
          <ArrowFromToHex
            from={arrowFrom}
            fromColor={getNoteColorHsl(fromNoteNum).range(isLight ? 'white' : 'black')(0.5).toString({format: 'hex'})}
            to={arrowTo}
            toColor={isLight ? '#000' : '#fff'}
          />
        )}
      </svg>
    </ChordDataFrame>
  );
}
