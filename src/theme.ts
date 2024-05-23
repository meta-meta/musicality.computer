import {extendTheme, ThemeConfig} from "@chakra-ui/react";

const colors = {
  brand: {
    900: '#1a365d',
    800: '#153e75',
    700: '#2a69ac',
  }
}

const config: ThemeConfig = {
  initialColorMode: 'system',
  useSystemColorMode: true,
}

const theme =
  extendTheme({
    colors,
    config,
  })

export default theme;
