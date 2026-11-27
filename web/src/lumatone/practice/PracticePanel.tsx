import {Box, chakra} from '@chakra-ui/react';
import type {BoxProps} from '@chakra-ui/react';
import type {ReactNode} from 'react';
import {isBoolean, useSavedState} from './useSavedState.ts';

// A collapsible section of the practice page. While collapsed its contents are
// not rendered at all, so a closed panel costs nothing on each page update.
// Open/closed is remembered per panel. `bare` leaves out the frame, for
// contents that already draw their own.
export function PracticePanel({id, title, bare = false, defaultOpen = true, children, ...box}: {
  id: string; title: string; bare?: boolean; defaultOpen?: boolean; children: ReactNode;
} & Omit<BoxProps, 'id' | 'title' | 'children'>) {
  const [open, setOpen] = useSavedState(`panel.${id}`, defaultOpen, isBoolean);
  const toggle = <chakra.button type="button" aria-expanded={open} data-panel-toggle={id} display="inline-flex" alignItems="center" gap={1}
    fontSize="sm" fontWeight="semibold" color={open ? 'fg' : 'fg.muted'} cursor="pointer" title={open ? `Collapse ${title}` : `Expand ${title}`}
    onClick={event => {event.currentTarget.blur(); setOpen(!open);}}>
    <Box as="span" aria-hidden="true" width="1ch" display="inline-block">{open ? '▾' : '▸'}</Box>{title}
  </chakra.button>;
  if (bare) return <Box data-panel={id} data-panel-open={open} minWidth={0} {...box}>{toggle}{open && <Box mt={2}>{children}</Box>}</Box>;
  return <Box as="fieldset" data-panel={id} data-panel-open={open} minWidth={0} borderWidth="1px" borderRadius="md" p={open ? 3 : 2} {...box}>
    <Box as="legend" px={1}>{toggle}</Box>
    {open && children}
  </Box>;
}
