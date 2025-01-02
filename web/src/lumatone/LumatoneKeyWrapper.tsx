import LumatoneKey from './LumatoneKey.tsx';
import {Coord, LumatoneLayer} from './lumatoneTypes.ts';
import {MutableRefObject} from 'react';
import {useAppSelector} from '../redux/hooks.ts';
import {gridPosToKeyPosition} from './layoutData.ts';
import {disabledMapping} from './mappingFunctions.ts';

interface Props {
  gridPos: Coord,
  isOdd: boolean,
  isSpacer?: boolean,
  keyIdToLumatoneLayer: MutableRefObject<{ [index: string]: LumatoneLayer | undefined }>;
  onRef?: (el: HTMLDivElement) => void,
  rotBoard: number,
}

function LumatoneKeyWrapper({
  gridPos,
  isOdd,
  isSpacer,
  keyIdToLumatoneLayer,
  onRef,
  rotBoard,
}: Props) {

  // this is what updates this component. parent and child memoized for perf
  useAppSelector(s => s.lumatoneEditor.forceUpdate);

  const keyPosition = gridPosToKeyPosition(gridPos);
  const layer = keyPosition && keyIdToLumatoneLayer.current[keyPosition.id];
  const mapping = layer && layer.mappingFn(gridPos) || disabledMapping;

  return (
    <LumatoneKey
      isOdd={isOdd}
      isSpacer={isSpacer}
      keyPosition={keyPosition}
      layer={layer}
      mapping={mapping}
      onRef={onRef}
      rotBoard={rotBoard}
    />);
}

export default LumatoneKeyWrapper;