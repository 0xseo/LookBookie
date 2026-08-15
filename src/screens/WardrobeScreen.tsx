import { useMemo, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import {
  SEASONS,
  type CategoryFilter,
  type ClothingItem,
  type Season,
} from "../types/clothing";
import { useCategoryOptions } from "../hooks/useCategoryOptions";
import { useColorPaletteOptions } from "../hooks/useColorPaletteOptions";
import { clothingMatchesSearch } from "../services/colorSearch";
import {
  ArrowDownAZ,
  CalendarArrowDown,
  CalendarArrowUp,
  Check,
  CloudAlert,
  CloudCheck,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react-native";

type WardrobeScreenProps = {
  items: ClothingItem[];
  selectedCategory: CategoryFilter;
  isLoading: boolean;
  bottomInset: number;
  onSelectCategory: (category: CategoryFilter) => void;
  onItemPress: (item: ClothingItem) => void;
  onAddPress: () => void;
  onRefresh: () => void | Promise<void>;
};

const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const SIDE_PADDING = 16;

type WardrobeSort = "createdDesc" | "createdAsc" | "nameAsc";
type ToolbarPanel = "sort" | "filter" | null;

const SORT_OPTIONS: Array<{
  value: WardrobeSort;
  label: string;
  Icon: typeof CalendarArrowDown;
}> = [
  { value: "createdDesc", label: "최신순", Icon: CalendarArrowDown },
  { value: "createdAsc", label: "오래된순", Icon: CalendarArrowUp },
  { value: "nameAsc", label: "이름순", Icon: ArrowDownAZ },
];

export function WardrobeScreen({
  items,
  selectedCategory,
  isLoading,
  bottomInset,
  onSelectCategory,
  onItemPress,
  onAddPress,
  onRefresh,
}: WardrobeScreenProps) {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<WardrobeSort>("createdDesc");
  const [toolbarPanel, setToolbarPanel] = useState<ToolbarPanel>(null);
  const [selectedSeasons, setSelectedSeasons] = useState<Season[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const { colorOptions } = useColorPaletteOptions();
  const { categoryOptions } = useCategoryOptions();
  const categoryFilters: CategoryFilter[] = ["전체", ...categoryOptions];

  const tileSize = useMemo(() => {
    const availableWidth =
      width - SIDE_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1);

    return Math.floor(availableWidth / GRID_COLUMNS);
  }, [width]);
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
  const activeFilterCount = selectedSeasons.length + selectedColors.length;
  const selectedSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortOrder)?.label ??
    "최신순";

  const toggleSeason = (season: Season) => {
    setSelectedSeasons((current) =>
      current.includes(season)
        ? current.filter((value) => value !== season)
        : [...current, season]
    );
  };

  const toggleColor = (label: string) => {
    setSelectedColors((current) =>
      current.includes(label)
        ? current.filter((value) => value !== label)
        : [...current, label]
    );
  };

  const resetFilters = () => {
    setSelectedSeasons([]);
    setSelectedColors([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>룩부기 옷장</Text>
            <Text style={styles.headerCaption}>오프라인 옷장을 차곡차곡</Text>
          </View>
          <Pressable
            onPress={onRefresh}
            style={styles.mascotSlot}
            accessibilityLabel="룩부기 마스코트 자리"
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.mascot}>🐢</Text>
          </Pressable>
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

        <View style={styles.toolbar}>
          <Pressable
            onPress={() =>
              setToolbarPanel((current) => (current === "sort" ? null : "sort"))
            }
            style={[
              styles.toolbarButton,
              toolbarPanel === "sort" && styles.toolbarButtonActive,
            ]}
            hitSlop={8}
          >
            <ArrowDownAZ color={COLORS.primary} size={18} strokeWidth={2.2} />
            <Text style={styles.toolbarButtonText}>{selectedSortLabel}</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              setToolbarPanel((current) =>
                current === "filter" ? null : "filter"
              )
            }
            style={[
              styles.toolbarButton,
              (toolbarPanel === "filter" || activeFilterCount > 0) &&
                styles.toolbarButtonActive,
            ]}
            hitSlop={8}
          >
            <SlidersHorizontal
              color={COLORS.primary}
              size={18}
              strokeWidth={2.2}
            />
            <Text style={styles.toolbarButtonText}>필터</Text>
            {activeFilterCount > 0 ? (
              <View style={styles.filterCountBadge}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {toolbarPanel === "sort" ? (
          <View style={styles.controlPanel}>
            <Text style={styles.controlTitle}>정렬</Text>
            <View style={styles.sortOptions}>
              {SORT_OPTIONS.map((option) => {
                const selected = sortOrder === option.value;
                const Icon = option.Icon;

                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      setSortOrder(option.value);
                      setToolbarPanel(null);
                    }}
                    style={[
                      styles.sortOption,
                      selected && styles.sortOptionSelected,
                    ]}
                    hitSlop={8}
                  >
                    <Icon
                      color={selected ? COLORS.primary : COLORS.textSecondary}
                      size={18}
                      strokeWidth={2.2}
                    />
                    <Text
                      style={[
                        styles.sortOptionText,
                        selected && styles.sortOptionTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {toolbarPanel === "filter" ? (
          <View style={styles.controlPanel}>
            <View style={styles.controlHeadingRow}>
              <Text style={styles.controlTitle}>필터</Text>
              {activeFilterCount > 0 ? (
                <Pressable
                  onPress={resetFilters}
                  style={styles.resetButton}
                  hitSlop={8}
                >
                  <RotateCcw
                    color={COLORS.textSecondary}
                    size={16}
                    strokeWidth={2.2}
                  />
                  <Text style={styles.resetButtonText}>초기화</Text>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.filterLabel}>계절</Text>
            <View style={styles.filterChipRow}>
              {SEASONS.map((season) => {
                const selected = selectedSeasons.includes(season);

                return (
                  <Pressable
                    key={season}
                    onPress={() => toggleSeason(season)}
                    style={[
                      styles.filterChip,
                      selected && styles.filterChipSelected,
                    ]}
                    hitSlop={8}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selected && styles.filterChipTextSelected,
                      ]}
                    >
                      {season}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.filterLabel}>색상</Text>
            <View style={styles.colorFilters}>
              {colorOptions.map((option) => {
                const selected = selectedColors.includes(option.label);

                return (
                  <Pressable
                    key={option.label}
                    onPress={() => toggleColor(option.label)}
                    style={[
                      styles.colorFilterButton,
                      selected && styles.colorFilterButtonSelected,
                    ]}
                    accessibilityLabel={option.label}
                    accessibilityState={{ selected }}
                    hitSlop={6}
                  >
                    <View
                      style={[
                        styles.colorFilterSwatch,
                        { backgroundColor: option.value },
                      ]}
                    >
                      {selected ? (
                        <Check
                          color={COLORS.primary}
                          size={16}
                          strokeWidth={3}
                        />
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

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
            data={visibleItems}
            refreshing={isLoading}
            onRefresh={onRefresh}
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
                  <Image
                    source={{ uri: item.localImagePath }}
                    style={styles.itemImage}
                  />
                  <SyncStatusBadge status={item.cloudSyncStatus} />
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

function EmptyWardrobe() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyMascot}>🐢</Text>
      <View style={styles.speechBubble}>
        <Text style={styles.emptyText}>
          {"아직 옷장이 비어있어북! \n첫 옷을 등록해봐북 🐢"}
        </Text>
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
  mascotSlot: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
    fontWeight: "400",
    color: COLORS.textPrimary,
  },
  toolbar: {
    paddingHorizontal: 16,
    flexDirection: "row",
    gap: 8,
  },
  toolbarButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  toolbarButtonActive: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  toolbarButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  filterCountBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.surface,
  },
  controlPanel: {
    marginHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  controlHeadingRow: {
    minHeight: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  sortOptions: {
    flexDirection: "row",
    gap: 8,
  },
  sortOption: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 5,
  },
  sortOptionSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  sortOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  sortOptionTextSelected: {
    color: COLORS.primary,
  },
  resetButton: {
    minHeight: 32,
    paddingHorizontal: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  filterChipRow: {
    flexDirection: "row",
    gap: 6,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  filterChipTextSelected: {
    color: COLORS.primary,
  },
  colorFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  colorFilterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.transparent,
    alignItems: "center",
    justifyContent: "center",
  },
  colorFilterButtonSelected: {
    borderColor: COLORS.primary,
  },
  colorFilterSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
    gap: 6,
  },
  filterScroll: {
    height: 48,
    flexGrow: 0,
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
  brandRow: {
    minHeight: 38,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  brandText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  emptyState: {
    alignItems: "center",
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
    fontWeight: "400",
    lineHeight: 20,
    color: COLORS.textPrimary,
    textAlign: "center",
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
  },
});
