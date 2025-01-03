import {Card, Center, Grid, GridItem, Heading, Image, Link, Stack, Text, useBreakpointValue} from '@chakra-ui/react';
import {NotePicker} from './NotePicker.tsx';
import LumatoneEditor from './lumatone/LumatoneEditor.tsx';
import MidiConfig from './MidiConfig.tsx';
import ExternalLink from './components/ExternalLink.tsx';


export function Home() {

  const columns = useBreakpointValue(
    {
      base: 1,
      md: 2,
      lg: 3,
      xl: 4,
      xxl: 5,
    },
  ) || 1;

  return (

    <Stack textAlign="center" p={2}>
      <Heading color="brand.900">musicality.computer</Heading>

      <Grid
        gap={2}
        gridTemplateColumns={`repeat(${columns}, 1fr)`}
        gridTemplateRows="auto"
      >
        <GridItem>
          <Card.Root h="full">
            <Card.Header>A place for refactoring music.</Card.Header>
            <Card.Body>
              <Text>Born out of&nbsp;
                <ExternalLink
                  href="https://meta-meta.github.io/aframe-musicality/"
                  label="aframe-musicality"
                />
              </Text>

              <br/>
              <br/>

              <Card.Root h="full">
                <Card.Header>Musicality VR</Card.Header>
                <Card.Body>
                  <Link textDecoration="underline" href="vr" display="block">
                    <Image
                      src="/musicality-vr.png"
                      borderRadius="lg"
                    />
                  </Link>
                </Card.Body>
              </Card.Root>

            </Card.Body>
          </Card.Root>
        </GridItem>

        <GridItem>
          <MidiConfig/>
        </GridItem>

        <GridItem>
          <Card.Root h="full">
            <Card.Header>Log Knob</Card.Header>
            <Card.Body>
              <Text>Embrace the octave with a log2 circular frequency picker.</Text>
              <br/><br/>

              <Center>
                <NotePicker/>
              </Center>

            </Card.Body>
          </Card.Root>
        </GridItem>

        {columns > 1 && (
          <GridItem colSpan={columns}>
            <LumatoneEditor/>
          </GridItem>
        )}

      </Grid>
    </Stack>

  );
}
