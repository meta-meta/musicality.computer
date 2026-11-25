import type {SVGProps} from 'react';

// Small monochrome drawings avoid platform-dependent emoji glyphs.
function instrumentIconKind(id?: string) {
  if (['flute', 'piccolo', 'alto-flute', 'bass-flute'].includes(id ?? '')) return 'flute';
  if (id === 'bb' || id === 'a-clarinet') return 'clarinet';
  if (['soprano-sax', 'alto-sax', 'tenor-sax', 'baritone-sax'].includes(id ?? '')) return 'saxophone';
  if (id === 'bb-trumpet') return 'trumpet';
  if (id === 'guitar') return 'guitar';
  if (id === 'horn') return 'horn';
  if (id === 'ewi') return 'ewi';
  return 'unknown';
}

export function InstrumentIcon({instrumentId, size = 18, ...props}: SVGProps<SVGSVGElement> & {instrumentId?: string; size?: number}) {
  const kind = instrumentIconKind(instrumentId);
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
    style={{display: 'inline-block', verticalAlign: 'middle', flexShrink: 0}} {...props} data-instrument-icon={kind}>
    <g fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      {kind === 'flute' && <>
        <path d="M3 17 19 4l3 3L6 20ZM17 6l3 3M4 16l3 3"/>
        <path d="m9 15 .1-.1m2.3-1.8 .1-.1m2.3-1.8 .1-.1m2.3-1.8 .1-.1" strokeWidth={2.2}/>
        <path d="m19 5 1 1" strokeWidth={2.4}/>
      </>}
      {kind === 'clarinet' && <>
        <path d="m13 2-2 4v11l-3 4h10l-3-4V6l-2-4ZM11 7h4M11 17h4M8 21h10"/>
        <path d="M12 10h2m-2 3h2m-2 3h2"/>
      </>}
      {kind === 'saxophone' && <>
        <path d="M6 3h5l2 3v11a3 3 0 0 0 6 0v-4l-3-2 6-2-1 8a5 5 0 0 1-10 0V7L9 5H6"/>
        <path d="M13 9h2m-2 3h2m-2 3h2m3-3 3-1"/>
      </>}
      {kind === 'trumpet' && <>
        <path d="M2 9h3l12-1 5-4v14l-5-4H8a3 3 0 0 1 0-6M5 9v4M8 14v4h8v-4M9 8V5m4 3V5m4 3V5M8 5h2m2 0h2m2 0h2"/>
      </>}
      {kind === 'guitar' && <>
        <path d="m14 8 5-6 3 3-6 5M18 3l3 3M13 8c-3-2-6 0-5 3-4-1-7 4-4 7s8 0 7-4c3 1 5-2 3-5Z"/>
        <circle cx={10} cy={12} r={1.8}/><path d="m6 16 2 2m2-6 10-9"/>
      </>}
      {kind === 'horn' && <>
        <path d="M12 3H8L6 6l2 3a7 7 0 1 0 11 7l-4-4 7-2-1 11-4-3"/>
        <circle cx={10} cy={15} r={3.5}/><path d="M10 9V7h5v6m-3-5v5m2-5v5"/>
      </>}
      {kind === 'ewi' && <>
        <path d="M10 2h4l1 3v14l-1 3h-4l-1-3V5Z"/>
        <path d="M12 8h.01M12 11h.01M12 14h.01M12 17h.01" strokeWidth={2.2}/>
      </>}
      {kind === 'unknown' && <><circle cx={12} cy={12} r={9}/><path d="M9.5 9a2.5 2.5 0 1 1 4 2l-1.5 1.5V14M12 17h.01"/></>}
    </g>
  </svg>;
}
