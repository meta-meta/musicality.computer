import {
  Card,
  Center,
  Code,
  Flex,
  Grid,
  GridItem,
  Heading,
  Image,
  Link,
  Stack,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import {NotePicker} from './NotePicker.tsx';
import LumatoneEditor from './lumatone/LumatoneEditor.tsx';
import MidiConfig from './MidiConfig.tsx';
import ExternalLink from './components/ExternalLink.tsx';
import {FlashCards} from './FlashCards.tsx';
import {FaWikipediaW} from 'react-icons/fa6';


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

        <GridItem>
          <Card.Root h="full">
            <Card.Header>Flash Cards</Card.Header>
            <Card.Body>
              <FlashCards/>
            </Card.Body>
          </Card.Root>
        </GridItem>

        <GridItem>
          <Card.Root h="full">
            <Card.Header>Jazz Chords</Card.Header>
            {/*https://w3c.github.io/smufl/latest/tables/scale-degrees.html*/}
            {/*https://w3c.github.io/smufl/latest/tables/chord-symbols.html*/}
            {/*https://w3c.github.io/smufl/latest/tables/standard-accidentals-for-chord-symbols.html*/}

            <Card.Body gap={2}>
              <Flex justifyContent="space-between" gap={2}>
                <Code fontSize="lg" >0+47</Code>
                <Code fontSize="lg" fontFamily="Bravura">C</Code>
                <Code fontSize="lg" fontFamily="Bravura">CM</Code>
                <Code fontSize="lg" fontFamily="Bravura">Cmaj</Code>
                <Code fontSize="lg" fontFamily="Bravura">C</Code>
                <ExternalLink
                  label="Major triad"
                  href="https://en.wikipedia.org/wiki/Major_chord"
                  icon={<FaWikipediaW/>}
                />
              </Flex>

              <Flex justifyContent="space-between" gap={2}>
                <Code fontSize="lg" >0+37</Code>
                <Code fontSize="lg" fontFamily="Bravura">Cm</Code>
                <Code fontSize="lg" fontFamily="Bravura">CM</Code>
                <Code fontSize="lg" fontFamily="Bravura">Cmin</Code>
                <Code fontSize="lg" fontFamily="Bravura">C</Code>
                <ExternalLink
                  label="Minor triad"
                  href="https://en.wikipedia.org/wiki/Minor_chord"
                  icon={<FaWikipediaW/>}
                />
              </Flex>

              <Flex justifyContent="space-between" gap={2}>
                <Code fontSize="lg" >0+48</Code>
                <Code fontSize="lg" fontFamily="Bravura">Caug</Code>
                <Code fontSize="lg" fontFamily="Bravura">C</Code>
                <ExternalLink
                  label="Augmented triad"
                  href="https://en.wikipedia.org/wiki/Augmented_triad"
                  icon={<FaWikipediaW/>}
                />
              </Flex>

              <Flex justifyContent="space-between" gap={2}>
                <Code fontSize="lg" >0+36</Code>
                <Code fontSize="lg" fontFamily="Bravura">Cdim</Code>
                <Code fontSize="lg" fontFamily="Bravura">Cm<sup>5</sup></Code> {/*sup?*/}
                <Code fontSize="lg" fontFamily="Bravura">C</Code>
                <ExternalLink
                  label="Diminished triad"
                  href="https://en.wikipedia.org/wiki/Diminished_triad"
                  icon={<FaWikipediaW/>}
                />
              </Flex>

              <Flex justifyContent="space-between" gap={2}>
                <Code fontSize="lg" >0+369</Code>
                <Code fontSize="lg" fontFamily="Bravura">Cdim<sup>7</sup></Code>
                <Code fontSize="lg" fontFamily="Bravura">Cm<sup>65</sup></Code> {/*inversion enharmonic*/}
                <Code fontSize="lg" fontFamily="Bravura">C<sup>7</sup></Code>
                <ExternalLink
                  label="Diminished seventh"
                  href="https://en.wikipedia.org/wiki/Diminished_seventh_chord"
                  icon={<FaWikipediaW/>}
                />
              </Flex>

              <Flex justifyContent="space-between" gap={2}>
                <Code fontSize="lg" >0+36૪</Code>
                <Code fontSize="lg" fontFamily="Bravura">Cm7(5)</Code>
                <Code fontSize="lg" fontFamily="Bravura">C<sup>7</sup></Code>
                <ExternalLink
                  label="Half-diminished seventh"
                  href="https://en.wikipedia.org/wiki/Half-diminished_seventh_chord"
                  icon={<FaWikipediaW/>}
                />
              </Flex>

              {/*TODO */}

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
