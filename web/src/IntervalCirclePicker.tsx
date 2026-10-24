import {useEffect, useMemo, useRef, useState} from 'react';
import {Box} from '@chakra-ui/react';
import {useColorMode} from './components/chakra-ui/color-mode.tsx';

export interface CircleInterval {
  point: number;
  labels: string[];
}

interface IntervalCirclePickerProps {
  intervals: CircleInterval[];
  value?: number;
  onChange?: (index: number) => void;
}

const SIZE = 330;
const CENTER = SIZE / 2;
const PATH_RADIUS = 125;
const TAU = Math.PI * 2;

const normalizePoint = (point: number) => ((point % 1) + 1) % 1;

const pointOnCircle = (point: number, radius: number) => {
  const angle = normalizePoint(point) * TAU - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  };
};

const circularDistance = (a: number, b: number) => {
  const distance = Math.abs(normalizePoint(a) - normalizePoint(b));
  return Math.min(distance, 1 - distance);
};

export function IntervalCirclePicker({
  intervals,
  value = 0,
  onChange,
}: IntervalCirclePickerProps) {
  const {colorMode} = useColorMode();
  const svgRef = useRef<SVGSVGElement>(null);
  const [previewIndex, setPreviewIndex] = useState(value);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => setPreviewIndex(value), [value]);

  const orderedIndices = useMemo(() => intervals
    .map((interval, index) => ({index, point: normalizePoint(interval.point)}))
    .sort((a, b) => a.point - b.point)
    .map(({index}) => index), [intervals]);

  const nearestIndex = (point: number) => intervals.reduce((nearest, interval, index) => (
    circularDistance(point, interval.point) < circularDistance(point, intervals[nearest].point)
      ? index
      : nearest
  ), 0);

  const indexFromPointer = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || intervals.length === 0) return 0;
    const x = clientX - (rect.left + rect.width / 2);
    const y = clientY - (rect.top + rect.height / 2);
    const point = normalizePoint((Math.atan2(y, x) + Math.PI / 2) / TAU);
    return nearestIndex(point);
  };

  const moveSelection = (direction: -1 | 1) => {
    if (orderedIndices.length === 0) return;
    const currentPosition = orderedIndices.indexOf(previewIndex);
    const nextPosition = (currentPosition + direction + orderedIndices.length) % orderedIndices.length;
    const nextIndex = orderedIndices[nextPosition];
    setPreviewIndex(nextIndex);
    onChange?.(nextIndex);
  };

  if (intervals.length === 0) return null;

  const selectedInterval = intervals[previewIndex] ?? intervals[0];
  const pointer = pointOnCircle(selectedInterval.point, PATH_RADIUS);
  const foreground = colorMode === 'light' ? '#1a202c' : '#f7fafc';

  return (
    <Box width={`${SIZE}px`} maxWidth="100%" aspectRatio="1" position="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width="100%"
        height="100%"
        role="slider"
        aria-label="Musical interval on a circle"
        aria-valuemin={0}
        aria-valuemax={intervals.length - 1}
        aria-valuenow={previewIndex}
        aria-valuetext={selectedInterval.labels.join(', ')}
        tabIndex={0}
        style={{cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none'}}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
            event.preventDefault();
            moveSelection(-1);
          } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
            event.preventDefault();
            moveSelection(1);
          }
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setIsDragging(true);
          setPreviewIndex(indexFromPointer(event.clientX, event.clientY));
        }}
        onPointerMove={(event) => {
          if (isDragging) setPreviewIndex(indexFromPointer(event.clientX, event.clientY));
        }}
        onPointerUp={(event) => {
          const nextIndex = indexFromPointer(event.clientX, event.clientY);
          setPreviewIndex(nextIndex);
          setIsDragging(false);
          onChange?.(nextIndex);
        }}
        onPointerCancel={() => {
          setPreviewIndex(value);
          setIsDragging(false);
        }}
      >
        <circle
          cx={CENTER}
          cy={CENTER}
          r={PATH_RADIUS}
          fill="none"
          stroke="grey"
          strokeWidth="20"
        />

        {intervals.map((interval, index) => {
          const tickStart = pointOnCircle(interval.point, PATH_RADIUS - 10);
          const tickEnd = pointOnCircle(interval.point, PATH_RADIUS + 10);
          return (
            <g key={`${normalizePoint(interval.point)}-${index}`}>
              <line
                x1={tickStart.x}
                y1={tickStart.y}
                x2={tickEnd.x}
                y2={tickEnd.y}
                stroke={foreground}
                strokeWidth="2"
              />
            </g>
          );
        })}

        <circle
          cx={pointer.x}
          cy={pointer.y}
          r="15"
          fill="white"
          stroke="grey"
          strokeWidth="1"
          pointerEvents="none"
        />
        <text
          x={CENTER}
          y={CENTER}
          fill={foreground}
          fontSize="22"
          textAnchor="middle"
          dominantBaseline="middle"
          pointerEvents="none"
        >
          {selectedInterval.labels[0]}
        </text>
      </svg>
    </Box>
  );
}
