import {Button, Flex, Icon, useColorMode} from "@chakra-ui/react";
import {IoMoon, IoSunny} from "react-icons/io5";


/**
 * https://v2.chakra-ui.com/docs/styled-system/color-mode
 * @returns {JSX.Element}
 * @constructor
 */
const ColorMode = (): JSX.Element => {
  const {colorMode, toggleColorMode} = useColorMode();
  return (
    <Flex
      w="full"
      justifyContent="flex-end"
      marginBottom={-10}
    >
      <Button onClick={toggleColorMode}>
        <Icon as={colorMode === 'light' ? IoMoon : IoSunny}/>
      </Button>
    </Flex>
    )
}

export default ColorMode;
