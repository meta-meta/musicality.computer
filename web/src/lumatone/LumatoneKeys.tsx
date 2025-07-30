import * as _ from 'lodash-es';
import {Fragment, memo, MutableRefObject} from 'react';
import {lumatoneRowLengths, lumatoneRowStarts} from './layoutData.ts';
import {CoordOffset, LumatoneLayer} from './lumatoneTypes.ts';
import LumatoneKeyWrapper from './LumatoneKeyWrapper.tsx';

interface LumatoneKeysProps {
  keyIdToLumatoneLayer: MutableRefObject<{ [index: string]: LumatoneLayer | undefined }>;
  onLumatoneKeyRef: (gridPos: CoordOffset) => (el: HTMLDivElement) => void
  rotBoard: number,
}

const LumatoneKeys = memo(
  function LumatoneKeys({
    keyIdToLumatoneLayer,
    onLumatoneKeyRef,
    rotBoard,
  }: LumatoneKeysProps) {

    return (
      <>
        {_.range(lumatoneRowLengths.length)
          .map(y => {
            const isOdd = y % 2 === 1;
            const rowStartX = lumatoneRowStarts[y];
            const rowEndX = rowStartX + lumatoneRowLengths[y];

            return (
              <Fragment key={y}>
                {[
                  // Spacers before row starts
                  ..._.range(rowStartX)
                    .map(x =>
                      (
                        <LumatoneKeyWrapper
                          gridPos={{x, y}}
                          isOdd={isOdd}
                          isSpacer
                          key={x}
                          keyIdToLumatoneLayer={keyIdToLumatoneLayer}
                          rotBoard={rotBoard}
                        />)),

                  // Lumatone Keys
                  ..._.range(rowStartX, rowEndX)
                    .map(x => {
                      return (
                        <LumatoneKeyWrapper
                          gridPos={{x, y}}
                          isOdd={isOdd}
                          key={x}
                          keyIdToLumatoneLayer={keyIdToLumatoneLayer}
                          onRef={onLumatoneKeyRef({x, y})}
                          rotBoard={rotBoard}
                        />
                      );
                    }),
                ]}
                <br/>
              </Fragment>
            );
          })}
      </>
    );
  });


export default LumatoneKeys;