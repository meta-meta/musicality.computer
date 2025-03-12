import React, {useCallback, useEffect, useState} from 'react';
import {Center, Flex, Text} from '@chakra-ui/react';
import * as _ from 'lodash-es';
import {toSymbol} from './lumatone/util';
import {PitchClassPicker} from './PitchClassPicker.tsx';


interface NotesProps {
  currentKey: number;
}

const Notes = React.memo(function Notes({currentKey}: NotesProps) {
  return (
    <>
      {_.shuffle([0, 2, 4, 5, 7, 9, 11]).map(n => (
        <Text key={n} fontSize="xl" position="relative" top={_.random(15) - 7}>
          {toSymbol(n + currentKey)}
        </Text>
      ))}
    </>
  );
});

export function FlashCards() {

  const [key, setKey] = useState(0);
  const [score, setScore] = useState(0);
  const [scoreDiff, setScoreDiff] = useState(0);
  const [tAtRoundStart, setTAtRoundStart] = useState(Date.now);

  const handlePickerChange = useCallback((val: number) => {
    const isCorrect = val === key;
    const t = Date.now() - tAtRoundStart;
    const tMult = t > 5000 ? 1 : 1 + Math.round((5000 - t) / 500);

    const scoreDiff = !isCorrect
      ? -10
      : tMult * 10;

    setScore(s => Math.max(0, s + scoreDiff));
    setScoreDiff(scoreDiff);
    setTAtRoundStart(Date.now());

    // @ts-ignore
    const nextKey : number = _.sample(_.range(11).filter(n => n !== key));
    if (isCorrect) setKey(nextKey);

    _.delay(() => setScoreDiff(0), 300);
  }, [key, tAtRoundStart])

  useEffect(() => {
    const id = setInterval(() => setScore(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  return ( // 330px is the size of the SVG
    <>
      <Text>Pick the key containing these notes:</Text>

      <Flex
        alignItems="center"
        borderRadius="xl"
        bg="#222"
        h="120px"
        justifyContent="space-between"
        paddingX={10}
        flexWrap="wrap"
      >
        {/*<Text color="pink">{key}</Text>*/}

        <Notes currentKey={key}/>
      </Flex>

      <Flex alignItems="center" gap={2}>
        <Text>Score: </Text>
        <Text fontSize="2xl">{score}</Text>
        <Text
          color={scoreDiff > 0 ? 'green' : 'red'}
          fontSize="2xl"
        >
          {scoreDiff != 0 && `${scoreDiff > 0 ? '+' : ''}${scoreDiff}`}
        </Text>
      </Flex>

      <br/>

      <Center>
        <PitchClassPicker
          onChange={handlePickerChange}
        />
      </Center>

    </>

  );
}


/*
* Reasons for building my own circular slider from scratch
*
* * ability to adjust drag precision based on mouse distance from handle
* * unequal divisions of the circle
*
*
* */
