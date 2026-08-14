import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  PanResponder,
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
import { syncOutfitToCloud } from '../services/outfitCloud';
import { deleteOutfit, insertOutfit, listOutfits, updateOutfit } from '../storage/database';
import {
  CATEGORY_FILTERS,
  type CategoryFilter,
  type ClothingItem,
} from '../types/clothing';
import type { Outfit, OutfitSticker } from '../types/outfit';

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

type CodiMode = 'list' | 'picker' | 'canvas';

const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const SIDE_PADDING = 16;
const MIN_STICKER_SIZE = 72;
const DEFAULT_STICKER_SIZE = 140;

export function CodiBookScreen({
  items,
  isLoading,
  bottomInset,
  onOutfitSaved,
  onOpenWardrobe,
}: CodiBookScreenProps) {
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<CodiMode>('list');
  const [stickers, setStickers] = useState<OutfitSticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [editingOutfitId, setEditingOutfitId] = useState<number | null>(null);
  const [editingOutfitName, setEditingOutfitName] = useState('');
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [pickerCategory, setPickerCategory] = useState<CategoryFilter>('전체');
  const [pickerQuery, setPickerQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const tileSize = useMemo(() => {
    const availableWidth = width - SIDE_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1);

    return Math.floor(availableWidth / GRID_COLUMNS);
  }, [width]);
  const selectedSticker = useMemo(
    () => stickers.find((sticker) => sticker.id === selectedStickerId),
    [selectedStickerId, stickers],
  );
  const pickerItems = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();

    return items.filter((item) => {
      const categoryMatches = pickerCategory === '전체' || item.category === pickerCategory;
      const queryMatches =
        !query ||
        [item.name, item.brand, item.category, item.color, ...item.seasons]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return categoryMatches && queryMatches;
    });
  }, [items, pickerCategory, pickerQuery]);

  const loadSavedOutfits = useCallback(async () => {
    try {
      setOutfits(await listOutfits());
    } catch (error) {
      Alert.alert(
        '코디북을 불러오지 못했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    }
  }, []);

  useEffect(() => {
    loadSavedOutfits();
  }, [loadSavedOutfits]);

  const openNewPicker = () => {
    setEditingOutfitId(null);
    setEditingOutfitName('');
    setStickers([]);
    setSelectedStickerId(null);
    setPickerCategory('전체');
    setPickerQuery('');
    setMode('picker');
  };

  const openOutfit = (outfit: Outfit) => {
    const restoredStickers = outfit.stickers.map((sticker, index) => ({
      ...sticker,
      id: `outfit-${outfit.id}-${index}-${Date.now()}`,
      zIndex: index + 1,
    }));

    setEditingOutfitId(outfit.id);
    setEditingOutfitName(outfit.name);
    setStickers(restoredStickers);
    setSelectedStickerId(restoredStickers[restoredStickers.length - 1]?.id ?? null);
    setMode('canvas');
  };

  const toggleStickerFromItem = (item: ClothingItem) => {
    const existingSticker = stickers.find((sticker) => sticker.clothingItemId === item.id);

    if (existingSticker) {
      deleteSticker(existingSticker.id);
      return;
    }

    const size = Math.min(
      DEFAULT_STICKER_SIZE,
      Math.max(MIN_STICKER_SIZE, (canvasSize.width || width) * 0.36),
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
      current.map((sticker) => (sticker.id === id ? { ...sticker, ...updates } : sticker)),
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

    const topZIndex = stickers.reduce((top, sticker) => Math.max(top, sticker.zIndex), 0);
    updateSticker(selectedSticker.id, { zIndex: topZIndex + 1 });
  };

  const saveOutfit = async () => {
    if (stickers.length === 0) {
      Alert.alert('저장할 코디가 없어북', '옷을 먼저 선택해 주세요.');
      return;
    }

    setIsSaving(true);

    try {
      const outfitName = editingOutfitName || `코디 ${outfits.length + 1}`;

      if (editingOutfitId) {
        await updateOutfit({
          id: editingOutfitId,
          name: outfitName,
          stickers,
          createdAt: new Date().toISOString(),
        });
      } else {
        await insertOutfit({
          name: outfitName,
          stickers,
        });
      }

      const cloudResult = await syncOutfitToCloud({
        name: outfitName,
        stickers,
        wardrobeItems: items,
      });

      await loadSavedOutfits();
      await onOutfitSaved();
      setMode('list');
      Alert.alert(
        '저장했어북',
        cloudResult.synced
          ? '코디북에 저장하고 친구가 볼 수 있게 클라우드에도 올렸어요.'
          : '코디북에 로컬 저장했어요. 클라우드는 로그인 후 다시 저장하면 공유돼요.',
      );
    } catch (error) {
      Alert.alert(
        '코디 저장에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteOutfit = () => {
    if (!editingOutfitId) {
      return;
    }

    Alert.alert('코디를 삭제할까북?', '저장된 코디북 목록에서 사라져요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await deleteOutfit(editingOutfitId);
          await loadSavedOutfits();
          await onOutfitSaved();
          setMode('list');
          setEditingOutfitId(null);
          setStickers([]);
          setSelectedStickerId(null);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingBottom: bottomInset + 8 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>코디북</Text>
            <Text style={styles.caption}>저장한 코디를 보고 수정해요</Text>
          </View>
          {mode === 'list' ? (
            <Pressable onPress={openNewPicker} style={styles.primarySquareButton} hitSlop={8}>
              <Text style={styles.primarySquareButtonText}>+</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setMode('list')} style={styles.secondaryButton} hitSlop={8}>
              <Text style={styles.secondaryButtonText}>목록</Text>
            </Pressable>
          )}
        </View>

        {mode === 'list' ? (
          <OutfitList
            outfits={outfits}
            bottomInset={bottomInset}
            onSelect={openOutfit}
            onAdd={openNewPicker}
          />
        ) : null}

        {mode === 'picker' ? (
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
                {CATEGORY_FILTERS.map((category) => {
                  const selected = pickerCategory === category;

                  return (
                    <Pressable
                      key={category}
                      onPress={() => setPickerCategory(category)}
                      style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                      hitSlop={8}
                    >
                      <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
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
                <Pressable onPress={onOpenWardrobe} style={styles.primaryButton} hitSlop={8}>
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
                  const selected = stickers.some((sticker) => sticker.clothingItemId === item.id);

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
                        <Image source={{ uri: item.localImagePath }} style={styles.libraryImage} />
                      </View>
                      <Text style={styles.libraryText} numberOfLines={1}>
                        {item.brand || item.name || item.category}
                      </Text>
                      <View style={[styles.pickBadge, selected && styles.pickBadgeSelected]}>
                        <Text style={styles.pickBadgeText}>{selected ? '✓' : '+'}</Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}

            <SelectedBar
              stickers={stickers}
              onRemove={deleteSticker}
              onArrange={() => setMode('canvas')}
            />
          </View>
        ) : null}

        {mode === 'canvas' ? (
          <View style={styles.screenBody}>
            <View style={styles.canvasActions}>
              <Pressable onPress={() => setMode('picker')} style={styles.secondaryButton} hitSlop={8}>
                <Text style={styles.secondaryButtonText}>옷 추가</Text>
              </Pressable>
              <Pressable
                onPress={bringSelectedForward}
                disabled={!selectedSticker}
                style={[styles.secondaryButton, !selectedSticker && styles.mutedButton]}
                hitSlop={8}
              >
                <Text style={styles.secondaryButtonText}>앞으로</Text>
              </Pressable>
              {editingOutfitId ? (
                <Pressable onPress={confirmDeleteOutfit} style={styles.dangerButton} hitSlop={8}>
                  <Text style={styles.dangerButtonText}>삭제</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={saveOutfit}
                disabled={isSaving}
                style={[styles.primaryButton, isSaving && styles.disabledButton]}
                hitSlop={8}
              >
                {isSaving ? (
                  <ActivityIndicator color={COLORS.surface} />
                ) : (
                  <Text style={styles.primaryButtonText}>저장</Text>
                )}
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
                    <Text style={styles.emptyText}>옷 추가에서 코디할 옷을 가져와봐북</Text>
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
      </View>
    </SafeAreaView>
  );
}

type OutfitListProps = {
  outfits: Outfit[];
  bottomInset: number;
  onSelect: (outfit: Outfit) => void;
  onAdd: () => void;
};

function OutfitList({ outfits, bottomInset, onSelect, onAdd }: OutfitListProps) {
  if (outfits.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyMascot}>🐢</Text>
        <View style={styles.speechBubble}>
          <Text style={styles.emptyText}>아직 저장된 코디가 없어북</Text>
        </View>
        <Pressable onPress={onAdd} style={styles.primaryButton} hitSlop={8}>
          <Text style={styles.primaryButtonText}>코디 추가</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={outfits}
      keyExtractor={(outfit) => String(outfit.id)}
      contentContainerStyle={[styles.outfitListContent, { paddingBottom: bottomInset + 24 }]}
      renderItem={({ item }) => (
        <Pressable onPress={() => onSelect(item)} style={styles.outfitCard} hitSlop={8}>
          <View style={styles.outfitPreview}>
            {item.stickers.slice(0, 6).map((sticker, index) => (
              <Image
                key={`${item.id}-${sticker.clothingItemId}-${index}`}
                source={{ uri: sticker.localImagePath }}
                style={[
                  styles.outfitPreviewImage,
                  {
                    left: 16 + index * 28,
                    top: 18 + index * 10,
                    transform: [{ rotate: `${sticker.rotation * 0.2}deg` }],
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.outfitLabelRow}>
            <Text style={styles.outfitName}>{item.name}</Text>
            <Text style={styles.outfitMeta}>{item.stickers.length}개</Text>
          </View>
        </Pressable>
      )}
    />
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
              hitSlop={8}
            >
              <Image source={{ uri: sticker.localImagePath }} style={styles.selectedThumbImage} />
              <Text style={styles.selectedRemove}>×</Text>
            </Pressable>
          ))
        )}
      </ScrollView>
      <Pressable
        onPress={onArrange}
        disabled={stickers.length === 0}
        style={[styles.arrangeButton, stickers.length === 0 && styles.mutedButton]}
        hitSlop={8}
      >
        <Text style={styles.arrangeButtonText}>배치</Text>
      </Pressable>
    </View>
  );
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
  const pan = useRef(new Animated.ValueXY({ x: sticker.x, y: sticker.y })).current;
  const sizeAnim = useRef(new Animated.Value(sticker.size)).current;
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStart = useRef({ x: sticker.x, y: sticker.y });
  const resizeStart = useRef(sticker.size);
  const resizePositionStart = useRef({ x: sticker.x, y: sticker.y });
  const rotateStart = useRef(sticker.rotation);

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
            x: clamp(dragStart.current.x + gesture.dx, 0, Math.max(0, canvasSize.width - sticker.size)),
            y: clamp(dragStart.current.y + gesture.dy, 0, Math.max(0, canvasSize.height - sticker.size)),
          });
        },
        onPanResponderRelease: (_, gesture) => {
          isDragging.current = false;
          const nextPosition = {
            x: clamp(dragStart.current.x + gesture.dx, 0, Math.max(0, canvasSize.width - sticker.size)),
            y: clamp(dragStart.current.y + gesture.dy, 0, Math.max(0, canvasSize.height - sticker.size)),
          };

          pan.setValue(nextPosition);
          onChange(nextPosition);
        },
      }),
    [canvasSize.height, canvasSize.width, onChange, onSelect, pan, sticker.size, sticker.x, sticker.y],
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
            Math.max(MIN_STICKER_SIZE, Math.min(canvasSize.width || 240, canvasSize.height || 240)),
          );
          const nextPosition = clampStickerPosition(
            resizePositionStart.current.x,
            resizePositionStart.current.y,
            nextSize,
            canvasSize,
          );

          sizeAnim.setValue(nextSize);
          pan.setValue(nextPosition);
        },
        onPanResponderRelease: (_, gesture) => {
          isResizing.current = false;
          const nextSize = clamp(
            resizeStart.current + Math.max(gesture.dx, gesture.dy),
            MIN_STICKER_SIZE,
            Math.max(MIN_STICKER_SIZE, Math.min(canvasSize.width || 240, canvasSize.height || 240)),
          );
          const nextPosition = clampStickerPosition(
            resizePositionStart.current.x,
            resizePositionStart.current.y,
            nextSize,
            canvasSize,
          );

          sizeAnim.setValue(nextSize);
          pan.setValue(nextPosition);
          onChange({
            size: nextSize,
            ...nextPosition,
          });
        },
      }),
    [canvasSize, onChange, onSelect, pan, sizeAnim, sticker.size, sticker.x, sticker.y],
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
    [onChange, onSelect, sticker.rotation],
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
        <Image source={{ uri: sticker.localImagePath }} style={styles.stickerImage} />
      </View>

      {selected ? (
        <>
          <Pressable onPress={onDelete} style={styles.deleteHandle} hitSlop={8}>
            <Text style={styles.handleText}>×</Text>
          </Pressable>
          <View style={styles.rotateHandle} {...rotateResponder.panHandlers}>
            <Text style={styles.handleText}>↻</Text>
          </View>
          <View style={styles.resizeHandle} {...resizeResponder.panHandlers}>
            <Text style={styles.handleText}>↘</Text>
          </View>
        </>
      ) : null}
    </Animated.View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function clampStickerPosition(x: number, y: number, size: number, canvasSize: CanvasSize) {
  return {
    x: clamp(x, 0, Math.max(0, canvasSize.width - size)),
    y: clamp(y, 0, Math.max(0, canvasSize.height - size)),
  };
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
    minHeight: 72,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  caption: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  screenBody: {
    flex: 1,
  },
  primaryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
  },
  primarySquareButton: {
    width: 48,
    minHeight: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  primarySquareButtonText: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.surface,
  },
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  dangerButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
  },
  dangerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
  },
  disabledButton: {
    backgroundColor: COLORS.primaryLight,
  },
  mutedButton: {
    opacity: 0.45,
  },
  outfitListContent: {
    padding: 16,
    gap: 12,
  },
  outfitCard: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  outfitPreview: {
    height: 172,
    backgroundColor: COLORS.canvasBg,
  },
  outfitPreviewImage: {
    position: 'absolute',
    width: 104,
    height: 104,
    resizeMode: 'contain',
  },
  outfitLabelRow: {
    minHeight: 48,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  outfitName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  outfitMeta: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
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
    fontWeight: '400',
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
    overflow: 'hidden',
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
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
  },
  libraryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  libraryText: {
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pickBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    minWidth: 32,
    minHeight: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  pickBadgeSelected: {
    backgroundColor: COLORS.accent,
  },
  pickBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
  },
  selectedBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    minHeight: 72,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedList: {
    alignItems: 'center',
    gap: 8,
  },
  selectedEmptyText: {
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '600',
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
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  selectedRemove: {
    position: 'absolute',
    right: -6,
    top: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    textAlign: 'center',
    lineHeight: 22,
    backgroundColor: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
  },
  arrangeButton: {
    minWidth: 64,
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  arrangeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
  },
  canvasActions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  canvas: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.canvasBg,
    overflow: 'hidden',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '400',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  sticker: {
    position: 'absolute',
  },
  stickerTouch: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  stickerTouchSelected: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  stickerImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  deleteHandle: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
  },
  rotateHandle: {
    position: 'absolute',
    left: -20,
    bottom: -20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  resizeHandle: {
    position: 'absolute',
    right: -20,
    bottom: -20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  handleText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.surface,
  },
});
