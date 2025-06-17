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
import {ReactNode} from 'react';
import {UkeChords} from './UkeChords.tsx';
import {LumatoneChords} from './LumatoneChords.tsx';


type ChordFamProps = {
  integerName: string;
  wikiLabel: string;
  wikiUrl: string;
  classicNames: ReactNode[];
}

function ChordFam({
  integerName = '',
  classicNames = [],
  wikiLabel = '',
  wikiUrl = '',
}: ChordFamProps) {
  return (
    <Flex
      border="solid 1px"
      borderRadius="md"
      p={1}
      justifyContent="space-between"
      gap={2}
    >
      <Code fontFamily="Jetbrains Mono" fontSize="lg">{integerName}</Code>
      {classicNames.map((cn, i) => (
        <Code
          fontFamily="Bravura"
          fontSize="lg"
          key={i}
        >
          <Text position="relative" top="0.333em">{/*hack for Bravura - should go away with Bravura-Text*/}
            {cn}
          </Text>
        </Code>
      ))}
      {wikiUrl && (
        <ExternalLink
          label={wikiLabel}
          href={`https://en.wikipedia.org/wiki/${wikiUrl}`}
          icon={<FaWikipediaW/>}
        />)}
    </Flex>);
}

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
              <Text>
                Embrace the octave with a 2<sup>n</sup> circular frequency picker. <br/>
                Freq (Hz) = 2<sup>n</sup> where n = number of turns
              </Text>
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
              <ChordFam
                classicNames={[`C`, `CM`, `Cmaj`, `C`]}
                integerName="0+47"
                wikiLabel="Major triad"
                wikiUrl="Major_chord"
              />

              <ChordFam
                classicNames={[`Cm`, `Cmin`, `C`]}
                integerName="0+37"
                wikiLabel="Minor triad"
                wikiUrl="Minor_chord"
              />

              <ChordFam
                classicNames={[`Caug`, `C`]}
                integerName="0+48"
                wikiLabel="Augmented triad"
                wikiUrl="Augmented_chord"
              />

              <ChordFam
                classicNames={[`Cdim`, <>Cm<sup>5</sup></>, `C`]}
                integerName="0+36"
                wikiLabel="Diminished triad"
                wikiUrl="Diminished_chord"
              />

              <ChordFam
                classicNames={[
                  <>Cdim<sup>7</sup></>,
                  <>Cm<sup>65</sup></>, /*inversion enharmonic*/
                  <>C<sup>7</sup></>,
                ]}
                integerName="0+369"
                wikiLabel="Diminished seventh"
                wikiUrl="Diminished_seventh_chord"
              />

              <ChordFam
                classicNames={[
                  <>Cm<sup>7(5)</sup></>,
                  <>C<sup>7</sup></>,
                ]}
                integerName="0+36૪"
                wikiLabel="Half-diminished seventh"
                wikiUrl="Half-diminished_seventh_chord"
              />

              (...) more to come...
            </Card.Body>
          </Card.Root>
        </GridItem>

        <GridItem>
          <Card.Root h="full">
            <Card.Header>Uke Chords</Card.Header>
            <Card.Body>
              <UkeChords/>
            </Card.Body>
          </Card.Root>
        </GridItem>

        {columns > 1 && (
          <GridItem colSpan={columns}>
            <Card.Root h="full">
              <Card.Header>Lumatone Chords</Card.Header>
              <Card.Body>
                <LumatoneChords/>
              </Card.Body>
            </Card.Root>
          </GridItem>
        )}

        {columns > 1 && (
          <GridItem colSpan={columns}>
            <LumatoneEditor/>
          </GridItem>
        )}

      </Grid>
    </Stack>

  );
}
