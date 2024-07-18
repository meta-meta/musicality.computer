import React, {useEffect, useRef, useState} from "react";
import {AbsoluteCenter, Box, Button, Input, Text} from "@chakra-ui/react";
import {RoundSlider} from 'mz-react-round-slider';
import {useEnterKey} from "./UseEnterKey.ts";


const circleMod = (n: number, fullCircle: number) => {
  const p = n < 0
    ? n + fullCircle * Math.ceil(Math.abs(n) / fullCircle)
    : n;
  return p % fullCircle;
};

export function NotePicker({
                             value = 1,
                             onChange = () => {
                             },
                           }) {

  const [val, setVal] = useState(value || 1);
  const valRef = useRef(val);
  valRef.current = val;

  useEffect(() => {
    setVal(value);
  }, [value]);

  const valCents = Math.log2(val) * 1200;

  const [isEditing, setIsEditing] = useState(false);

  const [inputRef, setInputRef] = useState(null);

  useEffect(() => {
    if (isEditing && inputRef) inputRef.focus();
  }, [inputRef, isEditing]);

  useEnterKey();

  return (
    <Box w="330px" h="330px" position="relative">

      <RoundSlider
        // animateOnClick
        // enableTicks
        // tickValuesSuffix="¢"
        // ticksCount={12}
        // ticksGroupSize={2}
        // arrowStep={1}
        // step={1}
        connectionBgColor="none"
        max={1199}
        min={0}
        onChange={([pointer]) => {
          const centsPointer: number = pointer.value;
          const centsTotal = Math.log2(valRef.current) * 1200;
          const diff = centsPointer - circleMod(centsTotal, 1200);
          const b = Math.abs(diff) < 600
            ? centsTotal + diff // haven't crossed 0
            : diff < 0
              ? centsTotal + centsPointer // 1199 -> 0
              : centsTotal - (1200 - centsPointer); // 0 -> 1199

          // oddly the ref is needed when in desktop mode but not mobile
          valRef.current = Math.pow(2, b / 1200);
          setVal(valRef.current);
        }}
        pathBgColor="grey"
        pathBorder={1}
        pathEndAngle={269.999}
        // pathInnerBgColor="#333" // this causes an undesirably clickable disk
        pathStartAngle={270}
        pointerBgColor="white"
        pointerBgColorSelected="white"
        pointerRadius={15}
        pointers={[{value: valCents % 1200}]}
        textColor={'#8993B7'}
        textSuffix="¢"
        hideText
      />

      <AbsoluteCenter>
        {isEditing
          ? (
            <Input
              ref={setInputRef}
              type="number"
              fontSize="3em"
              // value={val.toFixed(3)}
              onBlur={(e) => {
                const v = parseFloat(e.target.value) || val;
                setVal(Math.max(v, 0.00000001))
                setIsEditing(false);
              }}
              maxLength={9}
              w="10ch"
            />
          )
          : (
            <Text
              fontSize="3em"
              onClick={() => {
                setIsEditing(true)
              }}>
              {/*{Math.round(valCents)}*/}
              {val.toFixed(3)}
            </Text>
          )}
      </AbsoluteCenter>

      <AbsoluteCenter>
        <Text color="grey" fontSize="3em" position="relative" top="1.5em">
          Hz
        </Text>
      </AbsoluteCenter>


      {/*<Button onClick={() => {*/}
      {/*  console.log(val)*/}
      {/*  setVal(val * Math.pow(2, 1/12)); // floating point error accumulates*/}
      {/*}}>+</Button>*/}
    </Box>

  )
}


/*
* Reasons for building my own circular slider from scratch
*
* * ability to adjust drag precision based on mouse distance from handle
* * unequal divisions of the circle
* * react-circular-slider calls onChange even in controlled usage
*
*
* */
