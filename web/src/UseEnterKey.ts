import {useEffect} from 'react';

const noop = () => {
};

export const useEnterKey = (callback = noop) => {
  useEffect(() => {
    const onKeydown = ({key}) => {
      if (key === 'Enter') {
        callback();
        document.activeElement.blur();
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [callback]);
};
