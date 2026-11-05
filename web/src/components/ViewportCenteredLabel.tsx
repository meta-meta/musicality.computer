import {createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef} from 'react';
import type {ReactNode, RefObject, SVGProps} from 'react';
import {visibleSpanLabelCenter} from './visibleSpanLabelCenter.ts';

type Label = {element: SVGGElement; start: number; end: number; width: number; smoothingMs: number};
type Registry = {register: (label: Label) => () => void};
const LabelRegistry = createContext<Registry | null>(null);
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Wrap the scroll container and its SVG, sharing listeners and batched resize work.
 * Label spans and children use the referenced SVG's unrotated coordinate system.
 */
export function ViewportCenteredLabels({viewportRef, svgRef, children}: {
  viewportRef: RefObject<HTMLElement>; svgRef: RefObject<SVGSVGElement>; children: ReactNode;
}) {
  const labels = useRef(new Set<Label>());
  const requestUpdate = useRef<() => void>(() => {});
  const register = useCallback((label: Label) => {
    labels.current.add(label); requestUpdate.current();
    return () => {labels.current.delete(label);};
  }, []);
  const registry = useMemo(() => ({register}), [register]);
  useBrowserLayoutEffect(() => {
    const viewport = viewportRef.current, svg = svgRef.current;
    if (!viewport || !svg) return;
    let frame: number | null = null;
    const positions = new WeakMap<Label, number | null>();
    const update = () => {
      const box = viewport.getBoundingClientRect(), matrix = svg.getScreenCTM();
      if (!matrix || matrix.a <= 0) return;
      const left = (Math.max(0, box.left + viewport.clientLeft) - matrix.e) / matrix.a;
      const right = (Math.min(window.innerWidth, box.left + viewport.clientLeft + viewport.clientWidth) - matrix.e) / matrix.a;
      labels.current.forEach(label => {
        const center = visibleSpanLabelCenter(label.start, label.end, left, right, label.width);
        const previous = positions.get(label);
        if (previous === center) return;
        if (previous === undefined || (previous === null) !== (center === null))
          label.element.style.visibility = center === null ? 'hidden' : 'visible';
        if (center !== null) {
          // Snap on mount/re-entry; only interpolate continuous visible motion.
          label.element.style.transitionDuration = previous === undefined || previous === null ? '0ms' : `${label.smoothingMs}ms`;
          label.element.style.transform = `translate(${center}px, 0px)`;
        }
        positions.set(label, center);
      });
    };
    const schedule = () => {if (frame === null) frame = requestAnimationFrame(() => {frame = null; update();});};
    // Scroll events already arrive with the browser's scroll update. Waiting
    // for another RAF makes labels visibly trail compositor-driven scrolling.
    const onScroll = () => {
      if (frame !== null) {cancelAnimationFrame(frame); frame = null;}
      update();
    };
    requestUpdate.current = schedule;
    const resize = new ResizeObserver(schedule);
    resize.observe(viewport); resize.observe(svg);
    const attributes = new MutationObserver(schedule);
    attributes.observe(svg, {attributes: true, attributeFilter: ['viewBox', 'preserveAspectRatio']});
    window.addEventListener('scroll', onScroll, {passive: true, capture: true});
    window.addEventListener('resize', schedule);
    update();
    return () => {
      requestUpdate.current = () => {};
      resize.disconnect(); attributes.disconnect();
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', schedule);
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [viewportRef, svgRef]);
  return <LabelRegistry.Provider value={registry}>
    <style>{`[data-viewport-centered-label] { transition-property: transform; transition-timing-function: linear; }
      @media (prefers-reduced-motion: reduce) { [data-viewport-centered-label] { transition: none !important; } }`}</style>
    {children}
  </LabelRegistry.Provider>;
}

/** Children are horizontally centered around x=0; labelWidth includes icons.
 * This component owns its group's transform and visibility, and leaves y to children.
 */
export function ViewportCenteredLabel({start, end, labelWidth, smoothingMs = 0, children, ...props}: Omit<SVGProps<SVGGElement>, 'transform'> & {
  start: number; end: number; labelWidth: number; smoothingMs?: number;
}) {
  const registry = useContext(LabelRegistry);
  const ref = useRef<SVGGElement>(null);
  if (!registry) throw new Error('ViewportCenteredLabel requires ViewportCenteredLabels around the scroll container.');
  useBrowserLayoutEffect(() => {
    if (!ref.current) return;
    return registry.register({element: ref.current, start, end, width: labelWidth, smoothingMs: Math.max(0, smoothingMs)});
  }, [registry, start, end, labelWidth, smoothingMs]);
  return <g {...props} ref={ref} data-viewport-centered-label="" data-span-start={start} data-span-end={end}
    data-label-width={labelWidth} transform={`translate(${(start + end) / 2},0)`}>{children}</g>;
}
