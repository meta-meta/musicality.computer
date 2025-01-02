import {Card, Center, Heading, Link, Stack, Text} from '@chakra-ui/react';
import {NotePicker} from './NotePicker.tsx';
import LumatoneEditor from './lumatone/LumatoneEditor.tsx';
import MidiConfig from './MidiConfig.tsx';


export function Home() {
  return (
    <Stack textAlign="center" p={10}>
      <Heading color="brand.900">musicality.computer</Heading>

      <Card.Root>
        <Card.Header>A place for the future, in the future.</Card.Header>
        <Card.Body>
          <Text>Great stuff coming soon.</Text>
          <br/><br/>
          <Link textDecoration="underline" href="https://meta-meta.github.io/aframe-musicality/">Until then, check out
            the
            legacy site.
          </Link>

          <br/>
          <br/>
          <Link textDecoration="underline" href="vr">or Musicality VR
          </Link>
        </Card.Body>
      </Card.Root>

      <MidiConfig />

      <LumatoneEditor/>

      <Card.Root maxW="sm">
        <Card.Header>Circle Control</Card.Header>
        <Card.Body>
          <Text>Embrace the octave with a log2 circular frequency picker.</Text>
          <br/><br/>

          <Center>
            <NotePicker/>
          </Center>

        </Card.Body>
      </Card.Root>

    </Stack>
  );
}
