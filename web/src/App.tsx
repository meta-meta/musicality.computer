import './App.css'
import {Heading} from "@chakra-ui/react";
import ColorMode from "./colorMode.tsx";
import {useTitle} from "./useTitle.tsx";

function App() {

  useTitle('musicality.computer')

  return (
    <>
      <ColorMode/>

      <Heading color="brand.900">musicality.computer</Heading>
    </>
  )
}

export default App
