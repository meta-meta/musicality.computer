import {Card} from '@chakra-ui/react';
import LumatoneBoard from './LumatoneBoard';


const wikiHayden = (x: number, y: number) => y % 2 === 0
  ? ((12 - y) * 6 + x * 2) + (x > 12 ? 24 : 0)
  : (12 - y) * 6 + x * 2 + 1 + (x > 12 ? 24 : 0);

function LumatoneEditor() {

  return (
    <Card.Root>
      <Card.Header>Lumatone</Card.Header>
      <Card.Body>

        <LumatoneBoard
          layout={wikiHayden}
          pcSet={[]}
          pitchSet={[]}
        />


      </Card.Body>
    </Card.Root>
  );
}

export default LumatoneEditor;