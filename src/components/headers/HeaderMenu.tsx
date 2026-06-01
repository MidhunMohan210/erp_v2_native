import { useState } from "react";
import { Pressable, View } from "react-native";
import { Menu } from "react-native-paper";
import { MoreVertical } from "lucide-react-native";

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
  tone?: "light" | "dark";
}

export function HeaderMenu({ items, tone = "light" }: HeaderMenuProps) {
  const [visible, setVisible] = useState(false);
  const isDark = tone === "dark";

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      contentStyle={{
        backgroundColor: "#ffffff",
        borderRadius: 22,
        marginTop: 12,
        paddingVertical: 8,
        minWidth: 190,
        borderWidth: 1,
        borderColor: "#e2e8f0",
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 10,
      }}
      anchor={
        <Pressable
          hitSlop={10}
          onPress={() => setVisible(true)}
          className="h-10 w-10 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: isDark ? "rgba(255,255,255,0.16)" : "#f8fafc",
            borderWidth: 1,
            borderColor: isDark ? "rgba(255,255,255,0.18)" : "#e2e8f0",
            shadowColor: isDark ? "#020617" : "#0f172a",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: isDark ? 0.16 : 0.08,
            shadowRadius: 18,
            elevation: isDark ? 8 : 4,
          }}
        >
          <View
            className="h-8 w-8 items-center justify-center rounded-xl"
            style={{
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#ffffff",
            }}
          >
            <MoreVertical
              color={isDark ? "#ffffff" : "#475569"}
              size={18}
              strokeWidth={2.4}
            />
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
            titleStyle={{ color, fontSize: 14, fontWeight: "700" }}
            style={{ borderRadius: 16, marginHorizontal: 6 }}
          />
        );
      })}
    </Menu>
  );
}
