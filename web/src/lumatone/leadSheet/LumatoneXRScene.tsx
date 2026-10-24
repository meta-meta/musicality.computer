import {useEffect, useMemo, useRef, useState} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {useXR, XROrigin} from '@react-three/xr';
import {
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Euler,
  Group,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {getNoteColorHsl} from '../colors.ts';
import type {CoordAxial} from '../lumatoneTypes.ts';
import {stellaChords, stellaDuration, stellaMelody} from './stella.ts';
import {chordLabel, pitchLabel} from './labels.ts';
import type {LabelMode} from './labels.ts';

const RADIUS = 0.105;
const BEAT_DEPTH = 0.12;
const MODEL_ROTATION = new Euler(-Math.PI / 3, -Math.PI / 8, 0);
const allPositions = [...stellaChords.flatMap(chord => chord.notes), ...stellaMelody].map(note => note.at);
const gridBounds = {
  minQ: Math.min(...allPositions.map(at => at.q)), maxQ: Math.max(...allPositions.map(at => at.q)),
  minR: Math.min(...allPositions.map(at => at.r)), maxR: Math.max(...allPositions.map(at => at.r)),
};
const projectedX = allPositions.map(({q, r}) => q + r / 2);
const centerX = (Math.min(...projectedX) + Math.max(...projectedX)) / 2;
const centerR = (gridBounds.minR + gridBounds.maxR) / 2;
const LABEL_FONT = '400 80px "JetBrains Mono", monospace';
const timeAt = (beat: number) => (7.5 - beat) * BEAT_DEPTH;
const OVERVIEW_SCALE = 0.2;
const overviewCenter = new Vector3(0, 0, timeAt((stellaDuration - 1) / 2)).applyEuler(MODEL_ROTATION).multiplyScalar(OVERVIEW_SCALE);
const pastOpacity = (start: number, duration: number, currentBeat: number) => {
  const age = currentBeat - (start + duration);
  return age < 0 ? 1 : Math.max(0.08, 0.3 * Math.exp(-age / 8));
};
const positionAt = ({q, r}: CoordAxial, beat: number): [number, number, number] => [
  Math.sqrt(3) * (q + r / 2 - centerX) * RADIUS,
  1.5 * (r - centerR) * RADIUS,
  timeAt(beat),
];

function useLabelFont() {
  const [fontReady, setFontReady] = useState(() => document.fonts.check(LABEL_FONT));
  useEffect(() => {
    if (fontReady) return;
    let mounted = true;
    void document.fonts.load(LABEL_FONT).then(() => {if (mounted) setFontReady(true);});
    return () => {mounted = false;};
  }, [fontReady]);
  return fontReady;
}

function NoteLabel({note, labelMode, radius, isLight, opacity}: {
  note: number; labelMode: LabelMode; radius: number; isLight: boolean; opacity: number;
}) {
  const fontReady = useLabelFont();
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const family = fontReady ? '"JetBrains Mono", monospace' : 'monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const pitch = pitchLabel(note, labelMode);
    ctx.font = `400 ${pitch.length > 1 ? 70 : 95}px ${family}`;
    ctx.fillStyle = isLight ? '#fffc' : '#000c';
    ctx.fillText(pitch, pitch.length > 1 ? 116 : 128, 128);
    ctx.font = `400 45px ${family}`;
    ctx.fillStyle = isLight ? '#fff7' : '#0007';
    ctx.fillText(String(Math.floor(note / 12) - 1), 173, 148);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [note, labelMode, isLight, fontReady]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh name={`note-label-${note}`} position={[0, 0, 0.006]} raycast={() => {}}>
      <planeGeometry args={[radius * 2.56, radius * 2.56]}/>
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} alphaTest={0.01} side={DoubleSide} toneMapped={false}/>
    </mesh>
  );
}

