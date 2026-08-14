import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors';
import type { CategoryFilter, ClothingItem } from '../types/clothing';
import { CATEGORY_FILTERS } from '../types/clothing';
import { useColorPaletteOptions } from '../hooks/useColorPaletteOptions';
import { clothingMatchesSearch } from '../services/colorSearch';

type WardrobeScreenProps = {
  items: ClothingItem[];
  selectedCategory: CategoryFilter;
  isLoading: boolean;
  bottomInset: number;
  onSelectCategory: (category: CategoryFilter) => void;
  onItemPress: (item: ClothingItem) => void;
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
  onItemPress,
  onAddPress,
}: WardrobeScreenProps) {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const { colorOptions } = useColorPaletteOptions();

  const tileSize = useMemo(() => {
    const availableWidth = width - SIDE_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1);

    return Math.floor(availableWidth / GRID_COLUMNS);
  }, [width]);
  const visibleItems = useMemo(() => {
    return items.filter((item) => clothingMatchesSearch(item, searchQuery, colorOptions));
  }, [colorOptions, items, searchQuery]);

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

        <View style={styles.searchWrap}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="이름, 브랜드, 계절, 색 검색"
            placeholderTextColor={COLORS.textSecondary}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
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
            data={visibleItems}
            keyExtractor={(item) => String(item.id)}
            numColumns={GRID_COLUMNS}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={[
              styles.gridContent,
              { paddingBottom: bottomInset + 24 },
              visibleItems.length === 0 && styles.emptyGridContent,
            ]}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => onItemPress(item)}
                style={[
                  styles.gridTile,
                  {
                    width: tileSize,
                  },
                ]}
                hitSlop={8}
              >
                <View style={styles.itemImageFrame}>
                  <Image source={{ uri: item.localImagePath }} style={styles.itemImage} />
                  <View style={[styles.syncPill, getSyncPillStyle(item.cloudSyncStatus)]}>
                    <Text style={styles.syncText}>{getSyncLabel(item.cloudSyncStatus)}</Text>
                  </View>
                </View>
                <View style={styles.brandRow}>
                  <Text style={styles.brandText} numberOfLines={1}>
                    {item.brand || item.name || item.category}
                  </Text>
                </View>
              </Pressable>
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
    return '☁';
  }

  if (status === 'pending') {
    return '⇧';
  }

  if (status === 'failed') {
    return '!';
  }

  return '•';
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
  searchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  searchInput: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 6,
  },
  filterScroll: {
    maxHeight: 46,
  },
  categoryChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
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
    fontSize: 13,
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
  itemImageFrame: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
  },
  itemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  syncPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    minHeight: 28,
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
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.surface,
  },
  brandRow: {
    minHeight: 38,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
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
