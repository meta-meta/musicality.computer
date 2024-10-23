import {useEffect} from 'react';
import {useParams, useSearchParams} from 'react-router-dom';
import {MandelbrotControls} from './MandelbrotControls.tsx';
import {initialState, sketch} from './MandelbrotP5.ts';
import {useP5} from './useP5.tsx';
import {useTitle} from './useTitle.tsx';

export function MandelbrotMuse() {
  useTitle('Mandelbrot Muse');

  const {panX, panY, zoom} = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStateParams = {
    ...Object.fromEntries(searchParams),
    ...(panX && panY && zoom && {
      panX: parseFloat(panX),
      panY: parseFloat(panY),
      zoom: parseFloat(zoom),
    })
  };

  // console.log(initialStateParams);


  const {
    ref,
    sketchInstance,
    sketchState,
    setSketchState,
  } = useP5(sketch, initialState);

  useEffect(() => {
    setSketchState(s => ({
      ...s,
      ...initialStateParams,
    }))
  }, []);

  // @ts-expect-error sketchInstance for debug
  window.sketchInstance = sketchInstance;

  useEffect(() => {
    const setIsPortrait = () => {
      setSketchState(s => ({
        ...s,
        isPortraitLayout: window.screen.orientation.type.startsWith('portrait'),
      }));
    };

    window.addEventListener('orientationchange', (e) => {
      setIsPortrait();
    })
  }, []);

  return (<>
    <div
      ref={ref}
      style={{
        alignSelf: 'start',
        background: 'radial-gradient(circle, rgba(74,153,117,1) 0%, rgba(188,148,233,0.6943726953672094) 100%)',
        height: sketchState.isPortraitLayout ? '200vw' : '100vh',
        width: sketchState.isPortraitLayout ? '100vw' : '200vh',
      }}
    />
    <MandelbrotControls
      setState={setSketchState}
      state={sketchState}
    />

  </>);
}
