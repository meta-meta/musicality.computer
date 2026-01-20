import {Container, Heading} from '@chakra-ui/react';
import {Route, Routes} from 'react-router-dom';
import {ThereminPrivacyPolicy} from './ThereminPrivacyPolicy.tsx';

export function Theremin() {
  return (
    <Container marginTop="3em">
      <Heading as="h1" size="4xl">Theremin</Heading>

      <Routes>
        <Route path="/privacy-policy" element={<ThereminPrivacyPolicy/>}/>
      </Routes>
    </Container>
  )
}