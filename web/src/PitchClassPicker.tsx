import {useCallback, useEffect, useRef, useState} from 'react';
import {AbsoluteCenter, Box, Text} from '@chakra-ui/react';
import {ISettingsPointer, RoundSlider} from 'mz-react-round-slider';
import {useEnterKey} from './UseEnterKey.ts';
import * as _ from 'lodash-es';
import {fromSymbol, toSymbol} from './lumatone/util';


interface NotePickerProps {
  value?: number | undefined;
  onChange?: ((a: number) => void) | undefined;
}

export function PitchClassPicker({
  value = 0,
  onChange = _.noop,
}: NotePickerProps) {

  const [val, setVal] = useState(value || 0);

  // oddly the ref is needed when in desktop mode but not mobile
  const valRef = useRef(val);
  valRef.current = val;

  useEffect(() => {
    setVal(value);
  }, [value]);


  const [isDragging, setIsDragging] = useState(false);


  useEnterKey();

  const change = (n: number) => {
    const next = n % 12;
    valRef.current = next;
    setVal(next);
  };

  const handleSliderChange = ([pointer]: ISettingsPointer[]) => {
    const pitchClass: number = fromSymbol(pointer.value);
    change(pitchClass);
  };


  const handlePointerUp = useCallback(() => {
    _.defer(() => {
      onChange(valRef.current);
    });
    setIsDragging(false);
    // @ts-expect-error blur is unavailable on some element types
    document.activeElement?.blur(); // allows wheel events after grabbing pointer
  }, [onChange]);

  useEffect(() => {
    if (isDragging) document.addEventListener('pointerup', handlePointerUp);
    else document.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerUp, isDragging]);


  return ( // 330px is the size of the SVG
    <Box
      w="330px"
      h="330px"
      position="relative"
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'circle') setIsDragging(true);
      }}
      css={{
        '& .mz-round-slider-pointer': {
          cursor: isDragging ? 'grabbing' : 'grab',
        },
        '&': { // TODO: would be nice to apply this to document
          cursor: isDragging ? 'grabbing' : 'default',
        },
      }}
    >

      <RoundSlider
        // animateOnClick
        // arrowStep={1}
        enableTicks
        // pathInnerBgColor="#333" // this causes an undesirably clickable disk
        step={1}

        data={_.range(12).map(n => toSymbol(n))}
        // tickValuesSuffix="¢"
        ticksCount={12}
        ticksGroupSize={1}
        connectionBgColor="none"
        hideText
        max={12}
        min={0}
        onChange={handleSliderChange}
        pathBgColor="grey"
        pathBorder={0}
        pathEndAngle={270 + 360}
        pathThickness={20}
        tickValuesColor="white"
        longerTicksHeight={0}
        ticksColor="none"
        showTickValues
        pathStartAngle={270}
        pointerBgColor="white"
        pointerBgColorSelected="white"
        pointerBorder={1}
        pointerBorderColor="grey"
        pointerRadius={15}
        // pointers={[{value: (Math.log2(val) * 1200) % 1200}]}
        // textColor={'#8993B7'}
        // textSuffix="¢"
      />

      <AbsoluteCenter>
        <Text
          color="grey"
          fontSize="1em"
          position="relative"
          top="-2.2em"
        >
          key of
        </Text>
      </AbsoluteCenter>

      <AbsoluteCenter>
        <Text
          color="grey"
          fontSize="2em"
          position="relative"
          top="1.2em"
        >
          maj
        </Text>
      </AbsoluteCenter>

      <AbsoluteCenter>
        <Text
          fontSize="3em"
          onClick={() => {onChange(valRef.current)}}
        >
          {toSymbol(val)}
        </Text>
      </AbsoluteCenter>


      {/*<Button onClick={() => {*/}
      {/*  console.log(val)*/}
      {/*  setVal(val * Math.pow(2, 1/12)); // floating point error accumulates*/}
      {/*}}>+</Button>*/}
    </Box>
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
