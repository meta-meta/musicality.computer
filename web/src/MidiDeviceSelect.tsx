import {useAppSelector} from './redux/hooks.ts';
import {
  SelectContent,
  SelectItem,
  SelectItemGroup,
  SelectLabel,
  SelectRoot,
  SelectTrigger,
  SelectValueText,
} from './components/ui/select.tsx';

export enum SelectionType {
  Input,
  Output,
}

interface MidiDeviceSelectionProps {
  label: string;
  onSelect: (value: string) => void;
  selectionType: SelectionType;
  value: string | null;
}

function MidiDeviceSelect({
  label,
  onSelect,
  selectionType,
  value,
}: MidiDeviceSelectionProps) {

  const deviceState = selectionType === SelectionType.Input ? 'inputs' : 'outputs';
  const deviceOptions = useAppSelector(s => s.midiReducer[deviceState]);

  const deviceGroups = deviceOptions.items.reduce(
    (acc, item) => {
      const group = acc.find((group) => group.group === item.group);
      if (group) {
        group.items.push(item);
      } else {
        acc.push({group: item.group, items: [item]});
      }
      return acc;
    },
    [] as { group: string; items: (typeof deviceOptions)['items'] }[],
  );

  return (
    <SelectRoot
      collection={deviceOptions}
      value={value ? [value] : undefined}
      onValueChange={(e) => {
        onSelect(e.value[0]);
      }}
    >
      <SelectLabel>{label}</SelectLabel>
      <SelectTrigger>
        <SelectValueText placeholder="Select device"/>
      </SelectTrigger>

      <SelectContent>
        {deviceGroups.map((category) => (
          <SelectItemGroup key={category.group} label={category.group}>
            {deviceOptions.items
              .filter(i => i.group === category.group)
              .map((item) => (
                <SelectItem item={item} key={item.value}>
                  {item.label}
                </SelectItem>
              ))}
          </SelectItemGroup>
        ))}
      </SelectContent>
    </SelectRoot>
  );
}

export default MidiDeviceSelect;