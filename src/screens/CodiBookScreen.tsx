import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

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

const MIN_STICKER_SIZE = 72;
const DEFAULT_STICKER_SIZE = 136;

export function CodiBookScreen({
  items,
  isLoading,
  bottomInset,
  onOutfitSaved,
  onOpenWardrobe,
}: CodiBookScreenProps) {
  const [stickers, setStickers] = useState<OutfitSticker[]>([]);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const selectedSticker = useMemo(
    () => stickers.find((sticker) => sticker.id === selectedStickerId),
    [selectedStickerId, stickers],
  );

  const loadSavedOutfits = useCallback(async () => {
    try {
      const savedOutfits = await listOutfits();
      setOutfits(savedOutfits);
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

  const addSticker = (item: ClothingItem) => {
    const size = Math.min(DEFAULT_STICKER_SIZE, Math.max(MIN_STICKER_SIZE, canvasSize.width * 0.36));
    const sticker: OutfitSticker = {
      id: `sticker-${item.id}-${Date.now()}`,
      clothingItemId: item.id,
      localImagePath: item.localImagePath,
      x: Math.max(16, canvasSize.width / 2 - size / 2),
      y: Math.max(16, canvasSize.height / 2 - size / 2),
      size,
      rotation: 0,
      zIndex: stickers.length + 1,
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
  };

  const saveOutfit = async () => {
    if (stickers.length === 0) {
      Alert.alert('저장할 코디가 없어북', '캔버스에 옷을 먼저 올려 주세요.');
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
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingBottom: bottomInset + 8 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>코디북</Text>
            <Text style={styles.caption}>스티커처럼 겹쳐 보는 오늘의 룩</Text>
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

        <View style={styles.savedBand}>
          <Text style={styles.sectionTitle}>저장한 코디</Text>
          {outfits.length === 0 ? (
            <Text style={styles.emptyCaption}>아직 저장된 코디가 없어북</Text>
          ) : (
            <FlatList
              data={outfits}
              keyExtractor={(outfit) => String(outfit.id)}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.savedList}
              renderItem={({ item }) => (
                <Pressable onPress={() => loadOutfitOnCanvas(item)} style={styles.outfitCard}>
                  <View style={styles.outfitPreview}>
                    {item.stickers.slice(0, 3).map((sticker, index) => (
                      <Image
                        key={`${item.id}-${sticker.clothingItemId}-${index}`}
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
                    {item.name}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>

        <View style={styles.workArea}>
          <Pressable
            onPress={() => setSelectedStickerId(null)}
            style={styles.canvas}
            onLayout={(event) => {
              setCanvasSize({
                width: event.nativeEvent.layout.width,
                height: event.nativeEvent.layout.height,
              });
            }}
          >
            {stickers.length === 0 ? (
              <View style={styles.canvasEmptyState}>
                <Text style={styles.canvasMascot}>🐢</Text>
                <View style={styles.speechBubble}>
                  <Text style={styles.canvasEmptyText}>아래 옷을 눌러 코디를 만들어봐북</Text>
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
          </Pressable>

          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.sectionTitle}>내 옷장</Text>
              {selectedSticker ? (
                <Pressable onPress={bringSelectedForward} style={styles.layerButton} hitSlop={8}>
                  <Text style={styles.layerButtonText}>앞으로</Text>
                </Pressable>
              ) : null}
            </View>

            {isLoading ? (
              <View style={styles.drawerCenter}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : items.length === 0 ? (
              <View style={styles.drawerEmpty}>
                <Text style={styles.emptyCaption}>코디할 옷이 아직 없어북</Text>
                <Pressable onPress={onOpenWardrobe} style={styles.secondaryButton} hitSlop={8}>
                  <Text style={styles.secondaryButtonText}>옷장으로</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.drawerList}
              >
                {items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => addSticker(item)}
                    style={styles.drawerItem}
                    hitSlop={8}
                  >
                    <Image source={{ uri: item.localImagePath }} style={styles.drawerImage} />
                    <Text style={styles.drawerItemText} numberOfLines={1}>
                      {item.category}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
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
  const dragStart = useRef({ x: sticker.x, y: sticker.y });
  const resizeStart = useRef(sticker.size);
  const rotateStart = useRef(sticker.rotation);

  const dragResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
        onPanResponderGrant: () => {
          onSelect();
          dragStart.current = { x: sticker.x, y: sticker.y };
        },
        onPanResponderMove: (_, gesture) => {
          onChange({
            x: clamp(dragStart.current.x + gesture.dx, 0, canvasSize.width - sticker.size),
            y: clamp(dragStart.current.y + gesture.dy, 0, canvasSize.height - sticker.size),
          });
        },
      }),
    [canvasSize.height, canvasSize.width, onChange, onSelect, sticker.size, sticker.x, sticker.y],
  );

  const resizeResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          onSelect();
          resizeStart.current = sticker.size;
        },
        onPanResponderMove: (_, gesture) => {
          const nextSize = clamp(
            resizeStart.current + Math.max(gesture.dx, gesture.dy),
            MIN_STICKER_SIZE,
            Math.max(MIN_STICKER_SIZE, Math.min(canvasSize.width, canvasSize.height)),
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
    <View
      pointerEvents="box-none"
      style={[
        styles.sticker,
        {
          left: sticker.x,
          top: sticker.y,
          width: sticker.size,
          height: sticker.size,
          zIndex: sticker.zIndex,
          transform: [{ rotate: `${sticker.rotation}deg` }],
        },
      ]}
    >
      <Pressable
        onPress={onSelect}
        style={[styles.stickerTouch, selected && styles.stickerTouchSelected]}
        {...dragResponder.panHandlers}
      >
        <Image source={{ uri: sticker.localImagePath }} style={styles.stickerImage} />
      </Pressable>

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
    </View>
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
  primaryButton: {
    minWidth: 64,
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
  savedBand: {
    minHeight: 112,
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
  workArea: {
    flex: 1,
  },
  canvas: {
    flex: 65,
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.canvasBg,
    overflow: 'hidden',
  },
  canvasEmptyState: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  canvasMascot: {
    fontSize: 48,
    marginBottom: 16,
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
  canvasEmptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  drawer: {
    flex: 35,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  drawerHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  layerButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
  },
  layerButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  drawerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerEmpty: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 8,
  },
  drawerList: {
    paddingVertical: 8,
    gap: 8,
  },
  drawerItem: {
    width: 88,
    minHeight: 112,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  drawerImage: {
    width: 88,
    height: 88,
    resizeMode: 'cover',
    backgroundColor: COLORS.surface,
  },
  drawerItemText: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
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
