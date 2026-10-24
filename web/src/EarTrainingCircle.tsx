import {useEffect, useRef, useState} from 'react';
import {Center, Flex, IconButton, Text} from '@chakra-ui/react';
import {FaPlay, FaStop} from 'react-icons/fa6';
import {CircleInterval, IntervalCirclePicker} from './IntervalCirclePicker.tsx';
import {useColorMode} from './components/chakra-ui/color-mode.tsx';

interface EarTrainingCircleProps {
  intervals: CircleInterval[];
  referenceFrequency?: number;
}

interface AudioVoice {
  context: AudioContext;
  intervalOscillator: OscillatorNode;
}

const randomIndex = (length: number, excluded?: number) => {
  if (length < 2) return 0;
  let next = Math.floor(Math.random() * length);
  while (next === excluded) next = Math.floor(Math.random() * length);
  return next;
};

const randomLabel = (interval: CircleInterval) => (
  interval.labels[Math.floor(Math.random() * interval.labels.length)] ?? ''
);

export function EarTrainingCircle({
  intervals,
  referenceFrequency = 220,
}: EarTrainingCircleProps) {
  const [targetIndex, setTargetIndex] = useState(() => randomIndex(intervals.length));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prompt, setPrompt] = useState(() => intervals.length ? randomLabel(intervals[targetIndex]) : '');
  const [score, setScore] = useState(0);
  const [scoreDiff, setScoreDiff] = useState(0);
  const roundStartedAt = useRef(Date.now());
  const scoreDiffTimeout = useRef<number>();
  const audioVoice = useRef<AudioVoice>();
  const skipNextRetune = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const {colorMode} = useColorMode();

  useEffect(() => {
    const id = window.setInterval(() => setScore(current => Math.max(0, current - 1)), 1000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(scoreDiffTimeout.current);
      void audioVoice.current?.context.close();
    };
  }, []);

  useEffect(() => {
    const voice = audioVoice.current;
    const interval = intervals[targetIndex];
    if (!voice || !interval) return;
    if (skipNextRetune.current) {
      skipNextRetune.current = false;
      return;
    }

    voice.intervalOscillator.frequency.setTargetAtTime(
      referenceFrequency * 2 ** interval.point,
      voice.context.currentTime,
      0.015,
    );
  }, [intervals, referenceFrequency, targetIndex]);

  if (intervals.length === 0) {
    return <Text>No intervals available.</Text>;
  }

  const handleChange = (index: number) => {
    setSelectedIndex(index);
    const isCorrect = index === targetIndex;
    const elapsed = Date.now() - roundStartedAt.current;
    const timeMultiplier = elapsed > 10000 ? 1 : 1 + Math.round((10000 - elapsed) / 1000);
    const difference = isCorrect ? timeMultiplier * 20 : -10;

    setScore(current => Math.max(0, current + difference));
    setScoreDiff(difference);
    window.clearTimeout(scoreDiffTimeout.current);
    scoreDiffTimeout.current = window.setTimeout(() => setScoreDiff(0), 300);

    if (isCorrect) {
      const nextTarget = randomIndex(intervals.length, targetIndex);
      const voice = audioVoice.current;
      if (voice) {
        const now = voice.context.currentTime;
        const frequency = referenceFrequency * 2 ** intervals[targetIndex].point;
        const nextFrequency = referenceFrequency * 2 ** intervals[nextTarget].point;
        const parameter = voice.intervalOscillator.frequency;

        parameter.cancelScheduledValues(now);
        parameter.setValueAtTime(frequency * 2, now);
        parameter.setValueAtTime(frequency * 4, now + 0.14);
        parameter.setValueAtTime(frequency * 2, now + 0.28);
        parameter.setValueAtTime(frequency * 4, now + 0.42);
        parameter.setValueAtTime(nextFrequency, now + 0.58);
        skipNextRetune.current = true;
      }
      setTargetIndex(nextTarget);
      setPrompt(randomLabel(intervals[nextTarget]));
      roundStartedAt.current = Date.now();
    } else {
      const voice = audioVoice.current;
      if (voice) {
        const now = voice.context.currentTime;
        const guessedFrequency = referenceFrequency * 2 ** intervals[index].point;
        const targetFrequency = referenceFrequency * 2 ** intervals[targetIndex].point;
        const parameter = voice.intervalOscillator.frequency;

        parameter.cancelScheduledValues(now);
        parameter.setValueAtTime(guessedFrequency, now);
        parameter.setValueAtTime(guessedFrequency, now + 0.25);
        parameter.exponentialRampToValueAtTime(referenceFrequency, now + 0.6);
        parameter.setValueAtTime(referenceFrequency, now + 0.75);
        parameter.exponentialRampToValueAtTime(targetFrequency, now + 0.95);
      }
    }
  };

  const startAudio = async () => {
    if (audioVoice.current) {
      await audioVoice.current.context.resume();
      setIsPlaying(true);
      return;
    }

    const context = new AudioContext();
    const gain = context.createGain();
    const referenceOscillator = context.createOscillator();
    const intervalOscillator = context.createOscillator();

    referenceOscillator.type = 'sawtooth';
    intervalOscillator.type = 'sawtooth';
    referenceOscillator.frequency.value = referenceFrequency;
    intervalOscillator.frequency.value = referenceFrequency * 2 ** intervals[targetIndex].point;
    gain.gain.value = 0.035;

    referenceOscillator.connect(gain);
    intervalOscillator.connect(gain);
    gain.connect(context.destination);
    referenceOscillator.start();
    intervalOscillator.start();
    audioVoice.current = {context, intervalOscillator};
    await context.resume();
    setIsPlaying(true);
  };

  const stopAudio = async () => {
    const voice = audioVoice.current;
    if (!voice) return;
    audioVoice.current = undefined;
    await voice.context.close();
    setIsPlaying(false);
  };

  return (
    <>
      <Text>Pick the point for this interval:</Text>
      <Flex
        alignItems="center"
        bg={colorMode === 'light' ? '#ccc' : '#222'}
        minHeight="120px"
        justifyContent="center"
        paddingX={10}
      >
        <Text fontSize="2xl" textAlign="center">{prompt}</Text>
      </Flex>

      <Flex alignItems="center" gap={2}>
        <IconButton
          aria-label={isPlaying ? 'Stop interval audio' : 'Play interval audio'}
          title={isPlaying ? 'Stop interval audio' : 'Play interval audio'}
          size="sm"
          variant="outline"
          onClick={() => void (isPlaying ? stopAudio() : startAudio())}
        >
          {isPlaying ? <FaStop/> : <FaPlay/>}
        </IconButton>
        <Text>{referenceFrequency} Hz</Text>
        <Text>Score:</Text>
        <Text fontSize="2xl">{score}</Text>
        <Text color={scoreDiff > 0 ? 'green' : 'red'} fontSize="2xl">
          {scoreDiff !== 0 && `${scoreDiff > 0 ? '+' : ''}${scoreDiff}`}
        </Text>
      </Flex>

      <br/>
      <Center>
        <IntervalCirclePicker
          intervals={intervals}
          value={selectedIndex}
          onChange={handleChange}
        />
      </Center>
    </>
  );
}
