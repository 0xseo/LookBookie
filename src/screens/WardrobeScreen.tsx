import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors';
import type { CategoryFilter, ClothingItem } from '../types/clothing';
import { CATEGORY_FILTERS } from '../types/clothing';

type WardrobeScreenProps = {
  items: ClothingItem[];
  selectedCategory: CategoryFilter;
  isLoading: boolean;
  bottomInset: number;
  onSelectCategory: (category: CategoryFilter) => void;
  onAddPress: () => void;
};

const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const SIDE_PADDING = 16;

export function WardrobeScreen({
  items,
  selectedCategory,
  isLoading,
  bottomInset,
  onSelectCategory,
  onAddPress,
}: WardrobeScreenProps) {
  const { width } = useWindowDimensions();

  const tileSize = useMemo(() => {
    const availableWidth = width - SIDE_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1);

    return Math.floor(availableWidth / GRID_COLUMNS);
  }, [width]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>룩북이</Text>
            <Text style={styles.headerCaption}>오프라인 옷장을 차곡차곡</Text>
          </View>
          <View style={styles.mascotSlot} accessibilityLabel="룩북이 마스코트 자리">
            <Text style={styles.mascot}>🐢</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {CATEGORY_FILTERS.map((category) => {
            const isSelected = selectedCategory === category;

            return (
              <Pressable
                key={category}
                onPress={() => onSelectCategory(category)}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    isSelected && styles.categoryChipTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {isLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loadingText}>옷장을 정리하고 있어북...</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.id)}
            numColumns={GRID_COLUMNS}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[
              styles.gridContent,
              { paddingBottom: bottomInset + 24 },
              items.length === 0 && styles.emptyGridContent,
            ]}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.gridTile,
                  {
                    width: tileSize,
                    height: tileSize,
                  },
                ]}
              >
                <Image source={{ uri: item.localImagePath }} style={styles.itemImage} />
                <View style={[styles.syncPill, getSyncPillStyle(item.cloudSyncStatus)]}>
                  <Text style={styles.syncText}>{getSyncLabel(item.cloudSyncStatus)}</Text>
                </View>
                {item.brand ? (
                  <View style={styles.brandPill}>
                    <Text style={styles.brandText} numberOfLines={1}>
                      {item.brand}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
            ListEmptyComponent={<EmptyWardrobe />}
          />
        )}

        <Pressable onPress={onAddPress} style={[styles.fab, { bottom: bottomInset }]} hitSlop={8}>
          <Text style={styles.fabText}>+ 옷 추가</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function getSyncLabel(status: ClothingItem['cloudSyncStatus']) {
  if (status === 'synced') {
    return '클라우드';
  }

  if (status === 'pending') {
    return '대기';
  }

  if (status === 'failed') {
    return '실패';
  }

  return '로컬';
}

function getSyncPillStyle(status: ClothingItem['cloudSyncStatus']) {
  if (status === 'synced') {
    return styles.syncPillSynced;
  }

  if (status === 'failed') {
    return styles.syncPillFailed;
  }

  if (status === 'pending') {
    return styles.syncPillPending;
  }

  return styles.syncPillLocal;
}

function EmptyWardrobe() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyMascot}>🐢</Text>
      <View style={styles.speechBubble}>
        <Text style={styles.emptyText}>아직 옷장이 비어있어북! 첫 옷을 등록해봐북 🐢</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    minHeight: 80,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  headerCaption: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  mascotSlot: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mascot: {
    fontSize: 28,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.primaryLight,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  categoryChipTextSelected: {
    color: COLORS.primary,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyGridContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  gridTile: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  syncPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncPillSynced: {
    backgroundColor: COLORS.primary,
  },
  syncPillFailed: {
    backgroundColor: COLORS.danger,
  },
  syncPillPending: {
    backgroundColor: COLORS.accent,
  },
  syncPillLocal: {
    backgroundColor: COLORS.textSecondary,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.surface,
  },
  brandPill: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    minHeight: 28,
    borderRadius: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    backgroundColor: COLORS.bubbleBg,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyMascot: {
    fontSize: 64,
    marginBottom: 16,
  },
  speechBubble: {
    maxWidth: 280,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: COLORS.bubbleBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 16,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.surface,
  },
});
