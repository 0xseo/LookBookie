import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  FlatList,
  Image,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Check,
  Plus,
  RotateCw,
  Scaling,
  Trash2,
  X,
} from "lucide-react-native";

import { COLORS } from "../../constants/colors";
import {
  deleteOutfitFromCloud,
  syncOutfitToCloud,
} from "../services/outfitCloud";
import {
  deleteOutfit,
  insertOutfit,
  listOutfits,
  updateOutfitCloudState,
  updateOutfit,
} from "../storage/database";
import { useColorPaletteOptions } from "../hooks/useColorPaletteOptions";
import { useCategoryOptions } from "../hooks/useCategoryOptions";
import { clothingMatchesSearch } from "../services/colorSearch";
import {
  SEASONS,
  type CategoryFilter,
  type ClothingItem,
  type ColorOption,
  type Season,
} from "../types/clothing";
import type { Outfit, OutfitSticker } from "../types/outfit";

type CodiBookScreenProps = {
  items: ClothingItem[];
  isLoading: boolean;
  bottomInset: number;
  onOutfitSaved: () => void;
  onOpenWardrobe: () => void;
};

type CanvasSize = {
  width: number;
  height: number;
};

type ImageSize = {
  width: number;
  height: number;
};

type VisualFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CodiMode = "list" | "picker" | "canvas";

const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const SIDE_PADDING = 16;
const MIN_STICKER_SIZE = 72;
const DEFAULT_STICKER_SIZE = 140;
const HANDLE_SIZE = 44;
const HANDLE_VISUAL_SIZE = 32;
const MIN_HANDLE_SPAN = 60;
const SELECTED_OUTLINE_OFFSETS = [
  { x: -2, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: -2 },
  { x: 0, y: 2 },
  { x: -1.5, y: -1.5 },
  { x: 1.5, y: 1.5 },
  { x: -1.5, y: 1.5 },
  { x: 1.5, y: -1.5 },
];

