import {createSystem, defaultConfig, defineConfig} from '@chakra-ui/react';
import '@fontsource/jetbrains-mono';

const colors = {
  brand: {
    900: {value: '#1a365d'},
    800: {value: '#153e75'},
    700: {value: '#2a69ac'},
  },
};

// const config: ThemeConfig = {
//   initialColorMode: 'system',
//   useSystemColorMode: true,
// }

const fonts = {
  body: {value: `'Jetbrains Mono', monospace`},
  heading: {value: `'Jetbrains Mono', monospace`},
};

const config = defineConfig({
  theme: {
    tokens: { // https://www.chakra-ui.com/docs/theming/tokens
      colors,
      // config,
      fonts,
    },
  },
});

export const system = createSystem(defaultConfig, config);
