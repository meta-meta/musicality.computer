import {Button, Flex} from '@chakra-ui/react';
import {IoMoon, IoSunny} from 'react-icons/io5';
import {useColorMode} from './components/chakra-ui/color-mode.tsx';


/**
 * https://v2.chakra-ui.com/docs/styled-system/color-mode
 * @returns {JSX.Element}
 * @constructor
 */
const ColorMode = (): JSX.Element => {
  const {colorMode, toggleColorMode} = useColorMode();
  return (
    <Flex
      p={2}
      w="full"
      justifyContent="flex-end"
      marginBottom={-10}
    >
      <Button
        onClick={toggleColorMode}
        variant="subtle"
      >
        {colorMode === 'light' ? <IoMoon/> : <IoSunny/>}
      </Button>
    </Flex>
  );
};

export default ColorMode;
