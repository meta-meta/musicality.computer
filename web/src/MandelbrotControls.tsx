import {
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  useDisclosure
} from '@chakra-ui/react';
import {useEffect, useRef} from 'react';
import {NotePicker} from './NotePicker.tsx';


interface MandelbrotControlsProps {
  // value?: number | undefined;
  // onChange?: ((a: number) => void) | undefined;
}

export function MandelbrotControls({
  setState,
  sketchInstance,
  state,
}: MandelbrotControlsProps) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const btnRef = useRef()


  const handleAction = (action) => () => {
    if (action === 'toggleAudio') {
      sketchInstance.toggleAudio();
      return;
    }

    setState(prevState => {
      const {
        hilbertN,
        isControlPanelOpen,
        isRegenNeeded,
        panX,
        panY,
        zoom,
      } = prevState;
      const panDelta = 0.1 / zoom;

      const nextState = {
        moveLeft: {panX: panX + panDelta},
        moveRight: {panX: panX - panDelta},
        moveUp: {panY: panY + panDelta},
        moveDown: {panY: panY - panDelta},
        resDec: {hilbertN: Math.pow(2, Math.log2(hilbertN) - 1)},
        resInc: {hilbertN: Math.min(256, Math.pow(2, Math.log2(hilbertN) + 1))},
        toggleControlPanel: {isControlPanelOpen: !isControlPanelOpen, isRegenNeeded},
        zoomIn: {zoom: zoom * (10 / 9)},
        zoomOut: {zoom: zoom * (9 / 10)},
      }[action];

      return {
        ...prevState,
        isRegenNeeded: !_.isEmpty(nextState),
        ...nextState,
      };
    })
  };

  const handleKeyDown = (handleAction) => (evt) => {
    // console.log(evt);
    const {code, shiftKey, key} = evt;

    if (code === 'Space') {
      handleAction(shiftKey ? 'toggleControlPanel' : 'toggleAudio')();
      return;
    }

    const getAction = {
      'ArrowDown': () => shiftKey ? 'zoomOut' : 'moveDown',
      'ArrowLeft': () => shiftKey ? 'resDec' : 'moveLeft',
      'ArrowRight': () => shiftKey ? 'resInc' : 'moveRight',
      'ArrowUp': () => shiftKey ? 'zoomIn' : 'moveUp',
    }[key];

    if (getAction) handleAction(getAction())();
  };

  useEffect(() => {
    if (sketchInstance) {
      const handler = handleKeyDown(handleAction);
      window.addEventListener('keydown', handler)
      return () => { // cleanup
        window.removeEventListener('keydown', handler);
      };
    }
  }, [sketchInstance]);


  return (
    <>
      <Button ref={btnRef} colorScheme='teal' onClick={onOpen}>
        Open
      </Button>

      <Drawer
        isOpen={isOpen}
        placement='bottom'
        onClose={onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader></DrawerHeader>

          <DrawerBody>
            <NotePicker
              onChange={(v) => {
                setState(s => ({
                  ...s,
                  fundamentalFreq: v,
                  isRegenNeeded: true,
                }));
              }}
              value={state.fundamentalFreq}
            />
          </DrawerBody>

          <DrawerFooter>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  )
}


/*
* Reasons for building my own circular slider from scratch
*
* * ability to adjust drag precision based on mouse distance from handle
* * unequal divisions of the circle
*
*
* */
