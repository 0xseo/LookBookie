import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors';

export type AppTab = 'wardrobe' | 'codiBook' | 'friends' | 'profile';

type BottomTabsProps = {
  activeTab: AppTab;
  bottomOffset: number;
  onSelectTab: (tab: AppTab) => void;
};

const TABS: Array<{ key: AppTab; label: string; icon: string }> = [
  { key: 'wardrobe', label: '옷장', icon: '▦' },
  { key: 'codiBook', label: '코디북', icon: '✦' },
  { key: 'friends', label: '친구', icon: '◇' },
  { key: 'profile', label: '마이', icon: '○' },
];

export function BottomTabs({ activeTab, bottomOffset, onSelectTab }: BottomTabsProps) {
  return (
    <View style={[styles.container, { bottom: bottomOffset }]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelectTab(tab.key)}
            style={[styles.tab, isActive && styles.activeTab]}
            hitSlop={8}
          >
            <Text style={[styles.icon, isActive && styles.activeText]}>{tab.icon}</Text>
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
  icon: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textSecondary,
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
