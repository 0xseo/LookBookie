import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  CloudAlert,
  CloudCheck,
  Plus
} from "lucide-react-native";
import { COLORS } from "../../constants/colors";
import { BrandMascotButton } from "../components/BrandMascotButton";
import { MascotEmptyState } from "../components/MascotEmptyState";
import { CollectionToolbar } from "../components/CollectionToolbar";
import { useCategoryOptions } from "../hooks/useCategoryOptions";
import { useColorPaletteOptions } from "../hooks/useColorPaletteOptions";
import { useGridColumns } from "../hooks/useGridColumns";
import { EMPTY_FILTERS, type CollectionFilters, type CollectionSort } from "../services/collectionControls";
import { clothingMatchesSearch } from "../services/colorSearch";
import {
  type CategoryFilter,
  type ClothingItem
} from "../types/clothing";

type WardrobeScreenProps = {
  items: ClothingItem[];
  selectedCategory: CategoryFilter;
  isLoading: boolean;
  bottomInset: number;
  onSelectCategory: (category: CategoryFilter) => void;
  onItemPress: (item: ClothingItem) => void;
  onAddPress: () => void;
  onRefresh: () => void | Promise<void>;
  resetSignal: number;
};

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
  onRefresh,
  resetSignal,
}: WardrobeScreenProps) {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<CollectionSort>("createdDesc");
  const [filters, setFilters] = useState<CollectionFilters>(EMPTY_FILTERS);
  const { gridColumns, cycleGridColumns } = useGridColumns("wardrobe.gridColumns");
  const listRef = useRef<FlatList<ClothingItem>>(null);
  const selectedSeasons = filters.seasons;
  const selectedColors = filters.colors;
  const { colorOptions } = useColorPaletteOptions();
  const { categoryOptions } = useCategoryOptions();
  const categoryFilters: CategoryFilter[] = ["전체", ...categoryOptions];

  const tileSize = useMemo(() => {
    const availableWidth =
      width - SIDE_PADDING * 2 - GRID_GAP * (gridColumns - 1);

    return Math.floor(availableWidth / gridColumns);
  }, [width, gridColumns]);
  const visibleItems = useMemo(() => {
    return items
      .filter((item) => {
        const matchesSeason =
          selectedSeasons.length === 0 ||
          selectedSeasons.some((season) => item.seasons.includes(season));
        const matchesColor =
          selectedColors.length === 0 || selectedColors.includes(item.color);

        return (
          matchesSeason &&
          matchesColor &&
          clothingMatchesSearch(item, searchQuery, colorOptions)
        );
      })
      .sort((left, right) => {
        if (sortOrder === "nameAsc") {
          return getItemSortName(left).localeCompare(
            getItemSortName(right),
            "ko"
          );
        }

        const createdDifference =
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime();

        return sortOrder === "createdAsc"
          ? createdDifference
          : -createdDifference;
      });
  }, [
    colorOptions,
    items,
    searchQuery,
    selectedColors,
    selectedSeasons,
    sortOrder,
  ]);

  useEffect(() => {
    onSelectCategory("전체");
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  }, [onSelectCategory, resetSignal]);


  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>룩부기 옷장</Text>
            <Text style={styles.headerCaption}>오프라인 옷장을 차곡차곡</Text>
          </View>
          <BrandMascotButton screen="wardrobe" onPress={() => void onRefresh()} label="옷장 새로고침" />
        </View>
        <CollectionToolbar query={searchQuery} onQueryChange={setSearchQuery} placeholder="이름, 브랜드, 태그, 핏/사이즈 검색" sort={sortOrder} onSortChange={setSortOrder} filters={filters} onFiltersChange={setFilters} title="옷장" bottomInset={bottomInset} gridColumns={gridColumns} onCycleGridColumns={cycleGridColumns} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          {categoryFilters.map((category) => {
            const isSelected = selectedCategory === category;

            return (
              <Pressable
                key={category}
                onPress={() => onSelectCategory(category)}
                style={[
                  styles.categoryChip,
                  isSelected && styles.categoryChipSelected,
                ]}
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
            key={`wardrobe-${gridColumns}`}
            ref={listRef}
            data={visibleItems}
            refreshing={isLoading}
            onRefresh={onRefresh}
            keyExtractor={(item) => String(item.id)}
            numColumns={gridColumns}
            columnWrapperStyle={gridColumns > 1 ? styles.gridRow : undefined}
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
                    marginBottom: gridColumns === 1 ? GRID_GAP : 0,
                  },
                ]}
                hitSlop={8}
              >
                <View style={styles.itemImageFrame}>
                  <Image
                    source={{ uri: item.localImagePath }}
                    style={styles.itemImage}
                  />
                  <SyncStatusBadge status={item.cloudSyncStatus} />
                </View>
                <View style={styles.itemLabelBlock}>
                  <Text style={styles.itemNameText} numberOfLines={1}>
                    {item.name || item.category}
                  </Text>
                  <Text style={styles.itemBrandText} numberOfLines={1}>
                    {item.brand || "브랜드 없음"}
                  </Text>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={<MascotEmptyState screen="wardrobe" message={searchQuery.trim() || selectedCategory !== "전체" || selectedSeasons.length || selectedColors.length ? "검색 결과가 없어북" : undefined} />}
          />
        )}

        <Pressable
          onPress={onAddPress}
          style={[styles.fab, { bottom: bottomInset + 16 }]}
          accessibilityLabel="옷 추가"
          hitSlop={8}
        >
          <Plus color={COLORS.surface} size={28} strokeWidth={2.6} />
        </Pressable>

      </View>
    </SafeAreaView>
  );
}

function SyncStatusBadge({
  status,
}: {
  status: ClothingItem["cloudSyncStatus"];
}) {
  const isSynced = status === "synced";
  const Icon = isSynced ? CloudCheck : CloudAlert;

  return (
    <View
      style={[styles.syncPill, getSyncPillStyle(status)]}
      accessibilityLabel={isSynced ? "클라우드 동기화 완료" : "클라우드 동기화 필요"}
    >
      <Icon color={COLORS.surface} size={17} strokeWidth={2.6} />
    </View>
  );
}

function getItemSortName(item: ClothingItem) {
  return (item.name || item.brand || item.category).trim();
}

function getSyncPillStyle(status: ClothingItem["cloudSyncStatus"]) {
  if (status === "synced") {
    return styles.syncPillSynced;
  }

  if (status === "failed") {
    return styles.syncPillFailed;
  }

  if (status === "pending") {
    return styles.syncPillPending;
  }

  return styles.syncPillLocal;
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  headerCaption: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    alignItems: "center",
  },
  filterScroll: {
    height: 50,
    flexGrow: 0,
    overflow: "visible",
  },
  categoryChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipSelected: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.primaryLight,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  categoryChipTextSelected: {
    color: COLORS.primary,
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyGridContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  gridTile: {
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  itemImageFrame: {
    width: "100%",
    aspectRatio: 1,
    padding: 6,
    backgroundColor: COLORS.surface,
  },
  itemImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  syncPill: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    minHeight: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
  itemLabelBlock: {
    minHeight: 52,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  itemBrandText: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    elevation: 5,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
});
