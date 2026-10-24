import './App.css'
import ColorMode from "./colorMode.tsx";
// import {MandelbrotMuse} from './MandelbrotMuse.tsx';
import {useTitle} from "./useTitle.tsx";
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {Home} from "./Home.tsx";
import {VR} from "./VR.tsx";
import {Theremin} from './Theremin.tsx';
import {Lumatone} from './Lumatone.tsx';
import {useMidiInitialization} from './useMidiInitialization.ts';
import {lazy, Suspense} from 'react';

const LumatoneXR = lazy(() => import('./LumatoneXR.tsx'));

function App() {

  useTitle('musicality.computer')
  useMidiInitialization();

  return (
    <>
      <BrowserRouter>
        <Routes>
          {/*<Route path="/mm?/*" element={null}/>*/}
          <Route path="*" element={<ColorMode/>}/>
        </Routes>

        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/vr" element={<VR/>}/>
          <Route path="/lumatone" element={<Lumatone/>}/>
          <Route path="/lumatone/xr" element={<Suspense fallback={<div>Loading 3D view…</div>}><LumatoneXR/></Suspense>}/>
          <Route path="/theremin/*" element={<Theremin/>}/>
          {/*<Route path="/mm/:panX?/:panY?/:zoom?" element={<MandelbrotMuse/>}/>*/}
        </Routes>

      </BrowserRouter>
    </>
  )
}

export default App
