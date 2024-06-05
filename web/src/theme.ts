import {extendTheme, ThemeConfig} from "@chakra-ui/react";
import '@fontsource/jetbrains-mono';

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

const fonts = {
  body: `'Jetbrains Mono', monospace`,
  heading: `'Jetbrains Mono', monospace`,
}

const theme =
  extendTheme({
    colors,
    config,
    fonts,
  })

export default theme;
