import './App.css'
import ColorMode from "./colorMode.tsx";
// import {MandelbrotMuse} from './MandelbrotMuse.tsx';
import {useTitle} from "./useTitle.tsx";
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {Home} from "./Home.tsx";
import {VR} from "./VR.tsx";
import {Theremin} from './Theremin.tsx';

function App() {

  useTitle('musicality.computer')

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
          <Route path="/theremin/*" element={<Theremin/>}/>
          {/*<Route path="/mm/:panX?/:panY?/:zoom?" element={<MandelbrotMuse/>}/>*/}
        </Routes>

      </BrowserRouter>
    </>
  )
}

export default App
