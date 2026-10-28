import {Box, Center, Code, Flex, Stack, Text} from '@chakra-ui/react';
import Chord from '@tombatossals/react-chords/lib/Chord';
import _ from 'lodash-es';
import {toSymbol} from './lumatone/util';

function UkeChord({
  frets = [0, 0, 0, 0],
  pcs = [7, 0, 4, 11],
  name = `0+47Ɛ`,
}) {
  return (
    <Box
      w="120px"
      paddingBottom={4}
      sx={{
        'div': {
          backgroundColor: 'pink',
          height: '200px',
          width: '200px',
        },
      }}
    >
      <Center>{name}</Center>
      <Center marginTop="0.5em" marginBottom="-0.5em">
        <Flex color="grey" justify="space-evenly" w="60px">
          {pcs.map(pc => <Text key={pc}>{toSymbol(pc)}</Text>)}
        </Flex>
      </Center>
      <Chord
        chord={{
          frets,
          // fingers: [1, 3, 4, 2, 1, 1],
          // barres: [1],
          capo: false,
        }}
        instrument={{
          strings: 4,
          fretsOnChord: Math.max(1, _.last(_.sortBy(frets))),
          name: 'uke',
          keys: [],
          tunings: {
            standard: [], // hijacked to show actual notes fretted  pcs.map(pc => toSymbol(pc))
          },
        }}
        lite={false}
      />


    </Box>
  );
}

export function UkeChords() {
  return (
    <Stack gap={8}>
      <Stack>
        <Flex>
          <UkeChord
            frets={[0, 0, 0, 2]}
            pcs={[7, 0, 4, 11]}
            name="0+47Ɛ"
          />
          <UkeChord
            frets={[0, 0, 0, 0]}
            pcs={[7, 0, 4, 9]}
            name="0+479"
          />
          <UkeChord
            frets={[0, 1, 0, 1]}
            pcs={[7, 1, 4, 10]}
            name="1+369"
          />
        </Flex>
        <Code fontSize="xl" whiteSpace="pre">       wonderful        marvelous</Code>
      </Stack>

      <Stack>
        <Flex>
          <UkeChord
            frets={[5, 2, 1, 0]}
            pcs={[0, 2, 5, 9]}
            name="2+37૪"
          />
          <UkeChord
            frets={[1, 2, 1, 2]}
            pcs={[8, 2, 5, 11]}
            name="2+369"
          />

          <UkeChord
            frets={[0, 0, 0, 0]}
            pcs={[7, 0, 4, 9]}
            name="0+479"
          />
          <UkeChord
            frets={[0, 0, 0, 2]}
            pcs={[7, 0, 4, 11]}
            name="0+47Ɛ"
          />
        </Flex>
        <Code fontSize="xl" whiteSpace="pre">   you should care     for me</Code>
      </Stack>

      <Stack>
        <Flex>
          <UkeChord
            frets={[0, 0, 0, 0]}
            pcs={[7, 0, 4, 9]}
            name="0+479"
          />
          <UkeChord
            frets={[0, 0, 0, 2]}
            pcs={[7, 0, 4, 11]}
            name="0+47Ɛ"
          />

          <UkeChord
            frets={[0, 2, 0, 2]}
            pcs={[7, 2, 4, 11]}
            name="4+37૪"
          />

          <UkeChord
            frets={[0, 1, 0, 1]}
            pcs={[7, 1, 4, 10]}
            name="4+369"
          />
        </Flex>
        <Code fontSize="xl" whiteSpace="pre">   awfully nice     it's paradise</Code>
      </Stack>

      <Stack>
        <Flex>
          <UkeChord
            frets={[5, 2, 1, 0]}
            pcs={[0, 2, 5, 9]}
            name="2+37૪"
          />
          <UkeChord
            frets={[1, 2, 1, 2]}
            pcs={[8, 2, 5, 11]}
            name="2+369"
          />

          <UkeChord
            frets={[0, 0, 0, 0]}
            pcs={[7, 0, 4, 9]}
            name="0+479"
          />
          <UkeChord
            frets={[2, 3, 3, 2]}
            pcs={[9, 3, 7, 11]}
            name="2+48૪"
          />
        </Flex>
        <Code fontSize="xl" whiteSpace="pre">   how I long       to be</Code>
      </Stack>

      <Stack>
        <Flex>

          <UkeChord
            frets={[1, 3, 0, 2]}
            pcs={[8, 3, 4, 11]}
            name="4+47Ɛ"
          />

          <UkeChord
            frets={[2, 3, 3, 2]}
            pcs={[9, 3, 7, 11]}
            name="Ɛ+48૪"
          />

          <UkeChord
            frets={[1, 3, 0, 2]}
            pcs={[8, 3, 4, 11]}
            name="4+47Ɛ"
          />


          <UkeChord
            frets={[4, 3, 3, 4]}
            pcs={[11, 3, 7, 1]}
            name="Ɛ+48૪"
          />
        </Flex>
        <Code fontSize="xl" whiteSpace="pre"> You make my life     so glamorous</Code>
      </Stack>

      <Stack>
        <Flex>

          <UkeChord
            frets={[1, 3, 0, 2]}
            pcs={[8, 3, 4, 11]}
            name="4+47Ɛ"
          />

          <UkeChord
            frets={[2, 3, 3, 2]}
            pcs={[9, 3, 7, 11]}
            name="Ɛ+48૪"
          />

          <UkeChord
            frets={[1, 3, 0, 2]}
            pcs={[8, 3, 4, 11]}
            name="4+47Ɛ"
          />


          <UkeChord
            frets={[4, 3, 3, 4]}
            pcs={[11, 3, 7, 1]}
            name="3+48૪"
          />
        </Flex>
        <Code fontSize="xl" whiteSpace="pre"> You make my life     so glamorous</Code>
      </Stack>
    </Stack>


  );
}