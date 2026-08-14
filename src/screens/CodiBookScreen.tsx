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
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors';
import { insertOutfit, listOutfits } from '../storage/database';
import type { ClothingItem } from '../types/clothing';
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

type CodiMode = 'library' | 'canvas';

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
  const [mode, setMode] = useState<CodiMode>('library');
  const [stickers, setStickers] = useState<OutfitSticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const tileSize = useMemo(() => {
    const availableWidth = width - SIDE_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1);

    return Math.floor(availableWidth / GRID_COLUMNS);
  }, [width]);

  const selectedSticker = useMemo(
    () => stickers.find((sticker) => sticker.id === selectedStickerId),
    [selectedStickerId, stickers],
  );

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

  const resetCanvas = () => {
    setStickers([]);
    setSelectedStickerId(null);
    setMode('library');
  };

  const saveOutfit = async () => {
    if (stickers.length === 0) {
      Alert.alert('저장할 코디가 없어북', '옷 고르기에서 옷을 먼저 선택해 주세요.');
      return;
    }

    setIsSaving(true);

    try {
      await insertOutfit({
        name: `코디 ${outfits.length + 1}`,
        stickers,
      });
      await loadSavedOutfits();
      onOutfitSaved();
      Alert.alert('저장했어북', '코디북에 새 코디를 저장했어요.');
    } catch (error) {
      Alert.alert(
        '코디 저장에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const loadOutfitOnCanvas = (outfit: Outfit) => {
    const restoredStickers = outfit.stickers.map((sticker, index) => ({
      ...sticker,
      id: `outfit-${outfit.id}-${index}-${Date.now()}`,
      zIndex: index + 1,
    }));

    setStickers(restoredStickers);
    setSelectedStickerId(restoredStickers[restoredStickers.length - 1]?.id ?? null);
    setMode('canvas');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingBottom: bottomInset + 8 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>코디북</Text>
            <Text style={styles.caption}>옷을 고르고, 따로 배치해요</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={resetCanvas} style={styles.secondaryButton} hitSlop={8}>
              <Text style={styles.secondaryButtonText}>Reset</Text>
            </Pressable>
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
        </View>

        <View style={styles.segmentedControl}>
          <ModeButton label="옷 고르기" selected={mode === 'library'} onPress={() => setMode('library')} />
          <ModeButton label={`배치하기 ${stickers.length}`} selected={mode === 'canvas'} onPress={() => setMode('canvas')} />
        </View>

        {mode === 'library' ? (
          <View style={styles.screenBody}>
            <SavedOutfits outfits={outfits} onSelect={loadOutfitOnCanvas} />
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
                data={items}
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
                          height: tileSize,
                        },
                        selected && styles.libraryTileSelected,
                      ]}
                      hitSlop={8}
                    >
                      <Image source={{ uri: item.localImagePath }} style={styles.libraryImage} />
                      <View style={[styles.pickBadge, selected && styles.pickBadgeSelected]}>
                        <Text style={styles.pickBadgeText}>{selected ? '선택' : '+'}</Text>
                      </View>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        ) : (
          <View style={styles.screenBody}>
            <View style={styles.canvasActions}>
              <Pressable onPress={() => setMode('library')} style={styles.secondaryButton} hitSlop={8}>
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
                    <Text style={styles.emptyText}>옷 고르기에서 코디할 옷을 가져와봐북</Text>
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
        )}
      </View>
    </SafeAreaView>
  );
}

type ModeButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ModeButton({ label, selected, onPress }: ModeButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.modeButton, selected && styles.modeButtonSelected]} hitSlop={8}>
      <Text style={[styles.modeButtonText, selected && styles.modeButtonTextSelected]}>{label}</Text>
    </Pressable>
  );
}

type SavedOutfitsProps = {
  outfits: Outfit[];
  onSelect: (outfit: Outfit) => void;
};

function SavedOutfits({ outfits, onSelect }: SavedOutfitsProps) {
  return (
    <View style={styles.savedBand}>
      <Text style={styles.sectionTitle}>저장한 코디</Text>
      {outfits.length === 0 ? (
        <Text style={styles.emptyCaption}>아직 저장된 코디가 없어북</Text>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedList}>
          {outfits.map((outfit) => (
            <Pressable key={outfit.id} onPress={() => onSelect(outfit)} style={styles.outfitCard} hitSlop={8}>
              <View style={styles.outfitPreview}>
                {outfit.stickers.slice(0, 3).map((sticker, index) => (
                  <Image
                    key={`${outfit.id}-${sticker.clothingItemId}-${index}`}
                    source={{ uri: sticker.localImagePath }}
                    style={[
                      styles.outfitPreviewImage,
                      {
                        left: 8 + index * 18,
                        top: 10 + index * 6,
                        transform: [{ rotate: `${sticker.rotation * 0.25}deg` }],
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.outfitName} numberOfLines={1}>
                {outfit.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
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
  const isDragging = useRef(false);
  const dragStart = useRef({ x: sticker.x, y: sticker.y });
  const resizeStart = useRef(sticker.size);
  const rotateStart = useRef(sticker.rotation);

  useEffect(() => {
    if (!isDragging.current) {
      pan.setValue({ x: sticker.x, y: sticker.y });
    }
  }, [pan, sticker.x, sticker.y]);

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
        onPanResponderTerminate: (_, gesture) => {
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
          resizeStart.current = sticker.size;
        },
        onPanResponderMove: (_, gesture) => {
          const nextSize = clamp(
            resizeStart.current + Math.max(gesture.dx, gesture.dy),
            MIN_STICKER_SIZE,
            Math.max(MIN_STICKER_SIZE, Math.min(canvasSize.width || 240, canvasSize.height || 240)),
          );

          onChange({
            size: nextSize,
            x: clamp(sticker.x, 0, Math.max(0, canvasSize.width - nextSize)),
            y: clamp(sticker.y, 0, Math.max(0, canvasSize.height - nextSize)),
          });
        },
      }),
    [canvasSize.height, canvasSize.width, onChange, onSelect, sticker.size, sticker.x, sticker.y],
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
          width: sticker.size,
          height: sticker.size,
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentedControl: {
    marginHorizontal: 16,
    marginBottom: 8,
    minHeight: 48,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    gap: 4,
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonSelected: {
    backgroundColor: COLORS.secondary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modeButtonTextSelected: {
    color: COLORS.primary,
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
  secondaryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
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
  disabledButton: {
    backgroundColor: COLORS.primaryLight,
  },
  mutedButton: {
    opacity: 0.45,
  },
  savedBand: {
    minHeight: 104,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  emptyCaption: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  savedList: {
    paddingTop: 8,
    gap: 8,
  },
  outfitCard: {
    width: 88,
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  outfitPreview: {
    height: 52,
    backgroundColor: COLORS.canvasBg,
  },
  outfitPreviewImage: {
    position: 'absolute',
    width: 36,
    height: 36,
    resizeMode: 'contain',
  },
  outfitName: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
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
  libraryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  pickBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    minWidth: 44,
    minHeight: 32,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  pickBadgeSelected: {
    backgroundColor: COLORS.accent,
  },
  pickBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.surface,
  },
  canvasActions: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
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
