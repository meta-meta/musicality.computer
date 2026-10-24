import {Heading, Link, Stack} from '@chakra-ui/react';
import {Link as RouterLink} from 'react-router-dom';
import LumatoneEditor from './lumatone/LumatoneEditor.tsx';
import {LumatoneComposer} from './LumatoneComposer.tsx';
import {LumatoneTranscriptions} from './lumatone/chords/LumatoneTranscriptions.tsx';
import MidiConfig from './MidiConfig.tsx';
import {
  AccordionItem,
  AccordionItemContent,
  AccordionItemTrigger,
  AccordionRoot,
} from './components/chakra-ui/accordion.tsx';

export function Lumatone() {
  return (
    <Stack gap={4} p={2}>
      <Link asChild textDecoration="underline" alignSelf="start">
        <RouterLink to="/">musicality.computer</RouterLink>
      </Link>
      <Heading as="h1" color="brand.900">Lumatone</Heading>
      <Link asChild textDecoration="underline" alignSelf="start">
        <RouterLink to="/lumatone/xr">Explore Stella in 3D / WebXR</RouterLink>
      </Link>

      <AccordionRoot
        multiple
        collapsible
        defaultValue={['midi', 'editor', 'transcriptions', 'composer']}
        lazyMount={false}
        unmountOnExit={false}
      >
        <AccordionItem value="midi">
          <AccordionItemTrigger>MIDI configuration</AccordionItemTrigger>
          <AccordionItemContent>
            <MidiConfig/>
          </AccordionItemContent>
        </AccordionItem>
        <AccordionItem value="editor">
          <AccordionItemTrigger>Lumatone editor</AccordionItemTrigger>
          <AccordionItemContent>
            <LumatoneEditor/>
          </AccordionItemContent>
        </AccordionItem>
        <AccordionItem value="composer">
          <AccordionItemTrigger>Lumatone Composer</AccordionItemTrigger>
          <AccordionItemContent>
            <LumatoneComposer/>
          </AccordionItemContent>
        </AccordionItem>
        <AccordionItem value="transcriptions">
          <AccordionItemTrigger>Lumatone Transcriptions</AccordionItemTrigger>
          <AccordionItemContent>
            <LumatoneTranscriptions/>
          </AccordionItemContent>
        </AccordionItem>
      </AccordionRoot>
    </Stack>
  );
}
