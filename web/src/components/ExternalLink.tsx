import {ReactNode} from 'react';
import {TbExternalLink} from 'react-icons/tb';
import {Tag} from './chakra-ui/tag.tsx';
import {Link} from '@chakra-ui/react';

export interface ExternalLinkProps {
  label: string;
  href: string;
  icon?: ReactNode;
}

function ExternalLink({
  label,
  href,
  icon = <TbExternalLink/>,
}: ExternalLinkProps) {

  return (
    <Tag as="span" gap={1} endElement={icon} verticalAlign="middle">
      <Link href={href} target="_blank">{label}</Link>
    </Tag>);
}

export default ExternalLink;