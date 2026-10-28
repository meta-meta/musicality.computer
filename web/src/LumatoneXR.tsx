import {Box, Button, Flex, Heading, Link, Stack, Text} from '@chakra-ui/react';
import {Component, useEffect, useState} from 'react';
import type {ReactNode} from 'react';
import {Link as RouterLink} from 'react-router-dom';
import {Canvas} from '@react-three/fiber';
import {createXRStore, XR} from '@react-three/xr';
import {LumatoneXRScene} from './lumatone/leadSheet/LumatoneXRScene.tsx';
import {overlapsAttack, stellaChords, stellaMelody} from './lumatone/leadSheet/stella.ts';
import {chordLabel} from './lumatone/leadSheet/labels.ts';
import type {LabelMode} from './lumatone/leadSheet/labels.ts';
import {useColorMode} from './components/chakra-ui/color-mode.tsx';

class SceneBoundary extends Component<{children: ReactNode}, {failed: boolean}> {
  state = {failed: false};
  static getDerivedStateFromError() {return {failed: true};}
  render() {
    return this.state.failed
      ? <Text p={4}>The 3D view could not start. Enable WebGL in your browser and reload this page.</Text>
      : this.props.children;
  }
}

export default function LumatoneXR() {
  if (!stellaMelody.length) return <Text p={6}>No local arrangement is installed for the XR view.</Text>;
  return <ArrangementXR/>;
}
function ArrangementXR() {
  const {colorMode} = useColorMode();
  const [store] = useState(() => createXRStore({emulate: false, offerSession: false, enterGrantedSession: false}));
  const [selected, setSelected] = useState(5);
  const [showChords, setShowChords] = useState(true);
  const [showMelody, setShowMelody] = useState(true);
  const [showWhole, setShowWhole] = useState(false);
  const [labelMode, setLabelMode] = useState<LabelMode>('dozenal');
  const [reset, setReset] = useState(0);
  const [support, setSupport] = useState({vr: false, ar: false, checking: true});
  const [session, setSession] = useState<XRSession>();
  const [error, setError] = useState('');
  const [entering, setEntering] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      const xr = navigator.xr;
      if (!xr || !window.isSecureContext) {
        setSupport({vr: false, ar: false, checking: false});
        return;
      }
      const [vr, ar] = await Promise.allSettled([
        xr.isSessionSupported('immersive-vr'), xr.isSessionSupported('immersive-ar'),
      ]);
      if (!cancelled) setSupport({vr: vr.status === 'fulfilled' && vr.value, ar: ar.status === 'fulfilled' && ar.value, checking: false});
    };
    void check();
    const unsubscribe = store.subscribe(state => {if (!cancelled) setSession(state.session);});
    return () => {
      cancelled = true;
      unsubscribe();
      void store.getState().session?.end().catch(() => {});
    };
  }, [store]);

  const enter = async (mode: 'vr' | 'ar') => {
    setError('');
    setEntering(true);
    try {
      if (mode === 'vr') await store.enterVR();
      else await store.enterAR();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'The headset session could not start.');
    } finally {
      setEntering(false);
    }
  };
  const exit = async () => {
    try {await store.getState().session?.end();}
    catch (reason) {setError(reason instanceof Error ? reason.message : 'The headset session could not close.');}
  };
  const attack = stellaMelody[selected];
  const activeChords = stellaChords.filter(chord => overlapsAttack(attack, chord.start, chord.duration));

  return (
    <Stack p={3} gap={3} fontFamily="'JetBrains Mono', monospace">
      <Link asChild textDecoration="underline" alignSelf="start"><RouterLink to="/lumatone">Back to Lumatone</RouterLink></Link>
      <Heading as="h1">Stella through time</Heading>
      <Text>Stella’s full 32-bar form, with pickup. Hexes show intervals; depth shows elapsed beats. Thin columns are melody durations; full hexes are chord voicings. Arrows connect successive chord roots.</Text>
      <Flex gap={2} wrap="wrap" align="center">
        <Button disabled={selected === 0} onClick={() => setSelected(value => value - 1)}>Previous attack</Button>
        <Button disabled={selected === stellaMelody.length - 1} onClick={() => setSelected(value => value + 1)}>Next attack</Button>
        <Flex as="label" gap={2} align="center">Go to
          <select aria-label="Go to bars" defaultValue="" onChange={event => {
            const beat = Number(event.target.value) * 16;
            const index = stellaMelody.findIndex(note => note.start >= beat);
            setSelected(index < 0 ? stellaMelody.length - 1 : index);
            event.target.value = '';
          }}>
            <option value="" disabled>Choose…</option>
            {Array.from({length: 8}, (_, index) => <option key={index} value={index}>Bars {index * 4 + 1}–{index * 4 + 4}</option>)}
          </select>
        </Flex>
        <Flex as="label" gap={2} align="center"><input type="checkbox" checked={showChords} onChange={event => setShowChords(event.target.checked)}/>Chords</Flex>
        <Flex as="label" gap={2} align="center"><input type="checkbox" checked={showMelody} onChange={event => setShowMelody(event.target.checked)}/>Melody</Flex>
        <Flex as="label" gap={2} align="center"><input type="checkbox" checked={showWhole} onChange={event => setShowWhole(event.target.checked)}/>Whole composition</Flex>
        <Button variant="outline" aria-pressed={labelMode === 'jazz'} onClick={() => setLabelMode(value => value === 'dozenal' ? 'jazz' : 'dozenal')}>Labels: {labelMode === 'dozenal' ? 'Dozenal' : 'Jazz'}</Button>
        <Button variant="outline" onClick={() => setReset(value => value + 1)}>Reset view</Button>
        {session ? <Button onClick={() => void exit()}>Exit XR</Button> : <>
          <Button disabled={!sceneReady || !support.vr || entering} onClick={() => void enter('vr')}>Enter VR</Button>
          {support.ar && <Button disabled={!sceneReady || entering} onClick={() => void enter('ar')}>Enter AR</Button>}
        </>}
      </Flex>
      <Text aria-live="polite">{attack.location}{showChords && activeChords.length > 0 ? ` · ${activeChords.map(chord => chordLabel(chord, labelMode)).join(' / ')}` : ''}</Text>
      {error && <Text role="alert" color="red.500">{error}</Text>}
      <Box height="min(72vh, 800px)" minHeight="420px" bg="#111820" borderRadius="lg" overflow="hidden">
        <SceneBoundary>
          <Canvas camera={{position: [0, 1.55, 0.8], fov: 48, near: 0.05, far: 30}} dpr={[1, 1.5]} fallback={<Text p={4}>This browser does not support WebGL.</Text>}>
            <XR store={store}>
              <LumatoneXRScene selected={selected} showChords={showChords} showMelody={showMelody} showWhole={showWhole} labelMode={labelMode} isLight={colorMode === 'light'} onSelect={setSelected} onToggleChords={() => setShowChords(value => !value)} onToggleMelody={() => setShowMelody(value => !value)} onToggleWhole={() => setShowWhole(value => !value)} onToggleLabels={() => setLabelMode(value => value === 'dozenal' ? 'jazz' : 'dozenal')} onExit={() => void exit()} onReady={setSceneReady} reset={reset}/>
            </XR>
          </Canvas>
        </SceneBoundary>
      </Box>
      <Text color="fg.muted" fontSize="sm">Drag to orbit, scroll to zoom, and click a melody note to select it. In a headset, point and select notes or the controls above the model.</Text>
      {!session && <Text color="fg.muted" fontSize="sm">
        {support.checking ? 'Checking headset support…' : !window.isSecureContext
          ? 'Headset access requires HTTPS or localhost. Desktop controls are available here.'
          : !support.vr && !support.ar ? 'No immersive headset session is available in this browser. You can explore the scene with desktop controls.'
            : 'Use Enter VR or Enter AR to open the scene in your headset.'}
      </Text>}
    </Stack>
  );
}
