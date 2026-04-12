import {Box} from '@chakra-ui/react';
import {useColorMode} from '../../components/chakra-ui/color-mode.tsx';
import {useUniqueId} from '../../useUniqueId.ts';
import type {ReactNode, SVGProps} from 'react';

type HexagonPointyProps = SVGProps<SVGPolygonElement> & {
  r?: number;
  hexGap: number;
  cx?: number;
  cy?: number;
};

export function HexagonPointy({
  r = 10,
  hexGap,
  cx = 50,
  cy = 50,
  ...others
}: HexagonPointyProps) {
  const rWithGap = r - hexGap;
  const scale = rWithGap / 50;
  const translate = 50 - rWithGap;
  return (
    <svg x={cx - 50} y={cy - 50} viewBox="0 0 100 100">
      <polygon
        points="
                50,0
                93.3,25
                93.3,75
                50,100
                6.7,75
                6.7,25
              "
        fill="none"
        stroke="white"
        strokeWidth={hexGap / scale}
        transform={`translate(${translate},${translate}) scale(${scale})`}
        {...others}
      />
    </svg>
  );
}

type HexCenter = {
  cx: number;
  cy: number;
};

type ArrowFromToHexProps = SVGProps<SVGLineElement> & {
  from: HexCenter;
  fromColor: string;
  to: HexCenter;
  toColor: string;
  strokeWidth?: number;
};

export function ArrowFromToHex({
  from,
  fromColor,
  to,
  toColor,
  strokeWidth = 1,
  ...others
}: ArrowFromToHexProps) {
  const x1 = from.cx;
  const y1 = from.cy;
  const x2 = to.cx;
  const y2 = to.cy;

  const rotDeg = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  const rotRads = Math.atan2(y1 - y2, x2 - x1) + Math.PI / 2;

  function gradientEndpoints(angleRad: number) {
    const dy = Math.cos(angleRad);
    const dx = Math.sin(angleRad);

    const x1 = 0.5 - 0.5 * dx;
    const y1 = 0.5 - 0.5 * dy;
    const x2 = 0.5 + 0.5 * dx;
    const y2 = 0.5 + 0.5 * dy;

    return {x1, y1, x2, y2};
  }

  const gradId = `lineGrad${useUniqueId()}`;

  const {colorMode} = useColorMode();
  const isLight = colorMode === 'light';

  const strokeColor = isLight ? '#999' : '#fffa';

  return (
    <>
      <defs>
        <linearGradient
          id={gradId}
          {...gradientEndpoints(rotRads)}
        >
          <stop offset="0%" stopColor={`${fromColor}22`}/>
          <stop offset="20%" stopColor={`${fromColor}55`}/>
          <stop offset="30%" stopColor={fromColor}/>
          <stop offset="100%" stopColor={toColor}/>
        </linearGradient>
      </defs>

      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        {...others}
      />

      <svg x={x2 - 50} y={y2 - 50} viewBox="0 0 100 100">
        <g transform={`translate(50, 50) rotate(${rotDeg})`}>
          <line
            x1={0}
            y1={0}
            x2={-3}
            y2={-2}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth * 0.75}
            {...others}
          />
          <line
            x1={0}
            y1={0}
            x2={-3}
            y2={2}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth * 0.75}
            {...others}
          />
        </g>
      </svg>
    </>
  );
}

export function ChordDataFrame({children}: {children?: ReactNode}) {
  return (
    <Box
      borderRadius="3xl"
      border="solid 1px grey"
      w="18em"
      h="15em"
      zIndex={1}
      position="relative"
      fontSize="sm"
    >
      {children}
    </Box>
  );
}