function Label({text, position, width = 0.32, aligned = false, opacity = 1}: {
  text: string;
  position: [number, number, number];
  width?: number;
  aligned?: boolean;
  opacity?: number;
}) {
  const fontReady = useLabelFont();
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = fontReady ? LABEL_FONT : '400 80px monospace';
    ctx.font = font;
    canvas.width = Math.max(128, Math.ceil(ctx.measureText(text).width) + 40);
    canvas.height = 128;
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#111820';
    ctx.fillStyle = '#f3f5f7';
    ctx.strokeText(text, canvas.width / 2, 64);
    ctx.fillText(text, canvas.width / 2, 64);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    result.userData.aspect = canvas.width / canvas.height;
    return result;
  }, [text, fontReady]);
  useEffect(() => () => texture.dispose(), [texture]);
  if (aligned) return (
    <mesh name={text} position={position} raycast={() => {}}>
      <planeGeometry args={[width, width / texture.userData.aspect]}/>
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} alphaTest={0.01} side={DoubleSide} toneMapped={false}/>
    </mesh>
  );
  return (
    <sprite name={text} position={position} scale={[width, width / texture.userData.aspect, 1]} raycast={() => {}}>
      <spriteMaterial map={texture} transparent opacity={opacity} depthWrite={false} alphaTest={0.01} toneMapped={false}/>
    </sprite>
  );
}

function Segment({from, to, color = '#687789', opacity = 0.6}: {
  from: [number, number, number];
  to: [number, number, number];
  color?: string;
  opacity?: number;
}) {
  const positions = useMemo(() => new Float32Array([...from, ...to]), [from, to]);
  return (
    <lineSegments>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]}/>
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} depthWrite={false}/>
    </lineSegments>
  );
}

function BarHexGrid({beat, opacity}: {beat: number; opacity: number}) {
  const grid = useMemo(() => {
    const fill: number[] = [];
    const edges: number[] = [];
    const seenEdges = new Set<string>();
    for (let q = gridBounds.minQ; q <= gridBounds.maxQ; q++) {
      for (let r = gridBounds.minR; r <= gridBounds.maxR; r++) {
        const [x, y] = positionAt({q, r}, 0);
        const corners = Array.from({length: 6}, (_, index) => {
          const angle = Math.PI / 2 + index * Math.PI / 3;
          return [x + RADIUS * Math.cos(angle), y + RADIUS * Math.sin(angle), 0];
        });
        corners.forEach((from, index) => {
          const to = corners[(index + 1) % 6];
          fill.push(x, y, 0, ...from, ...to);
          const key = [from, to].map(point => point.map(value => value.toFixed(6)).join(',')).sort().join('|');
          if (!seenEdges.has(key)) {
            seenEdges.add(key);
            edges.push(...from, ...to);
          }
        });
      }
    }
    return {fill: new Float32Array(fill), edges: new Float32Array(edges)};
  }, []);
  return (
    <group name="bar-hex-grid" position={[0, 0, timeAt(beat) - 0.012]}>
      <mesh raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[grid.fill, 3]}/>
        </bufferGeometry>
        <meshBasicMaterial color="#999999" opacity={0.1 * opacity} transparent depthWrite={false} side={DoubleSide} toneMapped={false}/>
      </mesh>
      <lineSegments raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[grid.edges, 3]}/>
        </bufferGeometry>
        <lineBasicMaterial color="#999999" opacity={0.18 * opacity} transparent depthWrite={false} toneMapped={false}/>
      </lineSegments>
    </group>
  );
}

