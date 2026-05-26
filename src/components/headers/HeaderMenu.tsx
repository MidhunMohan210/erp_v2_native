import { useState } from "react";
import { Pressable, Text } from "react-native";
import { Menu } from "react-native-paper";

type HeaderMenuIcon = React.ComponentType<{
  color: string;
  size: number;
  strokeWidth: number;
}>;

interface HeaderMenuItem {
  label: string;
  icon?: HeaderMenuIcon;
  onPress: () => void;
  destructive?: boolean;
}

interface HeaderMenuProps {
  items: HeaderMenuItem[];
}

export function HeaderMenu({ items }: HeaderMenuProps) {
  const [visible, setVisible] = useState(false);

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      contentStyle={{
        backgroundColor: "#ffffff",
        borderRadius: 16,
        marginTop: 12,
      }}
      anchor={
        <Pressable
          hitSlop={10}
          onPress={() => setVisible(true)}
          className="h-8 w-8 items-center justify-center"
        >
          <Text className="text-[28px] leading-7 text-slate-700">...</Text>
        </Pressable>
      }
    >
      {items.map((item) => {
        const color = item.destructive ? "#ff0f4b" : "#134074";
        const Icon = item.icon;

        return (
          <Menu.Item
            key={item.label}
            leadingIcon={
              Icon
                ? () => <Icon color={color} size={18} strokeWidth={2.2} />
                : undefined
            }
            onPress={() => {
              setVisible(false);
              item.onPress();
            }}
            title={item.label}
            titleStyle={{ color }}
          />
        );
      })}
    </Menu>
  );
}
