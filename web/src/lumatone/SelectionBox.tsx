import {MutableRefObject, useCallback, useRef} from 'react';
import {EditorKeyOffset} from './LumatoneBoard.tsx';
import {useAppDispatch, useAppSelector} from '../redux/hooks.ts';
import _ from 'lodash-es';
import {layerAddOrUpdate, SelectionToolType} from '../redux/lumatoneEditorReducer.ts';
import {Box} from '@chakra-ui/react';

type SelectionBox = {
  el: HTMLDivElement | null,
  isEnabled: boolean,
  x: number,
  y: number,
  h: number,
  w: number,
}

interface SelectionBoxProps {
  keyPositions: MutableRefObject<{ [index: string]: EditorKeyOffset }>;
}

function SelectionBox({
  keyPositions,
}: SelectionBoxProps) {

  const selectionBox: MutableRefObject<SelectionBox> = useRef({
    el: null,
    isEnabled: false,
    x: 0,
    y: 0,
    h: 0,
    w: 0,
  });

  const dispatch = useAppDispatch();

  const layers = useAppSelector(s => s.lumatoneEditor.layers);
  const {layerAssignmentId, type} = useAppSelector(s => s.lumatoneEditor.selectionTool);
  const selectionBoxLayerId = type === SelectionToolType.Box && layerAssignmentId;
  const selectionBoxLayer = selectionBoxLayerId && layers[selectionBoxLayerId];

  const handleSelectionBoxUpdate = useCallback((nextSelection: EditorKeyOffset[]) => {
    if (!selectionBoxLayer) return;

    const nextIds = nextSelection.map(({id}) => id);
    const didChange = _.xor(_.keys(selectionBoxLayer.keys), nextIds).length;

    if (didChange) {
      const nextSelectedKeys = _.fromPairs(nextSelection.map(sk => [sk.id, sk]));
      const topLeft = _.orderBy(nextSelectedKeys, ['gridPos.y', 'gridPos.x'])[0];
      const {x, y} = topLeft?.gridPos || {x: 0, y: 0};
      dispatch(layerAddOrUpdate({
        ...selectionBoxLayer,
        mappingFnColOffset: -x,
        mappingFnRowOffset: -y,
        keys: nextSelectedKeys,
      }));
    }
  }, [dispatch, selectionBoxLayer]);

  const updateSelectionBox = () => {
    const sb = selectionBox.current;
    if (!sb.el) return;
    if (!selectionBoxLayer) return;

    const {style} = sb.el;
    style.top = `${sb.y}px`;
    style.left = `${sb.x}px`;
    style.height = `${sb.h}px`;
    style.width = `${sb.w}px`;
    style.visibility = sb.isEnabled ? 'visible' : 'hidden';

    if (!sb.isEnabled) return;
    const selected = _.filter(keyPositions.current, p => p.x > sb.x && p.x < sb.x + sb.w && p.y > sb.y && p.y < sb.y + sb.h);
    handleSelectionBoxUpdate(selected);
  };

  return (
    <Box
      position="absolute"
      left={0}
      touchAction="none"
      top={0}
      w="full"
      h="full"

      onPointerDown={(e) => {
        const {offsetX, offsetY} = e.nativeEvent;
        selectionBox.current.isEnabled = true;
        selectionBox.current.x = offsetX;
        selectionBox.current.y = offsetY;
        updateSelectionBox();
      }}

      onPointerMove={(e) => {
        const sb = selectionBox.current;
        if (!sb.isEnabled) return;
        const {offsetX, offsetY} = e.nativeEvent;
        sb.h = offsetY - sb.y;
        sb.w = offsetX - sb.x;
        updateSelectionBox();
      }}

      onPointerUp={() => {
        const sb = selectionBox.current;
        sb.isEnabled = false;
        sb.h = 0;
        sb.w = 0;
        updateSelectionBox();
      }}
    >
      <Box
        ref={(el: HTMLDivElement | null) => {
          selectionBox.current.el = el;
        }}
        bg="whiteAlpha.400"
        border="2px dashed white"
        pointerEvents="none"
        position="absolute"
        visibility="hidden"
      />
    </Box>
  );

}

export default SelectionBox;