import * as ImagePicker from "expo-image-picker";
import {
  BookOpen,
  Camera,
  Check,
  ChevronLeft,
  CloudAlert,
  CloudCheck,
  Crop,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Image,
  Modal,
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
import { AppAlert } from "../components/AppDialog";
import { BrandMascotButton } from "../components/BrandMascotButton";
import { MascotEmptyState } from "../components/MascotEmptyState";
import { CollectionToolbar } from "../components/CollectionToolbar";
import { OutfitPreviewCanvas } from "../components/OutfitPreview";
import { WornClothes } from "../components/WornClothes";
import { isSupabaseConfigured } from "../services/supabaseClient";
import { fitMatchesSearch } from "../services/fitSearch";
import { useColorPaletteOptions } from "../hooks/useColorPaletteOptions";
import { useCategoryOptions } from "../hooks/useCategoryOptions";
import { useGridColumns } from "../hooks/useGridColumns";
import {
  compareCollection,
  dateSearchTerms,
  EMPTY_FILTERS,
  isValidDate,
  localDate,
  matchesCollectionFilters,
  type CollectionFilters,
  type CollectionSort,
} from "../services/collectionControls";
import { deleteFitFromCloud, syncStoredFitToCloud } from "../services/fitCloud";
import {
  deleteFitEntry,
  insertFitEntry,
  listFitEntries,
  listOutfits,
  updateFitEntry,
} from "../storage/database";
import { saveFitImage } from "../storage/imageStorage";
import type { CategoryFilter, ClothingItem } from "../types/clothing";
import type { FitEntry, NewFitEntry } from "../types/fit";
import type { Outfit } from "../types/outfit";
import { ImageCropScreen } from "./ImageCropScreen";

export type MyFitEntryPoint =
  | { kind: "clothing"; id: number; requestId: number }
  | { kind: "outfit"; id: number; requestId: number; create?: boolean };

type MyFitScreenProps = {
  items: ClothingItem[];
  isActive: boolean;
  bottomInset: number;
  resetSignal: number;
  entryPoint: MyFitEntryPoint | null;
  onEntryPointHandled: () => void;
  onReturnToSource: () => void;
  onOpenClothingItem: (item: ClothingItem) => void;
  onOpenOutfit: (outfitId: number) => void;
  onChanged: () => void | Promise<void>;
};

type FitMode = "list" | "detail" | "editor";

const GRID_GAP = 10;
const SIDE_PADDING = 16;

export function MyFitScreen({
  items,
  isActive,
  bottomInset,
  resetSignal,
  entryPoint,
  onEntryPointHandled,
  onReturnToSource,
  onOpenClothingItem,
  onOpenOutfit,
  onChanged,
}: MyFitScreenProps) {
  const { width } = useWindowDimensions();
  const pendingOutfitId = useRef<number | null>(null);
  const listRef = useRef<FlatList<FitEntry>>(null);
  const [fits, setFits] = useState<FitEntry[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [mode, setMode] = useState<FitMode>("list");
  const [selectedFit, setSelectedFit] = useState<FitEntry | null>(null);
  const [sourceFilter, setSourceFilter] = useState<MyFitEntryPoint | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editorFit, setEditorFit] = useState<FitEntry | null>(null);
  const [editorImageUri, setEditorImageUri] = useState<string | null>(null);
  const [editorImageChanged, setEditorImageChanged] = useState(false);
  const [editorClothingIds, setEditorClothingIds] = useState<number[]>([]);
  const [editorOutfitId, setEditorOutfitId] = useState<number | null>(null);
  const [pickerCategory, setPickerCategory] = useState<CategoryFilter>("전체");
  const [pickerQuery, setPickerQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<CollectionSort>("createdDesc");
  const [filters, setFilters] = useState<CollectionFilters>(EMPTY_FILTERS);
  const { gridColumns, cycleGridColumns } = useGridColumns("myFit.gridColumns", 2);
  const [editorName, setEditorName] = useState("");
  const [editorWornOn, setEditorWornOn] = useState(localDate());
  const [cropUri, setCropUri] = useState<string | null>(null);
  const { categoryOptions } = useCategoryOptions();
  const { colorOptions } = useColorPaletteOptions();
  const tileWidth = Math.floor(
    (width - SIDE_PADDING * 2 - GRID_GAP * (gridColumns - 1)) / gridColumns
  );

  const loadFits = useCallback(async () => {
    try {
      const [storedFits, storedOutfits] = await Promise.all([
        listFitEntries(),
        listOutfits(),
      ]);
      setFits(storedFits);
      setOutfits(storedOutfits);
      setSelectedFit((current) =>
        current ? storedFits.find((fit) => fit.id === current.id) ?? null : null
      );
    } catch (error) {
      AppAlert.alert(
        "마이핏을 불러오지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isActive) void loadFits();
  }, [isActive, loadFits]);

  useEffect(() => {
    if (!entryPoint || isLoading) return;

    setSourceFilter(entryPoint);
    if (entryPoint.kind === "outfit" && entryPoint.create) {
      pendingOutfitId.current = entryPoint.id;
      setMode("list");
      beginAdd();
      onEntryPointHandled();
      return;
    }
    setSelectedFit(null);
    setMode("list");
    onEntryPointHandled();
  }, [entryPoint, fits, isLoading, onEntryPointHandled]);

  useEffect(() => {
    setSourceFilter(null);
    setSelectedFit(null);
    setMode("list");
    setPickerCategory("전체");
    setPickerQuery("");
    requestAnimationFrame(() =>
      listRef.current?.scrollToOffset({ offset: 0, animated: true })
    );
  }, [resetSignal]);

  const visibleFits = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return fits
      .filter((fit) => {
        if (
          sourceFilter &&
          !(sourceFilter.kind === "clothing"
            ? fit.clothingItemIds.includes(sourceFilter.id)
            : fit.outfitId === sourceFilter.id)
        )
          return false;
        const outfit = outfits.find((entry) => entry.id === fit.outfitId);
        const clothingIds = new Set([
          ...fit.clothingItemIds,
          ...(outfit?.stickers.map((sticker) => sticker.clothingItemId) ?? []),
        ]);
        const clothes = items.filter((item) => clothingIds.has(item.id));
        return (
          fitMatchesSearch(fit, query, outfit, clothes, colorOptions) &&
          matchesCollectionFilters(
            filters,
            [
              ...(outfit?.seasons ?? []),
              ...clothes.flatMap((item) => item.seasons),
            ],
            clothes.map((item) => item.color),
            fit.wornOn
          )
        );
      })
      .sort((a, b) =>
        compareCollection(
          sortOrder,
          { name: a.name, date: a.wornOn, id: a.id },
          { name: b.name, date: b.wornOn, id: b.id }
        )
      );
  }, [
    fits,
    sourceFilter,
    searchQuery,
    filters,
    sortOrder,
    outfits,
    items,
    colorOptions,
  ]);

  const pickerItems = useMemo(() => {
    const query = pickerQuery.trim().toLowerCase();
    return items.filter((item) => {
      const categoryMatches =
        pickerCategory === "전체" || item.category === pickerCategory;
      const text = [
        item.name,
        item.brand,
        item.category,
        ...item.tags,
        ...item.fitSizes,
      ]
        .join(" ")
        .toLowerCase();
      return categoryMatches && (!query || text.includes(query));
    });
  }, [items, pickerCategory, pickerQuery]);

  const returnFromCurrent = useCallback(() => {
    if (mode === "detail") {
      setSelectedFit(null);
      setMode("list");
      return;
    }
    if (sourceFilter) {
      setSourceFilter(null);
      setSelectedFit(null);
      setMode("list");
      onReturnToSource();
      return;
    }

    setSelectedFit(null);
    setMode("list");
  }, [mode, onReturnToSource, sourceFilter]);

  useEffect(() => {
    if (!isActive || (mode === "list" && !sourceFilter)) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (mode === "editor") {
          requestCloseEditor();
          return true;
        }

        returnFromCurrent();
        return true;
      }
    );
    return () => subscription.remove();
  });

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      await loadFits();
      await onChanged();
    } finally {
      setIsRefreshing(false);
    }
  };

  const pickImage = async (source: "library" | "camera") => {
    const permission =
      source === "library"
        ? await ImagePicker.requestMediaLibraryPermissionsAsync()
        : await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      AppAlert.alert(
        "권한이 필요해북",
        "마이핏 사진을 선택하거나 촬영할 권한을 허용해 주세요."
      );
      return null;
    }

    const result =
      source === "library"
        ? await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 1,
          })
        : await ImagePicker.launchCameraAsync({ quality: 1 });

    return result.canceled ? null : result.assets[0]?.uri ?? null;
  };

  const beginAdd = () => {
    AppAlert.alert(
      "마이핏 사진을 추가해북",
      "사진을 가져올 방법을 골라 주세요.",
      [
        {
          text: "취소",
          style: "cancel",
          onPress: () => {
            pendingOutfitId.current = null;
          },
        },
        {
          text: "갤러리",
          onPress: () =>
            void pickImage("library").then(
              (uri) => uri && openEditor(null, uri)
            ),
        },
        {
          text: "카메라",
          onPress: () =>
            void pickImage("camera").then(
              (uri) => uri && openEditor(null, uri)
            ),
        },
      ]
    );
  };

  const openEditor = (fit: FitEntry | null, imageUri?: string) => {
    setEditorFit(fit);
    setEditorName(fit?.name ?? "");
    setEditorWornOn(fit?.wornOn ?? localDate());
    if (imageUri) setCropUri(imageUri);
    setEditorImageUri(imageUri ?? fit?.localImagePath ?? null);
    setEditorImageChanged(Boolean(imageUri));
    setEditorClothingIds(
      fit?.clothingItemIds ??
        (sourceFilter?.kind === "clothing" ? [sourceFilter.id] : [])
    );
    setEditorOutfitId(
      fit?.outfitId ??
        pendingOutfitId.current ??
        (sourceFilter?.kind === "outfit" ? sourceFilter.id : null)
    );
    pendingOutfitId.current = null;
    setPickerCategory("전체");
    setPickerQuery("");
    setMode("editor");
  };

  const requestCloseEditor = () => {
    AppAlert.alert("수정을 그만할까북?", "저장하지 않은 변경사항은 사라져요.", [
      { text: "계속 수정", style: "cancel" },
      {
        text: "나가기",
        style: "destructive",
        onPress: () => setMode(editorFit ? "detail" : "list"),
      },
    ]);
  };

  const saveFit = async () => {
    if (!editorImageUri) {
      AppAlert.alert("사진이 필요해북", "마이핏 사진을 먼저 선택해 주세요.");
      return;
    }

    if (!isValidDate(editorWornOn)) {
      AppAlert.alert(
        "날짜를 확인해북",
        "입은 날짜를 YYYY-MM-DD 형식으로 입력해 주세요."
      );
      return;
    }
    setIsSaving(true);
    try {
      const localImagePath =
        editorImageChanged || !editorFit
          ? await saveFitImage(editorImageUri)
          : editorFit.localImagePath;
      const localDraft: NewFitEntry = {
        name: editorName.trim() || `마이핏 ${editorWornOn}`,
        wornOn: editorWornOn,
        localImagePath,
        remoteImageUrl: editorImageChanged
          ? null
          : editorFit?.remoteImageUrl ?? null,
        remoteRecordId: editorFit?.remoteRecordId ?? null,
        storagePath: editorFit?.storagePath ?? null,
        clothingItemIds: editorClothingIds,
        outfitId: editorOutfitId,
        cloudSyncStatus: isSupabaseConfigured ? "pending" : "local",
        cloudError: null,
        syncedAt: null,
      };
      const savedId = editorFit
        ? editorFit.id
        : await insertFitEntry(localDraft);
      if (editorFit) await updateFitEntry({ ...editorFit, ...localDraft });
      // Commit locally before starting any network work.
      void syncStoredFitToCloud(savedId, items, outfits)
        .then(async () => {
          await loadFits();
          await onChanged();
        })
        .catch(() => {
          /* The local record remains available for retry. */
        });

      await loadFits();
      await onChanged();
      setMode("list");
      setSelectedFit(null);
    } catch (error) {
      AppAlert.alert(
        "마이핏을 저장하지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = (fit: FitEntry) => {
    AppAlert.alert(
      "이 마이핏을 삭제할까북?",
      "사진과 연결 정보가 모두 삭제돼요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => void deleteSelectedFit(fit),
        },
      ]
    );
  };

  const deleteSelectedFit = async (fit: FitEntry) => {
    try {
      await deleteFitFromCloud(fit);
      await deleteFitEntry(fit.id);
      await loadFits();
      setSelectedFit(null);
      setMode("list");
    } catch (error) {
      AppAlert.alert(
        "마이핏을 삭제하지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    }
  };

  if (mode === "editor") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.subHeader}>
          <Pressable
            onPress={requestCloseEditor}
            style={styles.headerIcon}
            hitSlop={8}
          >
            <X color={COLORS.textPrimary} size={23} strokeWidth={2.2} />
          </Pressable>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>
              {editorFit ? "마이핏 수정" : "마이핏 추가"}
            </Text>
            <Text style={styles.caption}>입은 옷과 코디를 연결해요</Text>
          </View>
          <Pressable
            onPress={saveFit}
            disabled={isSaving}
            style={[styles.saveButton, isSaving && styles.disabled]}
            hitSlop={8}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <Text style={styles.saveButtonText}>저장</Text>
            )}
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.editorContent,
            { paddingBottom: bottomInset + 28 },
          ]}
        >
          <View style={styles.editorPhotoFrame}>
            {editorImageUri ? (
              <Image source={{ uri: editorImageUri }} style={styles.fitImage} />
            ) : null}
          </View>
          <View style={styles.photoActions}>
            <Pressable
              onPress={() => editorImageUri && setCropUri(editorImageUri)}
              style={styles.outlineButton}
            >
              <Crop color={COLORS.primary} size={18} />
              <Text style={styles.outlineButtonText}>사진 편집</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                void pickImage("library").then((uri) => {
                  if (uri) {
                    setEditorImageUri(uri);
                    setEditorImageChanged(true);
                    setCropUri(uri);
                  }
                })
              }
              style={styles.outlineButton}
            >
              <ImagePlus color={COLORS.primary} size={18} strokeWidth={2.2} />
              <Text style={styles.outlineButtonText}>사진 변경</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                void pickImage("camera").then((uri) => {
                  if (uri) {
                    setEditorImageUri(uri);
                    setEditorImageChanged(true);
                    setCropUri(uri);
                  }
                })
              }
              style={styles.outlineButton}
            >
              <Camera color={COLORS.primary} size={18} strokeWidth={2.2} />
              <Text style={styles.outlineButtonText}>촬영</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>마이핏 이름</Text>
            <TextInput
              value={editorName}
              onChangeText={setEditorName}
              placeholder="마이핏 이름"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.searchInput}
              maxLength={100}
            />
            <Text style={styles.sectionTitle}>입은 날짜</Text>
            <TextInput
              value={editorWornOn}
              onChangeText={setEditorWornOn}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.searchInput}
              maxLength={10}
              accessibilityLabel="입은 날짜 YYYY-MM-DD"
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>연결할 옷</Text>
            {items.length === 0 ? (
              <Text style={styles.emptyRelation}>
                등록한 옷이 아직 없어북
              </Text>
            ) : (
              <>
                <TextInput
                  value={pickerQuery}
                  onChangeText={setPickerQuery}
                  placeholder="이름, 브랜드, 태그 검색"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.searchInput}
                />
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipRow}
                >
                  {(["전체", ...categoryOptions] as CategoryFilter[]).map(
                    (category) => (
                      <Pressable
                        key={category}
                        onPress={() => setPickerCategory(category)}
                        style={[
                          styles.chip,
                          pickerCategory === category && styles.chipSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            pickerCategory === category && styles.chipTextSelected,
                          ]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    )
                  )}
                </ScrollView>
                {pickerItems.length === 0 ? (
                  <Text style={styles.emptyRelation}>검색 결과가 없어북</Text>
                ) : (
                  <View style={styles.itemPickerGrid}>
                    {pickerItems.map((item) => {
                      const selected = editorClothingIds.includes(item.id);
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() =>
                            setEditorClothingIds((current) =>
                              selected
                                ? current.filter((id) => id !== item.id)
                                : [...current, item.id]
                            )
                          }
                          style={[
                            styles.pickerItem,
                            selected && styles.pickerItemSelected,
                          ]}
                        >
                          <Image
                            source={{ uri: item.localImagePath }}
                            style={styles.pickerItemImage}
                          />
                          <Text style={styles.pickerItemName} numberOfLines={1}>
                            {item.name || item.category}
                          </Text>
                          {selected ? (
                            <View style={styles.checkBadge}>
                              <Check
                                color={COLORS.surface}
                                size={15}
                                strokeWidth={2.8}
                              />
                            </View>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>연결할 코디북</Text>
            {outfits.length > 0 ? (
              <Text style={styles.sectionHint}>
                선택하지 않거나 하나만 연결할 수 있어요.
              </Text>
            ) : null}
            {outfits.length === 0 ? (
              <Text style={styles.emptyRelation}>
                저장한 코디가 아직 없어북
              </Text>
            ) : (
              <View style={styles.outfitPickerList}>
                {outfits.map((outfit) => {
                  const selected = editorOutfitId === outfit.id;
                  return (
                    <Pressable
                      key={outfit.id}
                      onPress={() =>
                        setEditorOutfitId(selected ? null : outfit.id)
                      }
                      style={[
                        styles.outfitPickerRow,
                        selected && styles.outfitPickerRowSelected,
                      ]}
                    >
                      <View style={styles.outfitThumb}>
                        <OutfitPreviewCanvas
                          stickers={outfit.stickers}
                          canvasWidth={outfit.canvasWidth}
                          canvasHeight={outfit.canvasHeight}
                          previewSize={88}
                        />
                      </View>
                      <Text style={styles.outfitPickerName} numberOfLines={1}>
                        {outfit.name}
                      </Text>
                      {selected ? (
                        <Check
                          color={COLORS.primary}
                          size={20}
                          strokeWidth={2.6}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
        <Modal
          visible={isActive && Boolean(cropUri)}
          animationType="slide"
          onRequestClose={() => setCropUri(null)}
        >
          {cropUri ? (
            <ImageCropScreen
              imageUri={cropUri}
              doneLabel="완료"
              onCancel={() => setCropUri(null)}
              onDone={(uri) => {
                setEditorImageUri(uri);
                setEditorImageChanged(true);
                setCropUri(null);
              }}
            />
          ) : null}
        </Modal>
      </SafeAreaView>
    );
  }

  if (mode === "detail" && selectedFit) {
    const linkedOutfit = outfits.find(
      (outfit) => outfit.id === selectedFit.outfitId
    );
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.subHeader}>
          <Pressable
            onPress={returnFromCurrent}
            style={styles.headerIcon}
            hitSlop={8}
          >
            <ChevronLeft
              color={COLORS.textPrimary}
              size={25}
              strokeWidth={2.2}
            />
          </Pressable>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title} numberOfLines={1}>
              {selectedFit.name || "마이핏 상세"}
            </Text>
            <Text style={styles.caption}>{formatDate(selectedFit.wornOn)}</Text>
          </View>
          <View style={styles.detailActions}>
            <Pressable
              onPress={() => openEditor(selectedFit)}
              style={styles.headerIcon}
              hitSlop={8}
            >
              <Pencil color={COLORS.primary} size={20} strokeWidth={2.2} />
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(selectedFit)}
              style={styles.headerIcon}
              hitSlop={8}
            >
              <Trash2 color={COLORS.danger} size={20} strokeWidth={2.2} />
            </Pressable>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.detailContent,
            { paddingBottom: bottomInset + 28 },
          ]}
        >
          <View style={styles.detailPhotoFrame}>
            <Image
              source={{ uri: selectedFit.localImagePath }}
              style={styles.fitImage}
            />
            <FitSyncBadge status={selectedFit.cloudSyncStatus} />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeadingRow}>
              <BookOpen color={COLORS.primary} size={19} strokeWidth={2.2} />
              <Text style={styles.sectionTitle}>연결된 코디북</Text>
            </View>
            {linkedOutfit ? (
              <Pressable
                onPress={() => onOpenOutfit(linkedOutfit.id)}
                style={styles.linkRow}
              >
                <View style={styles.linkImagePlaceholder}>
                  <OutfitPreviewCanvas
                    stickers={linkedOutfit.stickers}
                    canvasWidth={linkedOutfit.canvasWidth}
                    canvasHeight={linkedOutfit.canvasHeight}
                    previewSize={88}
                  />
                </View>
                <View style={styles.linkTextGroup}>
                  <Text style={styles.linkTitle}>{linkedOutfit.name}</Text>
                  <Text style={styles.linkCaption}>
                    {linkedOutfit.stickers.length}개의 옷
                  </Text>
                </View>
              </Pressable>
            ) : (
              <Text style={styles.emptyRelation}>
                {selectedFit.outfitId
                  ? "삭제된 코디입니다"
                  : "연결된 코디가 없어북"}
              </Text>
            )}
          </View>
          <WornClothes
            clothes={selectedFit.clothingItemIds.map((id) => {
              const item = items.find((candidate) => candidate.id === id);
              return {
                key: String(id),
                imageUri: item?.localImagePath,
                name: item?.name || item?.category || "",
                brand: item?.brand || "",
                deleted: !item,
                onPress: item ? () => onOpenClothingItem(item) : undefined,
              };
            })}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <View style={styles.mainHeader}>
          {sourceFilter ? (
            <Pressable
              onPress={returnFromCurrent}
              style={styles.headerIcon}
              hitSlop={8}
            >
              <ChevronLeft
                color={COLORS.textPrimary}
                size={25}
                strokeWidth={2.2}
              />
            </Pressable>
          ) : null}
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>룩부기 마이핏</Text>
            <Text style={styles.caption}>
              {sourceFilter
                ? "연결된 마이핏을 모아봤어북"
                : "내가 직접 입은 모습을 기록해요"}
            </Text>
          </View>
          <View style={styles.detailActions}>
            <BrandMascotButton
              screen="myfit"
              onPress={() => void refresh()}
              label="마이핏 새로고침"
            />
          </View>
        </View>
        <CollectionToolbar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          placeholder="마이핏, 날짜, 코디북, 옷 검색"
          sort={sortOrder}
          onSortChange={setSortOrder}
          filters={filters}
          onFiltersChange={setFilters}
          title="마이핏"
          dates
          bottomInset={bottomInset}
          isActive={isActive}
          gridColumns={gridColumns}
          onCycleGridColumns={cycleGridColumns}
        />
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            key={`fits-${gridColumns}`}
            ref={listRef}
            data={visibleFits}
            keyExtractor={(fit) => String(fit.id)}
            numColumns={gridColumns}
            columnWrapperStyle={gridColumns > 1 ? styles.gridRow : undefined}
            refreshing={isRefreshing}
            onRefresh={refresh}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: bottomInset + 28 },
              visibleFits.length === 0 && styles.emptyList,
            ]}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setSelectedFit(item);
                  setMode("detail");
                }}
                style={[
                  styles.fitCard,
                  {
                    width: tileWidth,
                    marginBottom: gridColumns === 1 ? GRID_GAP : 0,
                  },
                ]}
              >
                <Image
                  source={{ uri: item.localImagePath }}
                  style={styles.cardImage}
                />
                <View style={styles.cardFooter}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.name || "마이핏"}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {formatDate(item.wornOn)}
                  </Text>
                </View>
                <FitSyncBadge status={item.cloudSyncStatus} />
              </Pressable>
            )}
            ListEmptyComponent={
              <MascotEmptyState
                screen="myfit"
                message={searchQuery.trim() ||
                  filters.seasons.length ||
                  filters.colors.length ||
                  filters.dateFrom ||
                  filters.dateTo
                    ? "검색 결과가 없어북"
                    : sourceFilter
                    ? "연결된 마이핏이 아직 없어북"
                    : undefined}
              />
            }
          />
        )}
        <Pressable
          onPress={beginAdd}
          style={[styles.fab, { bottom: bottomInset + 16 }]}
          accessibilityLabel="마이핏 추가"
          hitSlop={8}
        >
          <Plus color={COLORS.surface} size={28} strokeWidth={2.6} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FitSyncBadge({ status }: { status: FitEntry["cloudSyncStatus"] }) {
  const synced = status === "synced";
  const Icon = synced ? CloudCheck : CloudAlert;
  return (
    <View
      style={[
        styles.syncBadge,
        synced
          ? styles.syncSynced
          : status === "failed"
          ? styles.syncFailed
          : styles.syncLocal,
      ]}
    >
      <Icon color={COLORS.surface} size={16} strokeWidth={2.5} />
    </View>
  );
}