export function CodiBookScreen({
  items,
  isLoading,
  bottomInset,
  onOutfitSaved,
  onOpenWardrobe,
}: CodiBookScreenProps) {
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<CodiMode>("list");
  const [stickers, setStickers] = useState<OutfitSticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(
    null
  );
  const [editingOutfitId, setEditingOutfitId] = useState<number | null>(null);
  const [editingOutfitName, setEditingOutfitName] = useState("");
  const [editingOutfitSeasons, setEditingOutfitSeasons] = useState<Season[]>(
    []
  );
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [outfitQuery, setOutfitQuery] = useState("");
  const [pickerCategory, setPickerCategory] = useState<CategoryFilter>("전체");
  const [pickerQuery, setPickerQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { colorOptions } = useColorPaletteOptions();
  const { categoryOptions } = useCategoryOptions();
  const categoryFilters: CategoryFilter[] = ["전체", ...categoryOptions];

  const tileSize = useMemo(() => {
    const availableWidth =
      width - SIDE_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1);

    return Math.floor(availableWidth / GRID_COLUMNS);
  }, [width]);
  const selectedSticker = useMemo(
    () => stickers.find((sticker) => sticker.id === selectedStickerId),
    [selectedStickerId, stickers]
  );
  const wardrobeItemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );
  const visibleOutfits = useMemo(() => {
    const query = outfitQuery.trim().toLowerCase();

    if (!query) {
      return outfits;
    }

    return outfits.filter((outfit) =>
      outfitMatchesSearch(outfit, query, wardrobeItemsById, colorOptions)
    );
  }, [colorOptions, outfitQuery, outfits, wardrobeItemsById]);
  const pickerItems = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();

    return items.filter((item) => {
      const categoryMatches =
        pickerCategory === "전체" || item.category === pickerCategory;
      const queryMatches =
        !query || clothingMatchesSearch(item, query, colorOptions);

      return categoryMatches && queryMatches;
    });
  }, [colorOptions, items, pickerCategory, pickerQuery]);

  const loadSavedOutfits = useCallback(async () => {
    try {
      setOutfits(await listOutfits());
    } catch (error) {
      Alert.alert(
        "코디북을 불러오지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    }
  }, []);

  useEffect(() => {
    loadSavedOutfits();
  }, [loadSavedOutfits]);

  useEffect(() => {
    if (pickerCategory !== "전체" && !categoryOptions.includes(pickerCategory)) {
      setPickerCategory("전체");
    }
  }, [categoryOptions, pickerCategory]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (mode === "list") {
          return false;
        }

        setMode("list");
        return true;
      }
    );

    return () => subscription.remove();
  }, [mode]);

  const openNewPicker = () => {
    setEditingOutfitId(null);
    setEditingOutfitName("");
    setEditingOutfitSeasons([]);
    setStickers([]);
    setSelectedStickerId(null);
    setPickerCategory("전체");
    setPickerQuery("");
    setMode("picker");
  };

  const openOutfit = (outfit: Outfit) => {
    const restoredStickers = outfit.stickers.map((sticker, index) => ({
      ...sticker,
      id: `outfit-${outfit.id}-${index}-${Date.now()}`,
      zIndex: index + 1,
    }));

    setEditingOutfitId(outfit.id);
    setEditingOutfitName(outfit.name);
    setEditingOutfitSeasons(outfit.seasons);
    setStickers(restoredStickers);
    setSelectedStickerId(
      restoredStickers[restoredStickers.length - 1]?.id ?? null
    );
    setMode("canvas");
  };

  const toggleStickerFromItem = (item: ClothingItem) => {
    const existingSticker = stickers.find(
      (sticker) => sticker.clothingItemId === item.id
    );

    if (existingSticker) {
      deleteSticker(existingSticker.id);
      return;
    }

    const size = Math.min(
      DEFAULT_STICKER_SIZE,
      Math.max(MIN_STICKER_SIZE, (canvasSize.width || width) * 0.36)
    );
    const nextIndex = stickers.length + 1;
    const sticker: OutfitSticker = {
      id: `sticker-${item.id}-${Date.now()}`,
      clothingItemId: item.id,
      localImagePath: item.localImagePath,
      x: 24 + (nextIndex % 3) * 28,
      y: 32 + (nextIndex % 4) * 24,
      size,
      rotation: 0,
      zIndex: nextIndex,
    };

    setStickers((current) => [...current, sticker]);
    setSelectedStickerId(sticker.id);
  };

  const updateSticker = (id: string, updates: Partial<OutfitSticker>) => {
    setStickers((current) =>
      current.map((sticker) =>
        sticker.id === id ? { ...sticker, ...updates } : sticker
      )
    );
  };

  const deleteSticker = (id: string) => {
    setStickers((current) => current.filter((sticker) => sticker.id !== id));
    setSelectedStickerId((current) => (current === id ? null : current));
  };

  const bringSelectedForward = () => {
    if (!selectedSticker) {
      return;
    }

    const topZIndex = stickers.reduce(
      (top, sticker) => Math.max(top, sticker.zIndex),
      0
    );
    updateSticker(selectedSticker.id, { zIndex: topZIndex + 1 });
  };

  const toggleOutfitSeason = (season: Season) => {
    setEditingOutfitSeasons((current) =>
      current.includes(season)
        ? current.filter((currentSeason) => currentSeason !== season)
        : [...current, season]
    );
  };

  const saveOutfit = async () => {
    if (stickers.length === 0) {
      Alert.alert("저장할 코디가 없어북", "옷을 먼저 선택해 주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const outfitName = editingOutfitName || `코디 ${outfits.length + 1}`;
      const existingOutfit = editingOutfitId
        ? outfits.find((outfit) => outfit.id === editingOutfitId) ?? null
        : null;
      const canvasWidth = canvasSize.width || null;
      const canvasHeight = canvasSize.height || null;
      let localOutfitId: number;

      if (existingOutfit) {
        await updateOutfit({
          ...existingOutfit,
          name: outfitName,
          seasons: editingOutfitSeasons,
          stickers,
          canvasWidth,
          canvasHeight,
          cloudSyncStatus: existingOutfit.remoteRecordId ? "pending" : existingOutfit.cloudSyncStatus,
          cloudError: null,
          syncedAt: existingOutfit.remoteRecordId ? null : existingOutfit.syncedAt,
        });
        localOutfitId = existingOutfit.id;
      } else {
        localOutfitId = await insertOutfit({
          name: outfitName,
          seasons: editingOutfitSeasons,
          stickers,
          canvasWidth,
          canvasHeight,
        });
      }

      const cloudResult = await syncOutfitToCloud({
        remoteRecordId: existingOutfit?.remoteRecordId ?? null,
        name: outfitName,
        seasons: editingOutfitSeasons,
        stickers,
        wardrobeItems: items,
        canvasWidth,
        canvasHeight,
        allowLegacyMatch: Boolean(existingOutfit && !existingOutfit.remoteRecordId),
        removeLegacyDuplicates:
          Boolean(existingOutfit && !existingOutfit.remoteRecordId) &&
          outfits.filter((outfit) => outfit.name === outfitName).length === 1,
      });

      await updateOutfitCloudState(localOutfitId, cloudResult);

      await loadSavedOutfits();
      await onOutfitSaved();
      setMode("list");
      Alert.alert(
        "저장했어북",
        cloudResult.cloudSyncStatus === "synced"
          ? "코디북에 저장하고 친구가 볼 수 있게 클라우드에도 올렸어요."
          : "코디북에 로컬 저장했어요. 클라우드는 로그인 후 다시 저장하면 공유돼요."
      );
    } catch (error) {
      Alert.alert(
        "코디 저장에 실패했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteOutfit = () => {
    if (!editingOutfitId) {
      return;
    }

    Alert.alert("코디를 삭제할까북?", "저장된 코디북 목록에서 사라져요.", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          const deletingOutfit = outfits.find((outfit) => outfit.id === editingOutfitId);

          if (!deletingOutfit) {
            return;
          }

          try {
            await deleteOutfitFromCloud(deletingOutfit.remoteRecordId, deletingOutfit.name);
            await deleteOutfit(editingOutfitId);
            await loadSavedOutfits();
            await onOutfitSaved();
            setMode("list");
            setEditingOutfitId(null);
            setStickers([]);
            setSelectedStickerId(null);
          } catch (error) {
            Alert.alert(
              "코디 삭제에 실패했어북",
              error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
            );
          }
        },
      },
    ]);
  };

  const refreshCodiBook = async () => {
    setIsRefreshing(true);

    try {
      await loadSavedOutfits();
      await onOutfitSaved();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View style={[styles.container, { paddingBottom: bottomInset + 8 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>룩부기 코디북</Text>
            <Text style={styles.caption}>저장한 코디를 보고 수정해요</Text>
          </View>
          <View style={styles.headerActions}>
            {mode === "list" ? (
              <Pressable
                onPress={refreshCodiBook}
                style={styles.mascotSlot}
                accessibilityLabel="룩부기 코디북 새로고침"
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.mascot}>🐢</Text>
              </Pressable>
            ) : null}
            {mode === "picker" ? (
              <Pressable
                onPress={() => setMode("list")}
                style={styles.secondaryButton}
                hitSlop={8}
              >
                <Text style={styles.secondaryButtonText}>닫기</Text>
              </Pressable>
            ) : null}
            {mode === "canvas" && editingOutfitId ? (
              <Pressable
                onPress={confirmDeleteOutfit}
                style={styles.headerDangerButton}
                hitSlop={8}
              >
                <Text style={styles.headerDangerButtonText}>삭제</Text>
              </Pressable>
            ) : null}
            {mode === "canvas" ? (
              <Pressable
                onPress={saveOutfit}
                disabled={isSaving}
                style={[
                  styles.headerSaveButton,
                  isSaving && styles.disabledButton,
                ]}
                hitSlop={8}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.surface} />
                ) : (
                  <Text style={styles.headerSaveButtonText}>저장</Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </View>

        {mode === "list" ? (
          <View style={styles.screenBody}>
            {outfits.length > 0 ? (
              <View style={styles.listSearchWrap}>
                <TextInput
                  value={outfitQuery}
                  onChangeText={setOutfitQuery}
                  placeholder="코디 이름, 계절, 옷 정보 검색"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
              </View>
            ) : null}
            <OutfitList
              outfits={visibleOutfits}
              tileSize={tileSize}
              bottomInset={bottomInset}
              refreshing={isRefreshing}
              emptyText={
                outfitQuery.trim()
                  ? "검색 결과가 없어북"
                  : "아직 저장된 코디가 없어북"
              }
              onSelect={openOutfit}
              onRefresh={refreshCodiBook}
            />
          </View>
        ) : null}

        {mode === "picker" ? (
          <View style={styles.screenBody}>
            <View style={styles.pickerControls}>
              <TextInput
                value={pickerQuery}
                onChangeText={setPickerQuery}
                placeholder="이름, 브랜드, 계절, 색 검색"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.searchInput}
                returnKeyType="search"
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterContent}
              >
                {categoryFilters.map((category) => {
                  const selected = pickerCategory === category;

                  return (
                    <Pressable
                      key={category}
                      onPress={() => setPickerCategory(category)}
                      style={[
                        styles.categoryChip,
                        selected && styles.categoryChipSelected,
                      ]}
                      hitSlop={8}
                    >
                      <Text
                        style={[
                          styles.categoryChipText,
                          selected && styles.categoryChipTextSelected,
                        ]}
                      >
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {isLoading ? (
              <View style={styles.centerContent}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyMascot}>🐢</Text>
                <View style={styles.speechBubble}>
                  <Text style={styles.emptyText}>코디할 옷이 아직 없어북</Text>
                </View>
                <Pressable
                  onPress={onOpenWardrobe}
                  style={styles.primaryButton}
                  hitSlop={8}
                >
                  <Text style={styles.primaryButtonText}>옷장으로</Text>
                </Pressable>
              </View>
            ) : (
              <FlatList
                data={pickerItems}
                keyExtractor={(item) => String(item.id)}
                numColumns={GRID_COLUMNS}
                columnWrapperStyle={styles.gridRow}
                contentContainerStyle={styles.gridContent}
                renderItem={({ item }) => {
                  const selected = stickers.some(
                    (sticker) => sticker.clothingItemId === item.id
                  );

                  return (
                    <Pressable
                      onPress={() => toggleStickerFromItem(item)}
                      style={[
                        styles.libraryTile,
                        {
                          width: tileSize,
                        },
                        selected && styles.libraryTileSelected,
                      ]}
                      hitSlop={8}
                    >
                      <View style={styles.libraryImageFrame}>
                        <Image
                          source={{ uri: item.localImagePath }}
                          style={styles.libraryImage}
                        />
                      </View>
                      <Text style={styles.libraryText} numberOfLines={1}>
                        {item.brand || item.name || item.category}
                      </Text>
                      <View
                        style={[
                          styles.pickBadge,
                          selected && styles.pickBadgeSelected,
                        ]}
                      >
                        {selected ? (
                          <Check color={COLORS.surface} size={17} strokeWidth={2.8} />
                        ) : (
                          <Plus color={COLORS.surface} size={17} strokeWidth={2.8} />
                        )}
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}

            <SelectedBar
              stickers={stickers}
              onRemove={deleteSticker}
              onArrange={() => setMode("canvas")}
            />
          </View>
        ) : null}

        {mode === "canvas" ? (
          <View style={styles.screenBody}>
            <View style={styles.canvasMetaPanel}>
              <TextInput
                value={editingOutfitName}
                onChangeText={setEditingOutfitName}
                placeholder="코디 이름"
                placeholderTextColor={COLORS.textSecondary}
                style={styles.outfitNameInput}
                returnKeyType="done"
              />
              <View style={styles.seasonChipRow}>
                {SEASONS.map((season) => {
                  const selected = editingOutfitSeasons.includes(season);

                  return (
                    <Pressable
                      key={season}
                      onPress={() => toggleOutfitSeason(season)}
                      style={[
                        styles.seasonChip,
                        selected && styles.seasonChipSelected,
                      ]}
                      hitSlop={8}
                    >
                      <Text
                        style={[
                          styles.seasonChipText,
                          selected && styles.seasonChipTextSelected,
                        ]}
                      >
                        {season}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.canvasActions}>
              <Pressable
                onPress={() => setMode("picker")}
                style={styles.canvasIconButton}
                accessibilityLabel="옷 추가"
                hitSlop={8}
              >
                <Plus color={COLORS.surface} size={24} strokeWidth={2.6} />
              </Pressable>
              <Pressable
                onPress={bringSelectedForward}
                disabled={!selectedSticker}
                style={[
                  styles.secondaryButton,
                  !selectedSticker && styles.mutedButton,
                ]}
                hitSlop={8}
              >
                <Text style={styles.secondaryButtonText}>앞으로</Text>
              </Pressable>
            </View>

            <View
              style={styles.canvas}
              onLayout={(event) => {
                setCanvasSize({
                  width: event.nativeEvent.layout.width,
                  height: event.nativeEvent.layout.height,
                });
              }}
            >
              {stickers.length > 0 ? (
                <Pressable
                  onPress={() => setSelectedStickerId(null)}
                  style={StyleSheet.absoluteFill}
                  hitSlop={8}
                />
              ) : null}

              {stickers.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyMascot}>🐢</Text>
                  <View style={styles.speechBubble}>
                    <Text style={styles.emptyText}>
                      옷 추가에서 코디할 옷을 가져와봐북
                    </Text>
                  </View>
                </View>
              ) : null}

              {stickers.map((sticker) => (
                <CanvasSticker
                  key={sticker.id}
                  sticker={sticker}
                  canvasSize={canvasSize}
                  selected={selectedStickerId === sticker.id}
                  onSelect={() => setSelectedStickerId(sticker.id)}
                  onChange={(updates) => updateSticker(sticker.id, updates)}
                  onDelete={() => deleteSticker(sticker.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {mode === "list" ? (
          <Pressable
            onPress={openNewPicker}
            style={[styles.fab, { bottom: bottomInset + 16 }]}
            accessibilityLabel="코디 추가"
            hitSlop={8}
          >
            <Plus color={COLORS.surface} size={28} strokeWidth={2.6} />
          </Pressable>
        ) : null}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type OutfitListProps = {
  outfits: Outfit[];
  tileSize: number;
  bottomInset: number;
  refreshing: boolean;
  emptyText: string;
  onSelect: (outfit: Outfit) => void;
  onRefresh: () => void | Promise<void>;
};

function OutfitList({
  outfits,
  tileSize,
  bottomInset,
  refreshing,
  emptyText,
  onSelect,
  onRefresh,
}: OutfitListProps) {
  return (
    <FlatList
      data={outfits}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyExtractor={(outfit) => String(outfit.id)}
      numColumns={GRID_COLUMNS}
      columnWrapperStyle={styles.outfitGridRow}
      contentContainerStyle={[
        styles.outfitListContent,
        { paddingBottom: bottomInset + 24 },
        outfits.length === 0 && styles.emptyListContent,
      ]}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyMascot}>🐢</Text>
          <View style={styles.speechBubble}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onSelect(item)}
          style={[styles.outfitCard, { width: tileSize }]}
          hitSlop={8}
        >
          <OutfitPreviewCanvas
            stickers={item.stickers}
            canvasWidth={item.canvasWidth}
            canvasHeight={item.canvasHeight}
            previewSize={tileSize}
          />
          <View style={styles.outfitLabelRow}>
            <Text style={styles.outfitName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.outfitMeta}>{item.stickers.length}개</Text>
            {item.seasons.length > 0 ? (
              <Text style={styles.outfitSeasons} numberOfLines={1}>
                {item.seasons.join(" · ")}
              </Text>
            ) : null}
          </View>
        </Pressable>
      )}
    />
  );
}

type OutfitPreviewCanvasProps = {
  stickers: OutfitSticker[];
  canvasWidth: number | null;
  canvasHeight: number | null;
  previewSize: number;
};

function OutfitPreviewCanvas({
  stickers,
  canvasWidth,
  canvasHeight,
  previewSize,
}: OutfitPreviewCanvasProps) {
  const layout = getPreviewLayout(
    stickers,
    canvasWidth,
    canvasHeight,
    previewSize
  );

  return (
    <View
      style={[
        styles.outfitPreview,
        { width: previewSize, height: previewSize },
      ]}
    >
      {stickers
        .slice()
        .sort((first, second) => first.zIndex - second.zIndex)
        .map((sticker, index) => (
          <Image
            key={`${sticker.id}-${index}`}
            source={{ uri: sticker.localImagePath }}
            style={[
              styles.outfitPreviewImage,
              {
                left: layout.offsetX + (sticker.x - layout.minX) * layout.scale,
                top: layout.offsetY + (sticker.y - layout.minY) * layout.scale,
                width: sticker.size * layout.scale,
                height: sticker.size * layout.scale,
                transform: [{ rotate: `${sticker.rotation}deg` }],
                zIndex: sticker.zIndex,
              },
            ]}
          />
        ))}
    </View>
  );
}

type SelectedBarProps = {
  stickers: OutfitSticker[];
  onRemove: (id: string) => void;
  onArrange: () => void;
};

function SelectedBar({ stickers, onRemove, onArrange }: SelectedBarProps) {
  return (
    <View style={styles.selectedBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectedList}
      >
        {stickers.length === 0 ? (
          <Text style={styles.selectedEmptyText}>선택한 옷이 없어북</Text>
        ) : (
          stickers.map((sticker) => (
            <Pressable
              key={sticker.id}
              onPress={() => onRemove(sticker.id)}
              style={styles.selectedThumb}
              accessibilityLabel="선택한 옷 제거"
              hitSlop={8}
            >
              <Image
                source={{ uri: sticker.localImagePath }}
                style={styles.selectedThumbImage}
              />
              <View pointerEvents="none" style={styles.selectedRemove}>
                <X color={COLORS.surface} size={14} strokeWidth={2.8} />
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
      <Pressable
        onPress={onArrange}
        disabled={stickers.length === 0}
        style={[
          styles.arrangeButton,
          stickers.length === 0 && styles.mutedButton,
        ]}
        hitSlop={8}
      >
        <Text style={styles.arrangeButtonText}>배치</Text>
      </Pressable>
    </View>
  );
}

function getPreviewLayout(
  stickers: OutfitSticker[],
  canvasWidth: number | null,
  canvasHeight: number | null,
  previewSize: number
) {
  if (canvasWidth && canvasHeight) {
    const scale = Math.min(
      previewSize / canvasWidth,
      previewSize / canvasHeight
    );

    return {
      minX: 0,
      minY: 0,
      offsetX: (previewSize - canvasWidth * scale) / 2,
      offsetY: (previewSize - canvasHeight * scale) / 2,
      scale,
    };
  }

  if (stickers.length === 0) {
    return { minX: 0, minY: 0, offsetX: 0, offsetY: 0, scale: 1 };
  }

  const bounds = stickers.reduce(
    (current, sticker) => ({
      minX: Math.min(current.minX, sticker.x),
      minY: Math.min(current.minY, sticker.y),
      maxX: Math.max(current.maxX, sticker.x + sticker.size),
      maxY: Math.max(current.maxY, sticker.y + sticker.size),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: 0,
      maxY: 0,
    }
  );
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const inset = 12;
  const scale = Math.min(
    (previewSize - inset * 2) / contentWidth,
    (previewSize - inset * 2) / contentHeight
  );

  return {
    minX: bounds.minX,
    minY: bounds.minY,
    offsetX: (previewSize - contentWidth * scale) / 2,
    offsetY: (previewSize - contentHeight * scale) / 2,
    scale,
  };
}

type CanvasStickerProps = {
  sticker: OutfitSticker;
  canvasSize: CanvasSize;
  selected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<OutfitSticker>) => void;
  onDelete: () => void;
};

function CanvasSticker({
  sticker,
  canvasSize,
  selected,
  onSelect,
  onChange,
  onDelete,
}: CanvasStickerProps) {
  const pan = useRef(
    new Animated.ValueXY({ x: sticker.x, y: sticker.y })
  ).current;
  const sizeAnim = useRef(new Animated.Value(sticker.size)).current;
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStart = useRef({ x: sticker.x, y: sticker.y });
  const resizeStart = useRef(sticker.size);
  const resizePositionStart = useRef({ x: sticker.x, y: sticker.y });
  const rotateStart = useRef(sticker.rotation);
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);

  const handleFrame = useMemo(
    () => getHandleFrame(sticker.size, imageSize),
    [imageSize, sticker.size]
  );
  const deleteHandlePosition = getHandlePositionStyle(
    handleFrame.x + handleFrame.width,
    handleFrame.y,
    sticker.size
  );
  const rotateHandlePosition = getHandlePositionStyle(
    handleFrame.x,
    handleFrame.y + handleFrame.height,
    sticker.size
  );
  const resizeHandlePosition = getHandlePositionStyle(
    handleFrame.x + handleFrame.width,
    handleFrame.y + handleFrame.height,
    sticker.size
  );

  useEffect(() => {
    if (!isDragging.current) {
      pan.setValue({ x: sticker.x, y: sticker.y });
    }
  }, [pan, sticker.x, sticker.y]);

  useEffect(() => {
    if (!isResizing.current) {
      sizeAnim.setValue(sticker.size);
    }
  }, [sizeAnim, sticker.size]);

  useEffect(() => {
    let isMounted = true;

    setImageSize(null);
    Image.getSize(
      sticker.localImagePath,
      (imageWidth, imageHeight) => {
        if (isMounted && imageWidth > 0 && imageHeight > 0) {
          setImageSize({ width: imageWidth, height: imageHeight });
        }
      },
      () => {
        if (isMounted) {
          setImageSize(null);
        }
      }
    );

    return () => {
      isMounted = false;
    };
  }, [sticker.localImagePath]);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          onSelect();
          isDragging.current = true;
          dragStart.current = { x: sticker.x, y: sticker.y };
        },
        onPanResponderMove: (_, gesture) => {
          pan.setValue({
            x: clamp(
              dragStart.current.x + gesture.dx,
              0,
              Math.max(0, canvasSize.width - sticker.size)
            ),
            y: clamp(
              dragStart.current.y + gesture.dy,
              0,
              Math.max(0, canvasSize.height - sticker.size)
            ),
          });
        },
        onPanResponderRelease: (_, gesture) => {
          isDragging.current = false;
          const nextPosition = {
            x: clamp(
              dragStart.current.x + gesture.dx,
              0,
              Math.max(0, canvasSize.width - sticker.size)
            ),
            y: clamp(
              dragStart.current.y + gesture.dy,
              0,
              Math.max(0, canvasSize.height - sticker.size)
            ),
          };

          pan.setValue(nextPosition);
          onChange(nextPosition);
        },
      }),
    [
      canvasSize.height,
      canvasSize.width,
      onChange,
      onSelect,
      pan,
      sticker.size,
      sticker.x,
      sticker.y,
    ]
  );

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          onSelect();
          isResizing.current = true;
          resizeStart.current = sticker.size;
          resizePositionStart.current = { x: sticker.x, y: sticker.y };
        },
        onPanResponderMove: (_, gesture) => {
          const nextSize = clamp(
            resizeStart.current + Math.max(gesture.dx, gesture.dy),
            MIN_STICKER_SIZE,
            Math.max(
              MIN_STICKER_SIZE,
              Math.min(canvasSize.width || 240, canvasSize.height || 240)
            )
          );
          const nextPosition = clampStickerPosition(
            resizePositionStart.current.x,
            resizePositionStart.current.y,
            nextSize,
            canvasSize
          );

          sizeAnim.setValue(nextSize);
          pan.setValue(nextPosition);
        },
        onPanResponderRelease: (_, gesture) => {
          isResizing.current = false;
          const nextSize = clamp(
            resizeStart.current + Math.max(gesture.dx, gesture.dy),
            MIN_STICKER_SIZE,
            Math.max(
              MIN_STICKER_SIZE,
              Math.min(canvasSize.width || 240, canvasSize.height || 240)
            )
          );
          const nextPosition = clampStickerPosition(
            resizePositionStart.current.x,
            resizePositionStart.current.y,
            nextSize,
            canvasSize
          );

          sizeAnim.setValue(nextSize);
          pan.setValue(nextPosition);
          onChange({
            size: nextSize,
            ...nextPosition,
          });
        },
      }),
    [
      canvasSize,
      onChange,
      onSelect,
      pan,
      sizeAnim,
      sticker.size,
      sticker.x,
      sticker.y,
    ]
  );

  const rotateResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          onSelect();
          rotateStart.current = sticker.rotation;
        },
        onPanResponderMove: (_, gesture) => {
          onChange({
            rotation: rotateStart.current + gesture.dx * 0.8,
          });
        },
      }),
    [onChange, onSelect, sticker.rotation]
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.sticker,
        {
          width: sizeAnim,
          height: sizeAnim,
          zIndex: sticker.zIndex,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { rotate: `${sticker.rotation}deg` },
          ],
        },
      ]}
    >
      <View
        style={[styles.stickerTouch, selected && styles.stickerTouchSelected]}
        {...dragResponder.panHandlers}
      >
        {selected ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {SELECTED_OUTLINE_OFFSETS.map((offset) => (
              <Image
                key={`${offset.x}-${offset.y}`}
                source={{ uri: sticker.localImagePath }}
                style={[
                  styles.stickerOutlineImage,
                  {
                    transform: [
                      { scaleX: 1.02 },
                      { scaleY: 1.02 },
                      { translateX: offset.x },
                      { translateY: offset.y },
                    ],
                  },
                ]}
              />
            ))}
          </View>
        ) : null}
        <Image
          source={{ uri: sticker.localImagePath }}
          style={styles.stickerImage}
        />
      </View>

      {selected ? (
        <>
          <Pressable
            onPress={onDelete}
            style={[
              styles.handleButton,
              styles.deleteHandle,
              deleteHandlePosition,
            ]}
            accessibilityLabel="배치에서 옷 삭제"
            hitSlop={8}
          >
            <View style={[styles.handleVisual, styles.deleteHandle]}>
              <Trash2 color={COLORS.surface} size={16} strokeWidth={2.4} />
            </View>
          </Pressable>
          <View
            style={[
              styles.handleButton,
              styles.rotateHandle,
              rotateHandlePosition,
            ]}
            accessibilityLabel="옷 회전"
            {...rotateResponder.panHandlers}
          >
            <View style={[styles.handleVisual, styles.rotateHandle]}>
              <RotateCw color={COLORS.surface} size={16} strokeWidth={2.4} />
            </View>
          </View>
          <View
            style={[
              styles.handleButton,
              styles.resizeHandle,
              resizeHandlePosition,
            ]}
            accessibilityLabel="옷 크기 조절"
            {...resizeResponder.panHandlers}
          >
            <View style={[styles.handleVisual, styles.resizeHandle]}>
              <Scaling color={COLORS.surface} size={16} strokeWidth={2.4} />
            </View>
          </View>
        </>
      ) : null}
    </Animated.View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampStickerPosition(
  x: number,
  y: number,
  size: number,
  canvasSize: CanvasSize
) {
  return {
    x: clamp(x, 0, Math.max(0, canvasSize.width - size)),
    y: clamp(y, 0, Math.max(0, canvasSize.height - size)),
  };
}

function outfitMatchesSearch(
  outfit: Outfit,
  query: string,
  wardrobeItemsById: Map<number, ClothingItem>,
  colorOptions: readonly ColorOption[]
) {
  const searchableText = [
    outfit.name,
    `${outfit.stickers.length}개`,
    ...outfit.seasons,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (searchableText.includes(query)) {
    return true;
  }

  return outfit.stickers.some((sticker) => {
    const wardrobeItem = wardrobeItemsById.get(sticker.clothingItemId);

    return wardrobeItem
      ? clothingMatchesSearch(wardrobeItem, query, colorOptions)
      : false;
  });
}

function getHandleFrame(
  stickerSize: number,
  imageSize: ImageSize | null
): VisualFrame {
  const visibleFrame = getVisibleImageFrame(stickerSize, imageSize);
  const minSpan = Math.min(MIN_HANDLE_SPAN, stickerSize);
  const width = Math.min(stickerSize, Math.max(visibleFrame.width, minSpan));
  const height = Math.min(stickerSize, Math.max(visibleFrame.height, minSpan));
  const centerX = visibleFrame.x + visibleFrame.width / 2;
  const centerY = visibleFrame.y + visibleFrame.height / 2;

  return {
    x: clamp(centerX - width / 2, 0, Math.max(0, stickerSize - width)),
    y: clamp(centerY - height / 2, 0, Math.max(0, stickerSize - height)),
    width,
    height,
  };
}

function getVisibleImageFrame(
  stickerSize: number,
  imageSize: ImageSize | null
): VisualFrame {
  if (!imageSize || imageSize.width <= 0 || imageSize.height <= 0) {
    return { x: 0, y: 0, width: stickerSize, height: stickerSize };
  }

  const aspectRatio = imageSize.width / imageSize.height;

  if (aspectRatio >= 1) {
    const height = stickerSize / aspectRatio;

    return {
      x: 0,
      y: (stickerSize - height) / 2,
      width: stickerSize,
      height,
    };
  }

  const width = stickerSize * aspectRatio;

  return {
    x: (stickerSize - width) / 2,
    y: 0,
    width,
    height: stickerSize,
  };
}

function getHandlePositionStyle(
  centerX: number,
  centerY: number,
  stickerSize: number
): ViewStyle {
  const safeSize = Math.max(1, stickerSize);
  const left = `${(centerX / safeSize) * 100}%` as `${number}%`;
  const top = `${(centerY / safeSize) * 100}%` as `${number}%`;

  return {
    left,
    top,
    transform: [
      { translateX: -HANDLE_SIZE / 2 },
      { translateY: -HANDLE_SIZE / 2 },
    ],
  };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  caption: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  headerActions: {
    minWidth: 96,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
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
  headerSaveButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  headerSaveButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.surface,
  },
  headerDangerButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.danger,
  },
  headerDangerButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.surface,
  },
  screenBody: {
    flex: 1,
  },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.surface,
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.primaryLight,
  },
  mutedButton: {
    opacity: 0.45,
  },
  outfitListContent: {
    padding: 16,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  outfitGridRow: {
    gap: 8,
    marginBottom: 8,
  },
  outfitCard: {
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  outfitPreview: {
    backgroundColor: COLORS.canvasBg,
  },
  outfitPreviewImage: {
    position: "absolute",
    resizeMode: "contain",
  },
  outfitLabelRow: {
    minHeight: 56,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: "center",
  },
  outfitName: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  outfitMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  outfitSeasons: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },
  listSearchWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pickerControls: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
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
  filterContent: {
    paddingVertical: 4,
    gap: 6,
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
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 112,
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  libraryTile: {
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  libraryTileSelected: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  libraryImageFrame: {
    width: "100%",
    aspectRatio: 1,
    padding: 6,
    backgroundColor: COLORS.surface,
  },
  libraryImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  libraryText: {
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  pickBadge: {
    position: "absolute",
    right: 8,
    top: 8,
    minWidth: 32,
    minHeight: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  pickBadgeSelected: {
    backgroundColor: COLORS.accent,
  },
  selectedBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    minHeight: 76,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  selectedList: {
    alignItems: "center",
    paddingTop: 4,
    paddingRight: 4,
    gap: 8,
  },
  selectedEmptyText: {
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  selectedThumb: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  selectedThumbImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  selectedRemove: {
    position: "absolute",
    right: 2,
    top: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.danger,
  },
  arrangeButton: {
    minWidth: 64,
    minHeight: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  arrangeButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.surface,
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
  canvasActions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 8,
  },
  canvasIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  canvasMetaPanel: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  outfitNameInput: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  seasonChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  seasonChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  seasonChipSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  seasonChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  seasonChipTextSelected: {
    color: COLORS.primary,
  },
  canvas: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.canvasBg,
    overflow: "hidden",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  emptyMascot: {
    fontSize: 48,
  },
  speechBubble: {
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
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  sticker: {
    position: "absolute",
  },
  stickerTouch: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
  },
  stickerTouchSelected: {
    opacity: 1,
  },
  stickerOutlineImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    resizeMode: "contain",
    tintColor: COLORS.primaryLight,
    opacity: 0.62,
  },
  stickerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  handleButton: {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  handleVisual: {
    width: HANDLE_VISUAL_SIZE,
    height: HANDLE_VISUAL_SIZE,
    borderRadius: HANDLE_VISUAL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteHandle: {
    backgroundColor: COLORS.danger,
  },
  rotateHandle: {
    backgroundColor: COLORS.accent,
  },
  resizeHandle: {
    backgroundColor: COLORS.primary,
  },
});
