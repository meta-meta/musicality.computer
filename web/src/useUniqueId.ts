import { useRef } from 'react';

let uniqueId = 0;
const getUniqueId = () => uniqueId++;

/**
 * https://gist.github.com/sqren/fc897c1629979e669714893df966b1b7
 * @returns {*}
 */
export function useUniqueId() {
  const idRef = useRef(getUniqueId());
  return idRef.current;
}