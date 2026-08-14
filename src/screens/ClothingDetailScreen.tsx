import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors';
import { ImageCropScreen } from './ImageCropScreen';
import { ImageEraserScreen } from './ImageEraserScreen';
import { loadCustomColorOptions, saveCustomColorOptions } from '../storage/colorPalette';
import { updateClothingItem } from '../storage/database';
import { processWardrobeImage, saveWardrobeImage } from '../storage/imageStorage';
import { syncClothingItemUpdateToCloud } from '../services/wardrobeCloud';
import {
  CLOTHING_CATEGORIES,
  COLOR_OPTIONS,
  SEASONS,
  type ClothingCategory,
  type ClothingColor,
  type ClothingItem,
  type ColorOption,
  type Season,
} from '../types/clothing';

type ClothingDetailScreenProps = {
  item: ClothingItem;
  onClose: () => void;
  onSaved: () => void;
};

export function ClothingDetailScreen({ item, onClose, onSaved }: ClothingDetailScreenProps) {
  const [imageUri, setImageUri] = useState(item.localImagePath);
  const [imageChanged, setImageChanged] = useState(false);
  const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);
  const [eraserSourceUri, setEraserSourceUri] = useState<string | null>(null);
  const [name, setName] = useState(item.name);
  const [brand, setBrand] = useState(item.brand);
  const [category, setCategory] = useState<ClothingCategory>(item.category);
  const [seasons, setSeasons] = useState<Season[]>(item.seasons);
  const [color, setColor] = useState<ClothingColor>(item.color);
  const [customColorOptions, setCustomColorOptions] = useState<ColorOption[]>([]);
  const [customColorLabel, setCustomColorLabel] = useState('');
  const [customColorValue, setCustomColorValue] = useState('#');
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCropVisible, setIsCropVisible] = useState(false);
  const [isEraserVisible, setIsEraserVisible] = useState(false);

  const colorOptions = useMemo(
    () => mergeColorOptions([...COLOR_OPTIONS, ...customColorOptions]),
    [customColorOptions],
  );
  const normalizedCustomColorValue = customColorValue.toUpperCase();
  const canAddCustomColor = /^#[0-9A-F]{6}$/.test(normalizedCustomColorValue);
  const hasDraft =
    imageUri !== item.localImagePath ||
    name !== item.name ||
    brand !== item.brand ||
    category !== item.category ||
    color !== item.color ||
    seasons.join('|') !== item.seasons.join('|') ||
    customColorLabel.trim().length > 0 ||
    customColorValue !== '#';

  useEffect(() => {
    async function loadPalette() {
      setCustomColorOptions(await loadCustomColorOptions());
    }

    loadPalette();
  }, []);

  const requestClose = useCallback(() => {
    if (isSaving) {
      return;
    }

    if (!hasDraft) {
      onClose();
      return;
    }

    Alert.alert('수정을 그만할까북?', '저장하지 않은 변경사항은 사라져요.', [
      { text: '계속 수정', style: 'cancel' },
      { text: '나가기', style: 'destructive', onPress: onClose },
    ]);
  }, [hasDraft, isSaving, onClose]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });

    return () => subscription.remove();
  }, [requestClose]);

  const startImagePipeline = () => {
    setCropSourceUri(imageUri);
    setIsCropVisible(true);
    setProcessingMessage(null);
  };

  const handleCropDone = (croppedImageUri: string) => {
    setIsCropVisible(false);
    setCropSourceUri(null);
    setEraserSourceUri(croppedImageUri);
    setIsEraserVisible(true);
  };

  const handleCropCancel = () => {
    setIsCropVisible(false);
    setCropSourceUri(null);
  };

  const handleEraserCancel = () => {
    setIsEraserVisible(false);
    setEraserSourceUri(null);
  };

  const handleEraserDone = (editedImageUri: string) => {
    setImageUri(editedImageUri);
    setImageChanged(true);
    setIsEraserVisible(false);
    setEraserSourceUri(null);
    setProcessingMessage('이미지 수정이 적용됐어북');
  };

  const toggleSeason = (season: Season) => {
    setSeasons((current) =>
      current.includes(season)
        ? current.filter((currentSeason) => currentSeason !== season)
        : [...current, season],
    );
  };

  const addCustomColorOption = async () => {
    const label = customColorLabel.trim() || normalizedCustomColorValue;
    const nextOption = {
      label,
      value: normalizedCustomColorValue,
    };

    if (!canAddCustomColor) {
      Alert.alert('색상값을 확인해북', '#RRGGBB 형식으로 입력해 주세요.');
      return;
    }

    if (colorOptions.some((option) => option.label === label)) {
      Alert.alert('이미 있는 색상이어북', '다른 이름으로 추가해 주세요.');
      return;
    }

    const nextCustomOptions = [...customColorOptions, nextOption];

    try {
      await saveCustomColorOptions(nextCustomOptions);
      setCustomColorOptions(nextCustomOptions);
      setColor(label);
      setCustomColorLabel('');
      setCustomColorValue('#');
    } catch (error) {
      Alert.alert(
        '색상 추가에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    }
  };

  const saveChanges = async () => {
    setIsSaving(true);

    try {
      setProcessingMessage('옷 정보를 저장하고 있어북...');
      const nextLocalImagePath = imageChanged
        ? await saveProcessedImage(imageUri)
        : item.localImagePath;
      const localDraft: ClothingItem = {
        ...item,
        localImagePath: nextLocalImagePath,
        name: name.trim(),
        brand: brand.trim(),
        category,
        seasons,
        color,
        cloudSyncStatus: item.cloudSyncStatus === 'synced' ? 'pending' : item.cloudSyncStatus,
        cloudError: null,
      };
      const cloudState = await syncClothingItemUpdateToCloud(localDraft, imageChanged);

      await updateClothingItem({
        ...localDraft,
        remoteImageUrl: cloudState.remoteImageUrl ?? localDraft.remoteImageUrl,
        remoteRecordId: cloudState.remoteRecordId ?? localDraft.remoteRecordId,
        storagePath: cloudState.storagePath ?? localDraft.storagePath,
        cloudSyncStatus: cloudState.cloudSyncStatus,
        cloudError: cloudState.cloudError,
        syncedAt: cloudState.syncedAt,
      });

      onSaved();
    } catch (error) {
      Alert.alert(
        '수정 저장에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsSaving(false);
      setProcessingMessage(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <Pressable onPress={requestClose} style={styles.headerButton} hitSlop={8}>
            <Text style={styles.headerButtonText}>닫기</Text>
          </Pressable>
          <Text style={styles.title}>옷 상세</Text>
          <Pressable
            onPress={saveChanges}
            disabled={isSaving}
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            hitSlop={8}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <Text style={styles.saveButtonText}>저장</Text>
            )}
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.previewArea}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          </View>

          <Pressable onPress={startImagePipeline} style={styles.editImageButton} hitSlop={8}>
            <Text style={styles.editImageButtonText}>사진 편집</Text>
          </Pressable>

          {processingMessage ? (
            <Text style={styles.processingText}>{processingMessage}</Text>
          ) : null}

          <View style={styles.formGroup}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="예: 흰 반팔 티셔츠"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
              returnKeyType="done"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>브랜드</Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder="브랜드명을 입력해 주세요"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.input}
              returnKeyType="done"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>카테고리</Text>
            <View style={styles.chipWrap}>
              {CLOTHING_CATEGORIES.map((option) => (
                <ChoiceChip
                  key={option}
                  label={option}
                  selected={category === option}
                  onPress={() => setCategory(option)}
                />
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>계절</Text>
            <View style={styles.chipWrap}>
              {SEASONS.map((option) => (
                <ChoiceChip
                  key={option}
                  label={option}
                  selected={seasons.includes(option)}
                  onPress={() => toggleSeason(option)}
                />
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>대표색</Text>
            <View style={styles.chipWrap}>
              {colorOptions.map((option) => (
                <Pressable
                  key={`${option.label}-${option.value}`}
                  onPress={() => setColor(option.label)}
                  style={[styles.colorChip, color === option.label && styles.choiceChipSelected]}
                  hitSlop={8}
                >
                  <View
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: option.value,
                        borderColor: option.value === '#FFFFFF' ? COLORS.border : option.value,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.choiceChipText,
                      color === option.label && styles.choiceChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.customColorPanel}>
              <Text style={styles.smallLabel}>내 색 추가</Text>
              <View style={styles.customColorInputs}>
                <TextInput
                  value={customColorLabel}
                  onChangeText={setCustomColorLabel}
                  placeholder="색 이름"
                  placeholderTextColor={COLORS.textSecondary}
                  style={[styles.input, styles.colorNameInput]}
                  returnKeyType="done"
                />
                <View style={styles.hexInput}>
                  <View
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: canAddCustomColor
                          ? normalizedCustomColorValue
                          : COLORS.surface,
                      },
                    ]}
                  />
                  <TextInput
                    value={customColorValue}
                    onChangeText={(value) => setCustomColorValue(formatHexInput(value))}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="#AABBCC"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.hexTextInput}
                    returnKeyType="done"
                  />
                </View>
              </View>
              <Pressable
                onPress={addCustomColorOption}
                disabled={!canAddCustomColor}
                style={[styles.addColorButton, !canAddCustomColor && styles.mutedButton]}
                hitSlop={8}
              >
                <Text style={styles.addColorButtonText}>팔레트에 추가</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isCropVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleCropCancel}
      >
        {cropSourceUri ? (
          <ImageCropScreen imageUri={cropSourceUri} onCancel={handleCropCancel} onDone={handleCropDone} />
        ) : null}
      </Modal>

      <Modal
        visible={isEraserVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={handleEraserCancel}
      >
        {eraserSourceUri ? (
          <ImageEraserScreen
            imageUri={eraserSourceUri}
            onCancel={handleEraserCancel}
            onDone={handleEraserDone}
          />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

async function saveProcessedImage(imageUri: string) {
  const processedImage = await processWardrobeImage(imageUri);

  return saveWardrobeImage(processedImage.uri);
}

type ChoiceChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ChoiceChip({ label, selected, onPress }: ChoiceChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choiceChip, selected && styles.choiceChipSelected]}
      hitSlop={8}
    >
      <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function mergeColorOptions(options: readonly ColorOption[]) {
  const seenLabels = new Set<string>();

  return options.filter((option) => {
    if (seenLabels.has(option.label)) {
      return false;
    }

    seenLabels.add(option.label);
    return true;
  });
}

function formatHexInput(value: string) {
  const hexDigits = value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6).toUpperCase();

  return hexDigits ? `#${hexDigits}` : '#';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerButton: {
    minWidth: 60,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveButton: {
    minWidth: 64,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
  },
  disabledButton: {
    backgroundColor: COLORS.primaryLight,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  previewArea: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  editImageButton: {
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  editImageButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  processingText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  smallLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choiceChip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceChipSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  choiceChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  choiceChipTextSelected: {
    color: COLORS.primary,
  },
  colorChip: {
    minHeight: 44,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customColorPanel: {
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  customColorInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorNameInput: {
    flexGrow: 1,
    flexBasis: 132,
  },
  hexInput: {
    minHeight: 48,
    flexGrow: 1,
    flexBasis: 132,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hexTextInput: {
    flex: 1,
    minHeight: 44,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  addColorButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
  },
  addColorButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  mutedButton: {
    opacity: 0.45,
  },
});
