import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {ChakraProvider} from '@chakra-ui/react';
import {system} from './theme.ts';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/700.css';
import {ColorModeProvider} from './components/chakra-ui/color-mode';
import App from './App.tsx';
import {Provider} from 'react-redux';
import {store} from './redux/store.ts';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ChakraProvider value={system}>
      <ColorModeProvider>
        <Provider store={store}>
          <App/>
        </Provider>
      </ColorModeProvider>
    </ChakraProvider>
  </React.StrictMode>,
);
