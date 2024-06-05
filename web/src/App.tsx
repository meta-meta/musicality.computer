import './App.css'
import ColorMode from "./colorMode.tsx";
import {useTitle} from "./useTitle.tsx";
import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {Home} from "./Home.tsx";
import {VR} from "./VR.tsx";

function App() {

  useTitle('musicality.computer')

  return (
    <>
      <ColorMode/>

      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/vr" element={<VR/>}/>
        </Routes>

      </BrowserRouter>
    </>
  )
}

export default App
