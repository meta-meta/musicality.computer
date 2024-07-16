import React, {useEffect, useState} from "react";
import {AbsoluteCenter, Box, Button, Input, Text} from "@chakra-ui/react";
import {RoundSlider} from 'mz-react-round-slider';
import {useEnterKey} from "./UseEnterKey.ts";


export function NotePicker({
                             value = 1,
                             onChange = () => {
                             },
                           }) {

  const [val, setVal]: [number, ((value: (((prevState: number) => number) | number)) => void)] = useState(value || 1);


  useEffect(() => {
    setVal(value);
  }, [value]);

  const valCents = (Math.log2(val) * 1200);

  const [isEditing, setIsEditing] = useState(false);

  const [inputRef, setInputRef] = useState(null);

  useEffect(() => {
    if (isEditing && inputRef) inputRef.focus();
  }, [inputRef, isEditing]);

  useEnterKey();

  return (
    <Box w="330px" h="330px" position="relative">

      <RoundSlider
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

          const a = valCents < 0
            ? valCents + 1200 * Math.ceil(Math.abs(valCents) / 1200)
            : valCents;

          const diff = pointer.value - (a % 1200);
          const absDiff = Math.abs(diff);

          const b = absDiff < 100 // 100 is arbitrary
            ? valCents + diff // haven't crossed 0
            : diff < 0
              ? valCents + pointer.value // 1199 -> 0
              : valCents - (1200 - pointer.value); // 0 -> 1199

          setVal(Math.pow(2, b / 1200));
        }}
        pathBgColor="grey"
        pathBorder={1}
        pathEndAngle={269.999}
        pathInnerBgColor="#333"
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
              {val.toFixed(3)}
            </Text>
          )}
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
