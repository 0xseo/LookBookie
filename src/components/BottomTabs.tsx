import { BookOpen, Shirt, UserRound, Users } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/colors";

export type AppTab = "wardrobe" | "codiBook" | "friends" | "profile";

type BottomTabsProps = {
  activeTab: AppTab;
  bottomInset: number;
  onSelectTab: (tab: AppTab) => void;
};

type TabConfig = {
  key: AppTab;
  label: string;
  Icon: typeof Shirt;
};

const TABS: TabConfig[] = [
  { key: "wardrobe", label: "옷장", Icon: Shirt },
  { key: "codiBook", label: "코디북", Icon: BookOpen },
  { key: "friends", label: "친구", Icon: Users },
  { key: "profile", label: "마이", Icon: UserRound },
];

export function BottomTabs({
  activeTab,
  bottomInset,
  onSelectTab,
}: BottomTabsProps) {
  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(6, bottomInset) }]}
    >
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const iconColor = isActive ? COLORS.primary : COLORS.textSecondary;
        const Icon = tab.Icon;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
            hitSlop={8}
          >
            <View style={[styles.iconWell]}>
              <Icon
                color={iconColor}
                size={21}
                strokeWidth={isActive ? 2.5 : 2}
              />
            </View>
            <Text style={[styles.label, isActive && styles.activeText]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 62,
    paddingHorizontal: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  tab: {
    flex: 1,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  tabPressed: {
    opacity: 0.68,
  },
  iconWell: {
    width: 52,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.transparent,
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  activeText: {
    color: COLORS.primary,
    fontWeight: "700",
  },
});