function Hex({at, beat, note, labelMode, isLight, depth = 0.008, opacity = 1, selected = false, chord = false, root = false, onSelect}: {
  at: CoordAxial;
  beat: number;
  note: number;
  labelMode: LabelMode;
  isLight: boolean;
  depth?: number;
  opacity?: number;
  selected?: boolean;
  chord?: boolean;
  root?: boolean;
  onSelect?: () => void;
}) {
  const radius = RADIUS * (chord ? 1 : 0.35);
  const geometry = useMemo(() => {
    const result = new CylinderGeometry(radius, radius, depth, 6);
    result.rotateX(Math.PI / 2);
    return result;
  }, [radius, depth]);
  const outline = useMemo(() => new EdgesGeometry(geometry), [geometry]);
  useEffect(() => () => {geometry.dispose(); outline.dispose();}, [geometry, outline]);
  const base = positionAt(at, beat);
  const color = getNoteColorHsl(note).toString({format: 'hex'});
  return (
    <group name={chord ? 'chord-note' : 'melody-note'} position={[base[0], base[1], base[2] - depth / 2]}>
      <mesh geometry={geometry} onClick={onSelect ? event => {event.stopPropagation(); onSelect();} : undefined}>
        <meshBasicMaterial color={color} transparent opacity={(depth > 0.02 ? 0.62 : 1) * opacity} depthWrite={depth < 0.02 && opacity === 1} side={DoubleSide} toneMapped={false}/>
      </mesh>
      <lineSegments geometry={outline} raycast={() => {}}>
        <lineBasicMaterial color={chord ? getNoteColorHsl(note).range(isLight ? 'black' : 'white')(0.5).toString({format: 'hex'}) : selected ? '#ffbc83' : '#8290a0'} transparent opacity={(chord ? root ? 1 : 0 : selected ? 1 : 0.55) * opacity} depthWrite={false} toneMapped={false}/>
      </lineSegments>
      {depth < 0.02 && <NoteLabel note={note} labelMode={labelMode} radius={radius} isLight={isLight} opacity={opacity}/>}
    </group>
  );
}

function RootArrow({from, to, isLight, opacity}: {
  from: typeof stellaChords[number];
  to: typeof stellaChords[number];
  isLight: boolean;
  opacity: number;
}) {
  const positions = useMemo(() => {
    const start = new Vector3(...positionAt(from.notes.find(note => note.root)!.at, from.start));
    const end = new Vector3(...positionAt(to.notes.find(note => note.root)!.at, to.start));
    const direction = end.clone().sub(start).normalize();
    // Keep the open arrowhead transverse to time, like the SVG's two strokes.
    const side = new Vector3(-direction.y, direction.x, 0);
    if (side.lengthSq() < 0.001) side.set(1, 0, 0);
    side.normalize().multiplyScalar(0.025);
    end.addScaledVector(direction, -0.045);
    const head = end.clone().addScaledVector(direction, -0.065);
    return new Float32Array([
      ...start.toArray(), ...end.toArray(),
      ...head.clone().add(side).toArray(), ...end.toArray(),
      ...head.clone().sub(side).toArray(), ...end.toArray(),
    ]);
  }, [from, to]);
  return (
    <lineSegments name="chord-root-arrow" raycast={() => {}}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]}/></bufferGeometry>
      <lineBasicMaterial color={isLight ? '#999' : '#fff'} transparent opacity={opacity * (isLight ? 1 : 0.67)} depthWrite={false} toneMapped={false}/>
    </lineSegments>
  );
}

function DesktopCamera({reset, travel, showWhole}: {reset: number; travel: Vector3; showWhole: boolean}) {
  const {camera, gl, size} = useThree();
  const controls = useRef<OrbitControls>();
  const previousTravel = useRef(new Vector3());
  const session = useXR(state => state.session);
  useEffect(() => {
    const orbit = new OrbitControls(camera, gl.domElement);
    orbit.target.set(0, 1.35, -2.6);
    orbit.enableDamping = true;
    orbit.minDistance = 0.9;
    orbit.maxDistance = 12;
    controls.current = orbit;
    return () => {orbit.dispose(); controls.current = undefined;};
  }, [camera, gl]);
  useEffect(() => {
    if (controls.current) controls.current.enabled = !session;
  }, [session]);
  useEffect(() => {
    const delta = travel.clone().sub(previousTravel.current);
    if (!session) {
      camera.position.add(delta);
      controls.current?.target.add(delta);
      controls.current?.update();
    }
    previousTravel.current.copy(travel);
  }, [travel, camera, session]);
  useEffect(() => {
    if (session) return;
    const distance = Math.max(4.2, 4.8 / (size.width / size.height));
    camera.position.set(0, 1.55, -2.6 + distance).add(previousTravel.current);
    controls.current?.target.set(0, 1.35, -2.6).add(previousTravel.current);
    controls.current?.update();
  }, [reset, camera, session, size.width, size.height, showWhole]);
  useFrame(() => {if (!session) controls.current?.update();});
  return null;
}

