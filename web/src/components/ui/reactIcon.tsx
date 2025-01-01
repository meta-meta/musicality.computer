import { forwardRef } from 'react';
import { Icon, Span, type IconProps } from '@chakra-ui/react';
import type { ForwardRefRenderFunction } from 'react';
import type { IconType } from 'react-icons'

type ReactIconProps = IconProps & {
  icon: IconType;
};

// https://github.com/chakra-ui/chakra-ui/issues/9227#issuecomment-2508403355
const ReactIcon: ForwardRefRenderFunction<HTMLElement, ReactIconProps> = ({ icon: IconType, ...props }, ref) => (
  <Icon {...props}>
    <Span ref={ref} height={"unset"} lineHeight={"unset"}>
      <IconType />
    </Span>
  </Icon>
);

const ForwardedReactIcon = forwardRef(ReactIcon);

export { ForwardedReactIcon as ReactIcon };