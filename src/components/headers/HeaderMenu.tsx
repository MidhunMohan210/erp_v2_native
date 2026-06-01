import { useState } from "react";
import { Pressable, View } from "react-native";
import { Menu } from "react-native-paper";
import { Feather } from "@expo/vector-icons";

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
        backgroundColor: "black",
        borderRadius: 20,
        marginTop: 14,
        paddingVertical: 6,
        minWidth: 180,
      
        borderWidth: 1,
        borderColor: "#e2e8f0",
      }}
      anchor={
        <Pressable
          hitSlop={10}
          onPress={() => setVisible(true)}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/15"
          style={{
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.12,
            shadowRadius: 14,
            elevation: 6,
          }}
        >
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-white/10">
            {/* <Feather name="more-vertical" size={18} color="#ffffff" /> */}
          </View>
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
            style={{ borderRadius: 14 }}
          />
        );
      })}
    </Menu>
  );
}
