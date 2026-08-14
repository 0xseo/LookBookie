import { BookOpen, Shirt, UserRound, Users } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors';

export type AppTab = 'wardrobe' | 'codiBook' | 'friends' | 'profile';

type BottomTabsProps = {
  activeTab: AppTab;
  bottomOffset: number;
  onSelectTab: (tab: AppTab) => void;
};

type TabConfig = {
  key: AppTab;
  label: string;
  Icon: typeof Shirt;
};

const TABS: TabConfig[] = [
  { key: 'wardrobe', label: '옷장', Icon: Shirt },
  { key: 'codiBook', label: '코디북', Icon: BookOpen },
  { key: 'friends', label: '친구', Icon: Users },
  { key: 'profile', label: '마이', Icon: UserRound },
];

export function BottomTabs({ activeTab, bottomOffset, onSelectTab }: BottomTabsProps) {
  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        const iconColor = isActive ? COLORS.primary : COLORS.textSecondary;
        const Icon = tab.Icon;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            style={[styles.tab, isActive && styles.activeTab]}
            hitSlop={8}
          >
            <Icon color={iconColor} size={20} strokeWidth={2.2} />
            <Text style={[styles.label, isActive && styles.activeText]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 64,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    gap: 8,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: COLORS.secondary,
  },
  label: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeText: {
    color: COLORS.primary,
  },
});
