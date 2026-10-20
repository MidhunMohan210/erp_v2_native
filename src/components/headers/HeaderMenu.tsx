import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Menu } from "react-native-paper";
import { ChevronRight, MoreVertical } from "lucide-react-native";

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
        borderRadius: 18,
        marginTop: 8,
        padding: 6,
        width: 184,
        borderWidth: 1,
        borderColor: "#e8eef5",
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.14,
        shadowRadius: 18,
        elevation: 9,
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
      <View>
        {items.map((item) => {
          const color = item.destructive ? "#e11d48" : "#134074";
          const Icon = item.icon;

          return (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => {
                setVisible(false);
                item.onPress();
              }}
              className={`min-h-12 flex-row items-center rounded-xl px-2.5 ${item.destructive ? "bg-rose-50" : "bg-slate-50"}`}
              style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
            >
              {Icon ? (
                <View
                  className="h-8 w-8 items-center justify-center rounded-[10px]"
                  style={{
                    backgroundColor: item.destructive ? "#ffe4e6" : "#eaf2f8",
                  }}
                >
                  <Icon color={color} size={17} strokeWidth={2.5} />
                </View>
              ) : null}
              <View className={Icon ? "ml-3 flex-1" : "flex-1"}>
                <Text className="text-[14px] font-extrabold" style={{ color }}>
                  {item.label}
                </Text>
              </View>
              <ChevronRight color={item.destructive ? "#fda4af" : "#94a3b8"} size={17} />
            </Pressable>
          );
        })}
      </View>
    </Menu>
  );
}
