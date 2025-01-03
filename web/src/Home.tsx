import {
  Card,
  Center,
  Grid,
  GridItem,
  Heading,
  Link,
  SimpleGrid,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
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
      <Heading color="brand.900">{columns} musicality.computer</Heading>

      <Grid
        gridTemplateColumns={`repeat(${columns}, 1fr)`}
        gridTemplateRows="auto"
        // columns={{ base: 1, md: 2, lg: 3 }}
        gap={2}
        // autoColumns={true}
        // autoRows="max-content"
        // minChildWidth="md"
        // p={2}
        // position="relative"
        // rowGap={2}
      >
        <GridItem>
          <Card.Root>
            <Card.Header>A home for soundtoys and soundtools.</Card.Header>
            <Card.Body>
              <Text>Great stuff coming soon.</Text>
              <br/><br/>

              <Text>Born out of&nbsp;
                <ExternalLink
                  href="https://meta-meta.github.io/aframe-musicality/"
                  label="aframe-musicality"
                />
              </Text>

              <br/>
              <br/>
              <Link textDecoration="underline" href="vr">
                Musicality VR
              </Link>
            </Card.Body>
          </Card.Root>
        </GridItem>

        <GridItem>
          <MidiConfig/>
        </GridItem>

        <GridItem>
          <Card.Root>
            <Card.Header>Circle Control</Card.Header>
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
