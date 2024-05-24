import './App.css'
import {Card, CardBody, CardHeader, Heading, Link, Text} from "@chakra-ui/react";
import ColorMode from "./colorMode.tsx";
import {useTitle} from "./useTitle.tsx";

function App() {

  useTitle('musicality.computer')

  return (
    <>
      <ColorMode/>

      <Heading color="brand.900">musicality.computer</Heading>

      <Card>
        <CardHeader>A place for the future, in the future.</CardHeader>
        <CardBody>
          <Text>Great stuff coming soon.</Text>
          <br/><br/>
          <Link textDecoration="underline" href="https://meta-meta.github.io/aframe-musicality/">Until then, check out the legacy site.</Link>
        </CardBody>
      </Card>
    </>
  )
}

export default App