function SceneButton({text, x, y = 0, onClick}: {text: string; x: number; y?: number; onClick: () => void}) {
  const button = useRef<Group>(null);
  const rotation = useMemo(() => ({camera: new Quaternion(), parent: new Quaternion()}), []);
  useFrame(({camera, gl}) => {
    if (!button.current) return;
    const viewer = gl.xr.isPresenting ? gl.xr.getCamera() : camera;
    viewer.getWorldQuaternion(rotation.camera);
    if (button.current.parent) {
      button.current.parent.getWorldQuaternion(rotation.parent);
      button.current.quaternion.copy(rotation.parent.invert()).multiply(rotation.camera);
    } else {
      button.current.quaternion.copy(rotation.camera);
    }
  });
  return (
    <group ref={button} name="scene-button" position={[x, y, 0]}>
      <mesh onClick={event => {event.stopPropagation(); onClick();}}>
        <boxGeometry args={[0.46, 0.16, 0.045]}/>
        <meshBasicMaterial color="#293746" toneMapped={false}/>
      </mesh>
      <Label text={text} position={[0, 0, 0.035]} width={0.42}/>
    </group>
  );
}

export function LumatoneXRScene({selected, showChords, showMelody, showWhole, labelMode, isLight, onSelect, onToggleChords, onToggleMelody, onToggleWhole, onToggleLabels, onExit, onReady, reset}: {
  selected: number;
  showChords: boolean;
  showMelody: boolean;
  showWhole: boolean;
  labelMode: LabelMode;
  isLight: boolean;
  onSelect: (index: number) => void;
  onToggleChords: () => void;
  onToggleMelody: () => void;
  onToggleWhole: () => void;
  onToggleLabels: () => void;
  onExit: () => void;
  onReady: (ready: boolean) => void;
  reset: number;
}) {
  const session = useXR(state => state.session);
  const mode = useXR(state => state.mode);
  const controlOffset = session ? 0.5 : 0.25;
  const attack = stellaMelody[selected];
  // Follow each onset along the composition's rotated z axis, while preserving
  // the user's orbit and zoom. The score itself stays at fixed world positions.
  const travel = useMemo(() => new Vector3(0, 0, showWhole ? 0 : -attack.start * BEAT_DEPTH).applyEuler(MODEL_ROTATION), [attack.start, showWhole]);
  // Limit rendering to nearby bars without moving the score.
  const focusBeat = Math.max(0, Math.floor(attack.start / 16) * 16);
  const firstBeat = showWhole ? -1 : Math.max(-1, focusBeat - 4);
  const lastBeat = showWhole ? stellaDuration : Math.min(stellaDuration, focusBeat + 16);
  const opacityAt = (start: number, duration: number) => showWhole ? 1 : pastOpacity(start, duration, attack.start);
  const inView = (start: number, duration: number) => start < lastBeat && start + duration > firstBeat;
  useEffect(() => {
    onReady(true);
    return () => onReady(false);
  }, [onReady]);
  return (
    <>
      {mode !== 'immersive-ar' && <color attach="background" args={['#111820']}/>}
      <DesktopCamera reset={reset} travel={travel} showWhole={showWhole}/>
      <XROrigin position={travel}/>
      <group name="composition" position={showWhole ? [-overviewCenter.x, 1.35 - overviewCenter.y, -2.6 - overviewCenter.z] : [0, 1.35, -2.6]} rotation={MODEL_ROTATION} scale={showWhole ? OVERVIEW_SCALE : 1}>
        <group name="time-window">
        {showMelody && stellaMelody.map((note, index) => {
          if (!inView(note.start, note.duration)) return null;
          const opacity = opacityAt(note.start, note.duration);
          return (
            <group key={index}>
              <Hex {...note} labelMode={labelMode} isLight={isLight} beat={note.start} depth={note.duration * BEAT_DEPTH} opacity={opacity} selected={index === selected} onSelect={() => onSelect(index)}/>
              <Hex {...note} labelMode={labelMode} isLight={isLight} beat={note.start} opacity={opacity} selected={index === selected} onSelect={() => onSelect(index)}/>
            </group>
          );
        })}
        {Array.from({length: 32}, (_, bar) => {
          if (!inView(bar * 4, 4)) return null;
          const opacity = opacityAt(bar * 4, 4);
          return <BarHexGrid key={bar} beat={bar * 4} opacity={opacity}/>;
        })}
        {stellaChords.map(chord => {
          if (!inView(chord.start, chord.duration)) return null;
          const opacity = opacityAt(chord.start, chord.duration);
          return (
            <group key={chord.start}>
              <Segment from={[-0.7, -0.7, timeAt(chord.start)]} to={[0.85, -0.7, timeAt(chord.start)]} opacity={0.6 * opacity}/>
              <Label text={`Bar ${chord.bar}${chord.duration < 4 ? ` · beat ${chord.start % 4 + 1}` : ''}${showChords ? ` · ${chordLabel(chord, labelMode)}` : ''}`} position={[1.15, -0.57, timeAt(chord.start + chord.duration / 2)]} width={0.65} opacity={opacity}/>
              {showChords && chord.notes.map((note, index) => (
                <Hex key={index} {...note} labelMode={labelMode} isLight={isLight} beat={chord.start} opacity={opacity} chord/>
              ))}
            </group>
          );
        })}
        {showChords && stellaChords.slice(1).map((chord, index) => inView(stellaChords[index].start, chord.start - stellaChords[index].start) && (
          <RootArrow key={chord.start} from={stellaChords[index]} to={chord} isLight={isLight} opacity={opacityAt(stellaChords[index].start, stellaChords[index].duration)}/>
        ))}
        <Segment from={[-0.7, -0.7, timeAt(firstBeat)]} to={[-0.7, -0.7, timeAt(lastBeat)]} color="#a5b3c2"/>
        <Label text={lastBeat === stellaDuration ? 'End' : 'Time · beats'} position={[-0.7, -0.7, timeAt(lastBeat + 0.8)]} width={0.5}/>
        {firstBeat < 0 && <Label text="Pickup" position={[-0.7, -0.7, timeAt(-1.7)]} width={0.3}/>}
        </group>
      </group>
      <group name="travel-controls" position={[travel.x, 3.5 + travel.y, -4.2 + travel.z]}>
        <SceneButton text="Previous" x={-1 - controlOffset} onClick={() => onSelect(Math.max(0, selected - 1))}/>
        <SceneButton text="Next" x={-0.5 - controlOffset} onClick={() => onSelect(Math.min(stellaMelody.length - 1, selected + 1))}/>
        <SceneButton text={showChords ? 'Chords: on' : 'Chords: off'} x={-controlOffset} onClick={onToggleChords}/>
        <SceneButton text={showMelody ? 'Melody: on' : 'Melody: off'} x={0.5 - controlOffset} onClick={onToggleMelody}/>
        <SceneButton text={labelMode === 'dozenal' ? 'Dozenal' : 'Jazz'} x={1 - controlOffset} onClick={onToggleLabels}/>
        <SceneButton text={showWhole ? 'View: whole' : 'View: follow'} x={1.5 - controlOffset} onClick={onToggleWhole}/>
        {session && <SceneButton text="Exit XR" x={2 - controlOffset} onClick={onExit}/>}
      </group>
    </>
  );
}
