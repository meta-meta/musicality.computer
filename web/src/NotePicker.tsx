import {useCallback, useEffect, useRef, useState} from 'react';
import {AbsoluteCenter, Box, Input, Text} from '@chakra-ui/react';
import {ISettingsPointer, RoundSlider} from 'mz-react-round-slider';
import {useEnterKey} from './UseEnterKey.ts';
import * as _ from 'lodash-es';


const circleMod = (n: number, fullCircle: number) =>
  n < 0
    ? n % fullCircle + fullCircle
    : n % fullCircle;

interface NotePickerProps {
  value?: number | undefined;
  onChange?: ((a: number) => void) | undefined;
}

export function NotePicker({
  value = 1,
  onChange = _.noop,
}: NotePickerProps) {

  const [val, setVal] = useState(value || 1);

  // oddly the ref is needed when in desktop mode but not mobile
  const valRef = useRef(val);
  valRef.current = val;

  useEffect(() => {
    setVal(value);
  }, [value]);


  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing && inputRef) inputRef.focus();
  }, [inputRef, isEditing]);

  useEnterKey();

  const change = (n: number) => {
    if (n < Number.EPSILON) {
      console.warn('must be > 0');
      return;
    }
    valRef.current = n;
    setVal(n);
    onChange(n);
  };

  const handleSliderChange = ([pointer]: ISettingsPointer[]) => {
    const centsPointer: number = pointer.value as number;
    const centsTotal = Math.log2(valRef.current) * 1200;
    const diff = centsPointer - circleMod(centsTotal, 1200);
    const b = Math.abs(diff) < 600
      ? centsTotal + diff // haven't crossed 0
      : diff < 0
        ? centsTotal + centsPointer // 1199 -> 0
        : centsTotal - (1200 - centsPointer); // 0 -> 1199

    change(Math.pow(2, b / 1200));
  };

  const numberText = val.toFixed(val < 10 // TODO: make the actual value precise enough and reflect it exactly
    ? Math.abs(Math.floor(Math.log10(val))) + 2
    : val < 100
      ? 2
      : val < 1000
        ? 1
        : 0);

  const boxRef = useRef<HTMLDivElement | null>(null);

  const onWheelBox = (e: WheelEvent) => {
    const mult = e.deltaY > 0 ? -1 : 1;
    const currCents = Math.log2(valRef.current) * 1200;
    const nextCents = currCents + Math.abs(e.deltaY / 100) * mult;
    change(Math.pow(2, nextCents / 1200));
    e.preventDefault();
  };

  useEffect(() => {
    if (boxRef.current) {
      // https://github.com/facebook/react/issues/22794
      boxRef.current.addEventListener('wheel', onWheelBox, {passive: false});

      return () => {
        boxRef.current?.removeEventListener('wheel', onWheelBox);
      }
    }
  }, [boxRef])


  const numRef = useRef<HTMLDivElement | null>(null);

  const onWheelNum = (e: WheelEvent) => {
    const {
      left: x,
      width: w,
    } = (e.currentTarget as HTMLElement).getBoundingClientRect();

    e.preventDefault();
    e.stopPropagation();

    const xNorm = (e.clientX - x) / w;
    const charCount = numberText.length;
    const char = Math.floor(xNorm * charCount);
    const decimalChar = numberText.indexOf('.');
    const diff = (decimalChar < 0 ? charCount : decimalChar) - char;
    const pow = diff > 0 ? diff - 1 : diff;
    const mult = diff === 0 ? 0 : Math.pow(10, pow);
    change(valRef.current + mult * e.deltaY / -100);
  };

  useEffect(() => {
    if (numRef.current) {
      // https://github.com/facebook/react/issues/22794
      numRef.current.addEventListener('wheel', onWheelNum, {passive: false});

      return () => {
        numRef.current?.removeEventListener('wheel', onWheelNum);
      }
    }
  }, [onWheelNum, numRef])


  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    // @ts-expect-error blur is unavailable on some element types
    document.activeElement?.blur(); // allows wheel events after grabbing pointer
  }, []);

  useEffect(() => {
    if (isDragging) document.addEventListener('pointerup', handlePointerUp)
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
      ref={boxRef}
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
        // enableTicks
        // pathInnerBgColor="#333" // this causes an undesirably clickable disk
        // step={1}
        // tickValuesSuffix="¢"
        // ticksCount={12}
        // ticksGroupSize={2}
        connectionBgColor="none"
        hideText
        max={1199}
        min={0}
        onChange={handleSliderChange}
        pathBgColor="grey"
        pathBorder={0}
        pathEndAngle={269.999}
        pathStartAngle={270}
        pointerBgColor="white"
        pointerBgColorSelected="white"
        pointerBorder={1}
        pointerBorderColor="grey"
        pointerRadius={15}
        pointers={[{value: (Math.log2(val) * 1200) % 1200}]}
        textColor={'#8993B7'}
        textSuffix="¢"
      />

      <AbsoluteCenter>
        <Text
          color="grey"
          fontSize="3em"
          position="relative"
          top="1.5em"
        >
          Hz
        </Text>
      </AbsoluteCenter>

      <AbsoluteCenter>
        {isEditing
          ? (
            <Input
              ref={setInputRef}
              type="number"
              fontSize="3em"
              // value={val.toFixed(3)}
              onBlur={(e) => {
                const v = parseFloat(e.currentTarget.value) || val;
                change(Math.max(v, Number.EPSILON));
                setIsEditing(false);
              }}
              maxLength={9}
              w="10ch"
            />
          )
          : (
            <Text
              fontSize="3em"
              onClick={() => setIsEditing(true)}
              ref={numRef}
            >
              {numberText}
            </Text>
          )}
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
