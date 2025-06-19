import {createSystem, defaultConfig, defineConfig} from '@chakra-ui/react';
// import '@fontsource/jetbrains-mono';

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

// TODO for bravura  https://chakra-ui.com/guides/theming-add-custom-font-to-vite

const fonts = {
  body: {value: `'Jetbrains Mono'`},
  heading: {value: `'Jetbrains Mono'`},
  mono: {value: `'Jetbrains Mono'`},
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
