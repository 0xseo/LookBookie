import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronsDown,
  ChevronsUp,
  ChevronUp,
  CloudAlert,
  CloudCheck,
  Layers,
  Pencil,
  Plus,
  RotateCw,
  Scaling,
  Trash2,
  X
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { AppAlert } from "../components/AppDialog";
import { BrandMascotButton } from "../components/BrandMascotButton";
import { MascotEmptyState } from "../components/MascotEmptyState";
import { CollectionToolbar } from "../components/CollectionToolbar";
import { MyFitIcon } from "../components/MyFitIcon";
import { OutfitPreviewCanvas } from "../components/OutfitPreview";
import { TagInput } from "../components/TagInput";
import { WornClothes } from "../components/WornClothes";
import { useCategoryOptions } from "../hooks/useCategoryOptions";
import { useColorPaletteOptions } from "../hooks/useColorPaletteOptions";
import { useGridColumns } from "../hooks/useGridColumns";
import { compareCollection, EMPTY_FILTERS, matchesCollectionFilters, type CollectionFilters, type CollectionSort } from "../services/collectionControls";
import { clothingMatchesSearch } from "../services/colorSearch";
import { moveStickerLayer, type StickerLayerDirection } from "../services/outfitLayers";
import {
  deleteOutfitFromCloud,
  syncOutfitToCloud,
} from "../services/outfitCloud";
import {
  deleteOutfit,
  insertOutfit,
  listOutfits,
  updateOutfit,
  updateOutfitCloudState,
} from "../storage/database";
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
  isActive: boolean;
  onReturnToMyFit?: () => void;
  isLoading: boolean;
  bottomInset: number;
  requestedOutfitId: number | null;
  onOutfitSaved: () => void;
  onOpenWardrobe: () => void;
  onOpenClothingItem: (item: ClothingItem) => void;
  onRequestedOutfitOpened: () => void;
  resetSignal: number;
  onOpenFits: (outfitId: number, create?: boolean) => void;
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
const LAYER_BUTTON_OFFSET = HANDLE_SIZE + 8;
const LAYER_MENU_RADIUS = LAYER_BUTTON_OFFSET + HANDLE_SIZE / 2;
const CANVAS_CONTROL_Z_INDEX = 1000000;
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
  isActive,
  onReturnToMyFit,
  isLoading,
  bottomInset,
  requestedOutfitId,
  onOutfitSaved,
  onOpenWardrobe,
  onOpenClothingItem,
  onRequestedOutfitOpened,
  resetSignal,
  onOpenFits,
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
  const [editingOutfitTags, setEditingOutfitTags] = useState<string[]>([]);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });
  const pendingCanvasRestoreRef = useRef<{
    sourceSize: CanvasSize | null;
  } | null>(null);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [outfitQuery, setOutfitQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<CollectionSort>("createdDesc");
  const [filters, setFilters] = useState<CollectionFilters>(EMPTY_FILTERS);
  const { gridColumns, cycleGridColumns } = useGridColumns("codiBook.gridColumns");
  const [isMetadataVisible, setIsMetadataVisible] = useState(false);
  const [metadataDraft, setMetadataDraft] = useState({ name: "", seasons: [] as Season[], tags: [] as string[] });
  const [pickerCategory, setPickerCategory] = useState<CategoryFilter>("전체");
  const [pickerQuery, setPickerQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const outfitListRef = useRef<FlatList<Outfit>>(null);
  const { colorOptions } = useColorPaletteOptions();
  const { categoryOptions } = useCategoryOptions();
  const categoryFilters: CategoryFilter[] = ["전체", ...categoryOptions];

  const tileSize = useMemo(() => {
    const availableWidth =
      width - SIDE_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1);

    return Math.floor(availableWidth / GRID_COLUMNS);
  }, [width]);
  const outfitTileSize = Math.floor(
    (width - SIDE_PADDING * 2 - GRID_GAP * (gridColumns - 1)) / gridColumns
  );
  const wardrobeItemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items]
  );
  const visibleOutfits = useMemo(() => outfits.filter((outfit) => {
    const clothes = outfit.stickers.flatMap((sticker) => {
      const item = wardrobeItemsById.get(sticker.clothingItemId);
      return item ? [item] : [];
    });
    return outfitMatchesSearch(outfit, outfitQuery.trim().toLowerCase(), wardrobeItemsById, colorOptions)
      && matchesCollectionFilters(filters, outfit.seasons, clothes.map((item) => item.color));
  }).sort((a, b) => compareCollection(sortOrder, { name: a.name, date: a.createdAt, id: a.id }, { name: b.name, date: b.createdAt, id: b.id })), [outfits, outfitQuery, wardrobeItemsById, colorOptions, filters, sortOrder]);
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
      AppAlert.alert(
        "코디북을 불러오지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    }
  }, []);

  useEffect(() => {
    if (isActive) void loadSavedOutfits();
  }, [isActive, loadSavedOutfits]);

  useEffect(() => {
    setMode("list");
    setOutfitQuery("");
    setSelectedStickerId(null);
    requestAnimationFrame(() =>
      outfitListRef.current?.scrollToOffset({ offset: 0, animated: true })
    );
  }, [resetSignal]);

  useEffect(() => {
    if (pickerCategory !== "전체" && !categoryOptions.includes(pickerCategory)) {
      setPickerCategory("전체");
    }
  }, [categoryOptions, pickerCategory]);

  useEffect(() => {
    if (!isActive) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (mode === "list") {
          return false;
        }

        if (mode === "picker") setMode(stickers.length ? "canvas" : "list");
        else if (onReturnToMyFit) onReturnToMyFit();
        else setMode("list");
        return true;
      }
    );

    return () => subscription.remove();
  }, [isActive, mode, stickers.length, onReturnToMyFit]);

  const openNewPicker = () => {
    pendingCanvasRestoreRef.current = null;
    setEditingOutfitId(null);
    setEditingOutfitName("");
    setEditingOutfitSeasons([]);
    setEditingOutfitTags([]);
    setStickers([]);
    setCanvasSize({ width: 0, height: 0 });
    setSelectedStickerId(null);
    setPickerCategory("전체");
    setPickerQuery("");
    setMode("picker");
  };

  const openOutfit = useCallback((outfit: Outfit) => {
    const restoredStickers = normalizeStickerLayers(
      outfit.stickers.map((sticker, index) => {
        const wardrobeItem = wardrobeItemsById.get(sticker.clothingItemId);

        return {
          ...sticker,
          id: `outfit-${outfit.id}-${index}-${Date.now()}`,
          remoteImageUrl:
            wardrobeItem?.remoteImageUrl ?? sticker.remoteImageUrl ?? null,
          name: wardrobeItem?.name ?? sticker.name ?? "",
          brand: wardrobeItem?.brand ?? sticker.brand ?? "",
          category: wardrobeItem?.category ?? sticker.category ?? null,
        };
      })
    );

    pendingCanvasRestoreRef.current = {
      sourceSize: getValidCanvasSize(outfit.canvasWidth, outfit.canvasHeight),
    };

    setEditingOutfitId(outfit.id);
    setEditingOutfitName(outfit.name);
    setEditingOutfitSeasons(outfit.seasons);
    setEditingOutfitTags(outfit.tags);
    setStickers(restoredStickers);
    setCanvasSize({ width: 0, height: 0 });
    setSelectedStickerId(null);
    setMode("canvas");
  }, [wardrobeItemsById]);

  const handleCanvasLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextCanvasSize = getValidCanvasSize(
        event.nativeEvent.layout.width,
        event.nativeEvent.layout.height
      );

      if (!nextCanvasSize) {
        return;
      }

      const pendingRestore = pendingCanvasRestoreRef.current;

      if (pendingRestore) {
        pendingCanvasRestoreRef.current = null;
        setCanvasSize(nextCanvasSize);
        setStickers((current) => {
          const savedBounds = getStickerBounds(current);
          const canUseSavedCanvas =
            pendingRestore.sourceSize &&
            (!savedBounds ||
              stickerBoundsFitCanvas(savedBounds, pendingRestore.sourceSize));

          return canUseSavedCanvas && pendingRestore.sourceSize
            ? remapStickersBetweenCanvases(
              current,
              pendingRestore.sourceSize,
              nextCanvasSize
            )
            : fitStickersWithinCanvas(current, nextCanvasSize);
        });
        return;
      }

      if (!isValidCanvasSize(canvasSize)) {
        setCanvasSize(nextCanvasSize);
        setStickers((current) =>
          constrainStickersToCanvas(current, nextCanvasSize)
        );
        return;
      }

      if (
        Keyboard.isVisible() ||
        areCanvasSizesEqual(canvasSize, nextCanvasSize)
      ) {
        return;
      }

      setStickers((current) =>
        remapStickersBetweenCanvases(current, canvasSize, nextCanvasSize)
      );
      setCanvasSize(nextCanvasSize);
    },
    [canvasSize]
  );

  useEffect(() => {
    if (!requestedOutfitId || outfits.length === 0) {
      return;
    }

    const requestedOutfit = outfits.find((outfit) => outfit.id === requestedOutfitId);

    if (requestedOutfit) {
      if (editingOutfitId === requestedOutfitId && mode === "canvas") { onRequestedOutfitOpened(); return; }
      openOutfit(requestedOutfit);
    }

    onRequestedOutfitOpened();
  }, [editingOutfitId, mode, onRequestedOutfitOpened, openOutfit, outfits, requestedOutfitId]);

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
      remoteImageUrl: item.remoteImageUrl,
      name: item.name,
      brand: item.brand,
      category: item.category,
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

  const changeStickerLayer = (id: string, direction: StickerLayerDirection) => {
    setStickers((current) => moveStickerLayer(normalizeStickerLayers(current), id, direction));
  };

  const saveOutfit = async () => {
    if (stickers.length === 0) {
      AppAlert.alert("저장할 코디가 없어북", "옷을 먼저 선택해 주세요.");
      return;
    }

    setIsSaving(true);

    try {
      const outfitName = editingOutfitName || `코디 ${outfits.length + 1}`;
      const existingOutfit = editingOutfitId
        ? outfits.find((outfit) => outfit.id === editingOutfitId) ?? null
        : null;
      const savedCanvasSize = isValidCanvasSize(canvasSize)
        ? canvasSize
        : null;
      const persistedStickers = normalizeStickerLayers(
        savedCanvasSize
          ? constrainStickersToCanvas(stickers, savedCanvasSize)
          : stickers
      );
      const canvasWidth = savedCanvasSize?.width ?? null;
      const canvasHeight = savedCanvasSize?.height ?? null;
      let localOutfitId: number;

      setStickers(persistedStickers);

      if (existingOutfit) {
        await updateOutfit({
          ...existingOutfit,
          name: outfitName,
          seasons: editingOutfitSeasons,
          tags: editingOutfitTags,
          stickers: persistedStickers,
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
          tags: editingOutfitTags,
          stickers: persistedStickers,
          canvasWidth,
          canvasHeight,
        });
      }

      const cloudResult = await syncOutfitToCloud({
        remoteRecordId: existingOutfit?.remoteRecordId ?? null,
        name: outfitName,
        seasons: editingOutfitSeasons,
        tags: editingOutfitTags,
        stickers: persistedStickers,
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
      AppAlert.alert(
        "저장했어북",
        cloudResult.cloudSyncStatus === "synced"
          ? "코디북에 저장하고 친구가 볼 수 있게 클라우드에도 올렸어요."
          : "코디북에 로컬 저장했어요. 클라우드는 로그인 후 다시 저장하면 공유돼요."
      );
    } catch (error) {
      AppAlert.alert(
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

    AppAlert.alert("코디를 삭제할까북?", "저장된 코디북 목록에서 사라져요.", [
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
            AppAlert.alert(
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
            {mode === 'canvas' ? <Pressable onPress={() => onReturnToMyFit ? onReturnToMyFit() : setMode('list')} hitSlop={8} accessibilityLabel="뒤로가기" style={styles.backButton}><ChevronLeft color={COLORS.primary} size={24} /></Pressable> : null}
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>룩부기 코디북</Text>
              <Text style={styles.caption}>저장한 코디를 보고 수정해요</Text>
            </View>
            <View style={styles.headerActions}>
              {mode === "list" ? (
                <BrandMascotButton screen="codibook" onPress={() => void refreshCodiBook()} label="코디북 새로고침" />
              ) : null}
              {mode === "picker" ? (
                <Pressable
                  onPress={() => setMode(stickers.length ? "canvas" : "list")}
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
              <CollectionToolbar query={outfitQuery} onQueryChange={setOutfitQuery} placeholder="코디 이름, 계절, 태그, 옷 검색" sort={sortOrder} onSortChange={setSortOrder} filters={filters} onFiltersChange={setFilters} title="코디북" bottomInset={bottomInset} isActive={isActive} gridColumns={gridColumns} onCycleGridColumns={cycleGridColumns} />
              <OutfitList
                listRef={outfitListRef}
                outfits={visibleOutfits}
                tileSize={outfitTileSize}
                gridColumns={gridColumns}
                bottomInset={bottomInset}
                refreshing={isRefreshing}
                emptyText={
                  outfitQuery.trim() || filters.seasons.length || filters.colors.length
                    ? "검색 결과가 없어북"
                    : undefined
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
                <MascotEmptyState screen="codibook" message={"코디할 옷부터 찾아볼까북?\n옷장에 첫 옷을 등록해봐북"}>
                  <Pressable
                    onPress={onOpenWardrobe}
                    style={styles.primaryButton}
                    hitSlop={8}
                  >
                    <Text style={styles.primaryButtonText}>옷장으로</Text>
                  </Pressable>
                </MascotEmptyState>
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
              <Pressable style={styles.metadataSummary} onPress={() => { setMetadataDraft({ name: editingOutfitName, seasons: editingOutfitSeasons, tags: editingOutfitTags }); setIsMetadataVisible(true); }} accessibilityLabel="코디 이름, 태그, 계절 수정">
                <View style={{ flex: 1 }}><Text style={styles.metadataName} numberOfLines={1}>{editingOutfitName || '코디 이름 입력'}</Text><Text style={styles.caption} numberOfLines={1}>{[...editingOutfitSeasons, ...editingOutfitTags.map((tag) => `#${tag}`)].join(' · ') || '이름 · 태그 · 계절'}</Text></View>
                <Pencil color={COLORS.primary} size={18} />
              </Pressable>
              {editingOutfitId ? (
                <View style={styles.canvasActions}>
                  <Pressable onPress={() => onOpenFits(editingOutfitId, true)} style={[styles.labeledAction, styles.fitAction]} hitSlop={8}><MyFitIcon color={COLORS.primary} size={20} /><Text style={[styles.actionText, { color: COLORS.primary }]}>마이핏 올리기</Text></Pressable>
                </View>
              ) : null}

              <View
                style={styles.canvas}
                onLayout={handleCanvasLayout}
              >
                {stickers.length > 0 ? (
                  <Pressable
                    onPress={() => setSelectedStickerId(null)}
                    style={StyleSheet.absoluteFill}
                    hitSlop={8}
                  />
                ) : null}

                {stickers.length === 0 ? (
                  <MascotEmptyState screen="codibook" message={"어떤 옷끼리 어울릴까북?\n오른쪽 아래 +를 눌러 조합해봐북"} />
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
                    onLayerChange={(direction) => changeStickerLayer(sticker.id, direction)}
                  />
                ))}
                <Pressable
                  onPress={() => setMode("picker")}
                  style={styles.canvasAddButton}
                  accessibilityLabel="옷 추가하기"
                  hitSlop={8}
                >
                  <Plus color={COLORS.surface} size={28} strokeWidth={2.6} />
                </Pressable>
              </View>
              <View style={{ paddingHorizontal: 16 }}><WornClothes clothes={stickers.map((sticker) => {
                const item = wardrobeItemsById.get(sticker.clothingItemId);
                return { key: sticker.id, imageUri: item?.localImagePath || sticker.localImagePath, name: item?.name || sticker.name, brand: item?.brand || sticker.brand, deleted: !item, onPress: item ? () => onOpenClothingItem(item) : undefined };
              })} /></View>
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
      <Modal visible={isActive && isMetadataVisible} transparent animationType="fade" onRequestClose={() => setIsMetadataVisible(false)}>
        <KeyboardAvoidingView style={styles.metadataOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsMetadataVisible(false)} />
          <View style={styles.metadataModal}>
            <Text style={styles.metadataName}>코디 정보</Text>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 16 }}>
              <TextInput value={metadataDraft.name} onChangeText={(name) => setMetadataDraft({ ...metadataDraft, name })} placeholder="코디 이름" placeholderTextColor={COLORS.textSecondary} style={styles.outfitNameInput} maxLength={100} />
              <Text style={styles.caption}>계절</Text>
              <View style={styles.seasonChipRow}>{SEASONS.map((season) => <Pressable key={season} style={[styles.seasonChip, metadataDraft.seasons.includes(season) && styles.seasonChipSelected]} onPress={() => setMetadataDraft({ ...metadataDraft, seasons: metadataDraft.seasons.includes(season) ? metadataDraft.seasons.filter((value) => value !== season) : [...metadataDraft.seasons, season] })}><Text style={styles.seasonChipText}>{season}</Text></Pressable>)}</View>
              <TagInput tags={metadataDraft.tags} onChange={(tags) => setMetadataDraft({ ...metadataDraft, tags })} placeholder="코디 태그 입력" />
            </ScrollView>
            <View style={styles.canvasActions}><Pressable style={styles.secondaryButton} onPress={() => setIsMetadataVisible(false)}><Text style={styles.secondaryButtonText}>취소</Text></Pressable><Pressable style={styles.headerSaveButton} onPress={() => { setEditingOutfitName(metadataDraft.name.trim()); setEditingOutfitSeasons(metadataDraft.seasons); setEditingOutfitTags(metadataDraft.tags); setIsMetadataVisible(false); }}><Text style={styles.headerSaveButtonText}>적용</Text></Pressable></View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

type OutfitListProps = {
  listRef: RefObject<FlatList<Outfit> | null>;
  outfits: Outfit[];
  tileSize: number;
  gridColumns: number;
  bottomInset: number;
  refreshing: boolean;
  emptyText?: string;
  onSelect: (outfit: Outfit) => void;
  onRefresh: () => void | Promise<void>;
};

function OutfitList({
  listRef,
  outfits,
  tileSize,
  gridColumns,
  bottomInset,
  refreshing,
  emptyText,
  onSelect,
  onRefresh,
}: OutfitListProps) {
  return (
    <FlatList
      key={`outfits-${gridColumns}`}
      ref={listRef}
      data={outfits}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyExtractor={(outfit) => String(outfit.id)}
      numColumns={gridColumns}
      columnWrapperStyle={gridColumns > 1 ? styles.outfitGridRow : undefined}
      contentContainerStyle={[
        styles.outfitListContent,
        { paddingBottom: bottomInset + 24 },
        outfits.length === 0 && styles.emptyListContent,
      ]}
      ListEmptyComponent={
        <MascotEmptyState screen="codibook" message={emptyText} />
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onSelect(item)}
          style={[styles.outfitCard, { width: tileSize, marginBottom: gridColumns === 1 ? GRID_GAP : 0 }]}
          hitSlop={8}
        >
          <OutfitPreviewCanvas
            stickers={item.stickers}
            canvasWidth={item.canvasWidth}
            canvasHeight={item.canvasHeight}
            previewSize={tileSize}
          />
          <OutfitSyncStatusBadge status={item.cloudSyncStatus} />
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
            {item.tags.length > 0 ? (
              <Text style={styles.outfitTags} numberOfLines={1}>
                {item.tags.map((tag) => `#${tag}`).join(" ")}
              </Text>
            ) : null}
          </View>
        </Pressable>
      )}
    />
  );
}

function OutfitSyncStatusBadge({ status }: { status: Outfit["cloudSyncStatus"]; }) {
  const isSynced = status === "synced";
  const Icon = isSynced ? CloudCheck : CloudAlert;

  return (
    <View
      style={[
        styles.outfitSyncBadge,
        status === "synced"
          ? styles.outfitSyncSynced
          : status === "failed"
            ? styles.outfitSyncFailed
            : status === "pending"
              ? styles.outfitSyncPending
              : styles.outfitSyncLocal,
      ]}
      accessibilityLabel={isSynced ? "클라우드 동기화 완료" : "클라우드 동기화 필요"}
    >
      <Icon color={COLORS.surface} size={17} strokeWidth={2.6} />
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

function getValidCanvasSize(
  width: number | null | undefined,
  height: number | null | undefined
): CanvasSize | null {
  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return { width, height };
}

function isValidCanvasSize(size: CanvasSize | null): size is CanvasSize {
  return Boolean(getValidCanvasSize(size?.width, size?.height));
}

function areCanvasSizesEqual(first: CanvasSize, second: CanvasSize) {
  return (
    Math.abs(first.width - second.width) < 0.5 &&
    Math.abs(first.height - second.height) < 0.5
  );
}

function normalizeStickerLayers(stickers: OutfitSticker[]) {
  return stickers
    .map((sticker, index) => ({
      sticker,
      index,
      layer: Number.isFinite(sticker.zIndex) ? sticker.zIndex : index + 1,
    }))
    .sort((first, second) =>
      first.layer === second.layer
        ? first.index - second.index
        : first.layer - second.layer
    )
    .map(({ sticker }, index) => ({ ...sticker, zIndex: index + 1 }));
}

function constrainStickersToCanvas(
  stickers: OutfitSticker[],
  canvas: CanvasSize
) {
  const maxSize = Math.max(1, Math.min(canvas.width, canvas.height));
  const minSize = Math.min(MIN_STICKER_SIZE, maxSize);

  return stickers.map((sticker) => {
    const size = clamp(
      Number.isFinite(sticker.size) ? sticker.size : DEFAULT_STICKER_SIZE,
      minSize,
      maxSize
    );
    const x = Number.isFinite(sticker.x) ? sticker.x : 0;
    const y = Number.isFinite(sticker.y) ? sticker.y : 0;

    return {
      ...sticker,
      x: clamp(x, 0, Math.max(0, canvas.width - size)),
      y: clamp(y, 0, Math.max(0, canvas.height - size)),
      size,
      rotation: Number.isFinite(sticker.rotation) ? sticker.rotation : 0,
    };
  });
}

function remapStickersBetweenCanvases(
  stickers: OutfitSticker[],
  source: CanvasSize,
  target: CanvasSize
) {
  const scale = Math.min(
    target.width / source.width,
    target.height / source.height
  );
  const offsetX = (target.width - source.width * scale) / 2;
  const offsetY = (target.height - source.height * scale) / 2;
  const remapped = stickers.map((sticker) => ({
    ...sticker,
    x: offsetX + (Number.isFinite(sticker.x) ? sticker.x : 0) * scale,
    y: offsetY + (Number.isFinite(sticker.y) ? sticker.y : 0) * scale,
    size:
      (Number.isFinite(sticker.size) ? sticker.size : DEFAULT_STICKER_SIZE) *
      scale,
  }));

  return constrainStickersToCanvas(remapped, target);
}

function fitStickersWithinCanvas(
  stickers: OutfitSticker[],
  target: CanvasSize
) {
  const bounds = getStickerBounds(stickers);

  if (!bounds) {
    return [];
  }

  const inset = Math.min(16, target.width / 10, target.height / 10);
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const scale = Math.min(
    1,
    Math.max(0.01, (target.width - inset * 2) / contentWidth),
    Math.max(0.01, (target.height - inset * 2) / contentHeight)
  );
  const offsetX = (target.width - contentWidth * scale) / 2;
  const offsetY = (target.height - contentHeight * scale) / 2;
  const fitted = stickers.map((sticker) => ({
    ...sticker,
    x: offsetX + (sticker.x - bounds.minX) * scale,
    y: offsetY + (sticker.y - bounds.minY) * scale,
    size: sticker.size * scale,
  }));

  return constrainStickersToCanvas(fitted, target);
}

type StickerBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

function getStickerBounds(stickers: OutfitSticker[]): StickerBounds | null {
  const validStickers = stickers.filter(
    (sticker) =>
      Number.isFinite(sticker.x) &&
      Number.isFinite(sticker.y) &&
      Number.isFinite(sticker.size) &&
      sticker.size > 0
  );

  if (validStickers.length === 0) {
    return null;
  }

  return validStickers.reduce<StickerBounds>(
    (current, sticker) => ({
      minX: Math.min(current.minX, sticker.x),
      minY: Math.min(current.minY, sticker.y),
      maxX: Math.max(current.maxX, sticker.x + sticker.size),
      maxY: Math.max(current.maxY, sticker.y + sticker.size),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  );
}

function stickerBoundsFitCanvas(bounds: StickerBounds, canvas: CanvasSize) {
  const tolerance = 1;

  return (
    bounds.minX >= -tolerance &&
    bounds.minY >= -tolerance &&
    bounds.maxX <= canvas.width + tolerance &&
    bounds.maxY <= canvas.height + tolerance
  );
}

type CanvasStickerProps = {
  sticker: OutfitSticker;
  canvasSize: CanvasSize;
  selected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<OutfitSticker>) => void;
  onDelete: () => void;
  onLayerChange: (direction: StickerLayerDirection) => void;
};

function CanvasSticker({
  sticker,
  canvasSize,
  selected,
  onSelect,
  onChange,
  onDelete,
  onLayerChange,
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
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);

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
  const layerMenuPosition = getLayerMenuPosition(sticker, handleFrame, canvasSize);
  const stickerPositionStyle: Animated.WithAnimatedValue<ViewStyle> = {
    width: sizeAnim,
    height: sizeAnim,
    transform: [
      { translateX: pan.x },
      { translateY: pan.y },
      { rotate: `${sticker.rotation}deg` },
    ],
  };

  useEffect(() => {
    if (!selected) setIsLayerMenuOpen(false);
  }, [selected]);

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
          setIsLayerMenuOpen(false);
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
          setIsLayerMenuOpen(false);
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
          setIsLayerMenuOpen(false);
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
    <>
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.sticker,
        stickerPositionStyle,
        { zIndex: sticker.zIndex },
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
    </Animated.View>
      {selected ? (
        <Animated.View pointerEvents="box-none" style={[styles.sticker, stickerPositionStyle, { zIndex: CANVAS_CONTROL_Z_INDEX }]}>
          {!isLayerMenuOpen ? (
            <Pressable onPress={() => setIsLayerMenuOpen(true)} style={[styles.handleButton, getHandlePositionStyle(handleFrame.x, handleFrame.y, sticker.size)]} hitSlop={8} accessibilityLabel="옷 레이어 순서 버튼 펼치기" accessibilityState={{ expanded: false }}>
              <View style={[styles.handleVisual, styles.layerHandle]}><Layers color={COLORS.surface} size={16} /></View>
            </Pressable>
          ) : null}
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
        </Animated.View>
      ) : null}
      {selected && isLayerMenuOpen ? (
        <View pointerEvents="box-none" style={[styles.layerMenu, { left: layerMenuPosition.x - LAYER_MENU_RADIUS, top: layerMenuPosition.y - LAYER_MENU_RADIUS }]}>
          <Pressable style={[styles.handleButton, styles.layerMenuCenter]} onPress={() => setIsLayerMenuOpen(false)} accessibilityLabel="옷 레이어 순서 버튼 접기" accessibilityState={{ expanded: true }}>
            <View style={[styles.handleVisual, styles.layerHandle]}><Layers color={COLORS.surface} size={16} /></View>
          </Pressable>
          <Pressable style={[styles.handleButton, styles.layerMenuTop]} onPress={() => onLayerChange("front")} accessibilityLabel="옷을 맨 앞으로">
            <View style={styles.layerActionVisual}><ChevronsUp color={COLORS.primary} size={20} /></View>
          </Pressable>
          <Pressable style={[styles.handleButton, styles.layerMenuRight]} onPress={() => onLayerChange("forward")} accessibilityLabel="옷을 한 칸 앞으로">
            <View style={styles.layerActionVisual}><ChevronUp color={COLORS.primary} size={20} /></View>
          </Pressable>
          <Pressable style={[styles.handleButton, styles.layerMenuLeft]} onPress={() => onLayerChange("backward")} accessibilityLabel="옷을 한 칸 뒤로">
            <View style={styles.layerActionVisual}><ChevronDown color={COLORS.primary} size={20} /></View>
          </Pressable>
          <Pressable style={[styles.handleButton, styles.layerMenuBottom]} onPress={() => onLayerChange("back")} accessibilityLabel="옷을 맨 뒤로">
            <View style={styles.layerActionVisual}><ChevronsDown color={COLORS.primary} size={20} /></View>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

function getLayerMenuPosition(sticker: OutfitSticker, frame: VisualFrame, canvas: CanvasSize) {
  const center = sticker.size / 2;
  const radians = sticker.rotation * Math.PI / 180;
  const offsetX = frame.x - center;
  const offsetY = frame.y - center;
  const x = sticker.x + center + offsetX * Math.cos(radians) - offsetY * Math.sin(radians);
  const y = sticker.y + center + offsetX * Math.sin(radians) + offsetY * Math.cos(radians);
  const marginX = Math.min(LAYER_MENU_RADIUS + 8, canvas.width / 2);
  const marginY = Math.min(LAYER_MENU_RADIUS + 8, canvas.height / 2);
  return {
    x: clamp(x, marginX, canvas.width - marginX),
    y: clamp(y, marginY, canvas.height - marginY),
  };
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
    ...outfit.tags,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (searchableText.includes(query)) {
    return true;
  }

  return outfit.stickers.some((sticker) => {
    const wardrobeItem = wardrobeItemsById.get(sticker.clothingItemId);

    if (wardrobeItem) {
      return clothingMatchesSearch(wardrobeItem, query, colorOptions);
    }

    return [sticker.name, sticker.brand, sticker.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
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
  backButton: { width: 32, height: 44, justifyContent: 'center' },
  metadataSummary: { marginHorizontal: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: 'row', alignItems: 'center', gap: 8 },
  metadataName: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  labeledAction: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: COLORS.primary, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fitAction: { backgroundColor: COLORS.secondary, borderColor: COLORS.primaryLight, borderWidth: 1 }, actionText: { fontSize: 13, fontWeight: '600', color: COLORS.surface },
  metadataOverlay: { flex: 1, padding: 24, backgroundColor: COLORS.overlay, justifyContent: 'center' },
  metadataModal: { padding: 16, gap: 16, borderRadius: 16, maxHeight: '85%', backgroundColor: COLORS.surface },
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
    justifyContent: "center",
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
  outfitTags: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  outfitSyncBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  outfitSyncSynced: { backgroundColor: COLORS.primary },
  outfitSyncFailed: { backgroundColor: COLORS.danger },
  outfitSyncPending: { backgroundColor: COLORS.accent },
  outfitSyncLocal: { backgroundColor: COLORS.textSecondary },
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
    elevation: 5,
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  canvasActions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
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
  canvas: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.canvasBg,
    overflow: "hidden",
  },
  canvasAddButton: {
    position: "absolute",
    right: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: CANVAS_CONTROL_Z_INDEX + 2,
  },
  layerMenu: {
    position: "absolute",
    width: LAYER_MENU_RADIUS * 2,
    height: LAYER_MENU_RADIUS * 2,
    zIndex: CANVAS_CONTROL_Z_INDEX + 3,
  },
  layerMenuCenter: { left: LAYER_BUTTON_OFFSET, top: LAYER_BUTTON_OFFSET },
  layerMenuTop: { left: LAYER_BUTTON_OFFSET, top: 0 },
  layerMenuRight: { left: LAYER_BUTTON_OFFSET * 2, top: LAYER_BUTTON_OFFSET },
  layerMenuLeft: { left: 0, top: LAYER_BUTTON_OFFSET },
  layerMenuBottom: { left: LAYER_BUTTON_OFFSET, top: LAYER_BUTTON_OFFSET * 2 },
  layerHandle: { backgroundColor: COLORS.primary },
  layerActionVisual: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.secondary,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    alignItems: "center",
    justifyContent: "center",
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