function formatDate(value: string) {
  return isValidDate(value.slice(0, 10))
    ? value.slice(0, 10).replaceAll("-", ".")
    : "기록한 마이핏";
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  root: { flex: 1 },
  mainHeader: {
    minHeight: 80,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subHeader: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerTextGroup: { flex: 1 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary },
  caption: { marginTop: 3, fontSize: 12, color: COLORS.textSecondary },
  headerIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  detailActions: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  saveButton: {
    minWidth: 62,
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  saveButtonText: { fontSize: 14, fontWeight: "700", color: COLORS.surface },
  disabled: { opacity: 0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: SIDE_PADDING, paddingTop: 8 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  fitCard: {
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cardImage: { width: "100%", aspectRatio: 4 / 5, resizeMode: "cover" },
  cardFooter: { minHeight: 52, paddingHorizontal: 10, paddingVertical: 8 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary },
  cardMeta: { marginTop: 3, fontSize: 11, color: COLORS.textSecondary },
  syncBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  syncSynced: { backgroundColor: COLORS.primary },
  syncFailed: { backgroundColor: COLORS.danger },
  syncLocal: { backgroundColor: COLORS.textSecondary },
  emptyList: { flexGrow: 1, justifyContent: "center" },
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
  editorContent: { padding: 16, gap: 16 },
  editorPhotoFrame: {
    width: "100%",
    aspectRatio: 4 / 5,
    maxHeight: 480,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  fitImage: { width: "100%", height: "100%", resizeMode: "cover" },
  photoActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  outlineButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  outlineButtonText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  section: { gap: 10 },
  sectionHeadingRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  sectionHint: { fontSize: 12, color: COLORS.textSecondary },
  searchInput: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  chipRow: { gap: 6, paddingVertical: 2 },
  chip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
  },
  chipSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  chipTextSelected: { color: COLORS.primary },
  itemPickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickerItem: {
    width: 88,
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  pickerItemSelected: { borderColor: COLORS.primary, borderWidth: 2 },
  pickerItemImage: { width: "100%", aspectRatio: 1, resizeMode: "contain" },
  pickerItemName: {
    paddingHorizontal: 6,
    paddingVertical: 7,
    fontSize: 11,
    color: COLORS.textPrimary,
  },
  checkBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  outfitPickerList: { gap: 7 },
  outfitPickerRow: {
    minHeight: 58,
    padding: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  outfitPickerRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.secondary,
  },
  outfitThumb: {
    width: 88,
    height: 88,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  outfitPickerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  emptyRelation: { fontSize: 13, color: COLORS.textSecondary },
  detailContent: { padding: 16, gap: 18 },
  detailPhotoFrame: {
    width: "100%",
    aspectRatio: 4 / 5,
    maxHeight: 540,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  },
  linkRow: {
    minHeight: 64,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  linkImagePlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: COLORS.background,
  },
  linkTextGroup: { flex: 1 },
  linkTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  linkCaption: { marginTop: 3, fontSize: 12, color: COLORS.textSecondary },
});
