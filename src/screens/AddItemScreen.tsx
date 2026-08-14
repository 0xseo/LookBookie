import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors';
import { ImageEraserScreen } from './ImageEraserScreen';
import {
  cropWardrobeImage,
  processWardrobeImage,
  saveWardrobeImage,
  type CropMode,
} from '../storage/imageStorage';
import { insertClothingItem } from '../storage/database';
import { syncClothingItemToCloud } from '../services/wardrobeCloud';
import {
  CLOTHING_CATEGORIES,
  COLOR_OPTIONS,
  SEASONS,
  type ClothingCategory,
  type ClothingColor,
  type Season,
} from '../types/clothing';

type AddItemScreenProps = {
  onCancel: () => void;
  onSaved: () => void;
};

export function AddItemScreen({ onCancel, onSaved }: AddItemScreenProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);
  const [imageHistory, setImageHistory] = useState<string[]>([]);
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<ClothingCategory>('상의');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [color, setColor] = useState<ClothingColor>('블랙');
  const [processingMessage, setProcessingMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEraserVisible, setIsEraserVisible] = useState(false);

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('권한이 필요해북', '사진 보관함 접근을 허용해야 옷 사진을 등록할 수 있어요.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      applySelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('권한이 필요해북', '카메라 접근을 허용해야 옷 사진을 촬영할 수 있어요.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      applySelectedImage(result.assets[0].uri);
    }
  };

  const applySelectedImage = (uri: string) => {
    setImageUri(uri);
    setOriginalImageUri(uri);
    setImageHistory([uri]);
    setProcessingMessage(null);
  };

  const toggleSeason = (season: Season) => {
    setSeasons((current) =>
      current.includes(season)
        ? current.filter((currentSeason) => currentSeason !== season)
        : [...current, season],
    );
  };

  const processPreviewImage = async () => {
    if (!imageUri) {
      Alert.alert('사진이 필요해북', '가공할 옷 사진을 먼저 선택해 주세요.');
      return;
    }

    setIsSaving(true);
    setProcessingMessage('이미지를 가볍게 정리하고 있어북...');

    try {
      const processedImage = await processWardrobeImage(imageUri);

      setImageUri(processedImage.uri);
      setImageHistory((current) => [...current, processedImage.uri]);
      setProcessingMessage('로컬 이미지 정리가 완료됐어북');
    } catch (error) {
      Alert.alert(
        '이미지 가공에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
      setProcessingMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  const cropPreviewImage = async (mode: CropMode) => {
    if (!imageUri) {
      Alert.alert('사진이 필요해북', '자르기할 옷 사진을 먼저 선택해 주세요.');
      return;
    }

    setIsSaving(true);
    setProcessingMessage('선택한 비율로 이미지를 자르고 있어북...');

    try {
      const processedImage = await cropWardrobeImage(imageUri, mode);

      setImageUri(processedImage.uri);
      setImageHistory((current) => [...current, processedImage.uri]);
      setProcessingMessage('자르기가 적용됐어북');
    } catch (error) {
      Alert.alert(
        '이미지 자르기에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
      setProcessingMessage(null);
    } finally {
      setIsSaving(false);
    }
  };

  const undoImageEdit = () => {
    setImageHistory((current) => {
      if (current.length <= 1) {
        return current;
      }

      const nextHistory = current.slice(0, -1);
      setImageUri(nextHistory[nextHistory.length - 1]);
      setProcessingMessage(null);

      return nextHistory;
    });
  };

  const resetImageEdit = () => {
    if (!originalImageUri) {
      return;
    }

    setImageUri(originalImageUri);
    setImageHistory([originalImageUri]);
    setProcessingMessage(null);
  };

  const applyEraserImage = (editedImageUri: string) => {
    setImageUri(editedImageUri);
    setImageHistory((current) => [...current, editedImageUri]);
    setProcessingMessage('배경 지우기가 적용됐어북');
    setIsEraserVisible(false);
  };

  const saveItem = async () => {
    if (!imageUri) {
      Alert.alert('사진이 필요해북', '등록할 옷 사진을 먼저 선택해 주세요.');
      return;
    }

    setIsSaving(true);

    try {
      setProcessingMessage('옷장에 넣기 전에 이미지를 정리하고 있어북...');
      const processedImage = await processWardrobeImage(imageUri);
      const localImagePath = await saveWardrobeImage(processedImage.uri);
      const clothingItem = {
        localImagePath,
        brand,
        category,
        seasons,
        color,
      };

      await insertClothingItem({
        ...clothingItem,
        ...(await syncClothingItemToCloud(clothingItem)),
      });

      onSaved();
    } catch (error) {
      Alert.alert(
        '저장에 실패했어북',
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
          <Pressable onPress={onCancel} style={styles.headerButton} hitSlop={8}>
            <Text style={styles.headerButtonText}>취소</Text>
          </Pressable>
          <Text style={styles.title}>옷 등록</Text>
          <Pressable
            onPress={saveItem}
            style={[styles.headerButton, styles.saveButton]}
            disabled={isSaving}
            hitSlop={8}
          >
            <Text style={styles.saveButtonText}>{isSaving ? '저장 중' : '저장'}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.previewArea}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.previewPlaceholder}>
                <Text style={styles.previewMascot}>🐢</Text>
                <Text style={styles.previewPlaceholderText}>옷 사진을 골라봐북</Text>
              </View>
            )}
          </View>

          <View style={styles.photoActions}>
            <Pressable onPress={pickFromLibrary} style={styles.photoButton} hitSlop={8}>
              <Text style={styles.photoButtonText}>갤러리</Text>
            </Pressable>
            <Pressable onPress={takePhoto} style={styles.photoButton} hitSlop={8}>
              <Text style={styles.photoButtonText}>카메라</Text>
            </Pressable>
          </View>

          <View style={styles.editPanel}>
            <View style={styles.editPanelHeader}>
              <Text style={styles.label}>이미지 가공</Text>
              {processingMessage ? (
                <Text style={styles.processingText}>{processingMessage}</Text>
              ) : null}
            </View>
            <View style={styles.cropActions}>
              <Pressable onPress={() => cropPreviewImage('original')} style={styles.editButton} hitSlop={8}>
                <Text style={styles.editButtonText}>원본</Text>
              </Pressable>
              <Pressable onPress={() => cropPreviewImage('square')} style={styles.editButton} hitSlop={8}>
                <Text style={styles.editButtonText}>1:1</Text>
              </Pressable>
              <Pressable onPress={() => cropPreviewImage('portrait45')} style={styles.editButton} hitSlop={8}>
                <Text style={styles.editButtonText}>4:5</Text>
              </Pressable>
              <Pressable onPress={() => cropPreviewImage('portrait34')} style={styles.editButton} hitSlop={8}>
                <Text style={styles.editButtonText}>3:4</Text>
              </Pressable>
            </View>
            <View style={styles.editActions}>
              <Pressable
                onPress={() => {
                  if (!imageUri) {
                    Alert.alert('사진이 필요해북', '배경을 지울 옷 사진을 먼저 선택해 주세요.');
                    return;
                  }

                  setIsEraserVisible(true);
                }}
                disabled={isSaving}
                style={styles.editButton}
                hitSlop={8}
              >
                <Text style={styles.editButtonText}>배경 지우기</Text>
              </Pressable>
              <Pressable
                onPress={processPreviewImage}
                disabled={isSaving}
                style={styles.editButton}
                hitSlop={8}
              >
                <Text style={styles.editButtonText}>압축</Text>
              </Pressable>
              <Pressable onPress={undoImageEdit} style={styles.editButton} hitSlop={8}>
                <Text style={styles.editButtonText}>Undo</Text>
              </Pressable>
              <Pressable onPress={resetImageEdit} style={styles.editButton} hitSlop={8}>
                <Text style={styles.editButtonText}>Reset</Text>
              </Pressable>
            </View>
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
              {COLOR_OPTIONS.map((option) => (
                <Pressable
                  key={option.label}
                  onPress={() => setColor(option.label)}
                  style={[
                    styles.colorChip,
                    color === option.label && styles.choiceChipSelected,
                  ]}
                  hitSlop={8}
                >
                  <View
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: option.value,
                        borderColor:
                          option.label === '화이트' ? COLORS.border : option.value,
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
          </View>

          <Pressable
            onPress={saveItem}
            disabled={isSaving}
            style={[styles.bottomSaveButton, isSaving && styles.disabledButton]}
            hitSlop={8}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.surface} />
            ) : (
              <Text style={styles.bottomSaveButtonText}>저장</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={isEraserVisible} animationType="slide" presentationStyle="fullScreen">
        {imageUri ? (
          <ImageEraserScreen
            imageUri={imageUri}
            onCancel={() => setIsEraserVisible(false)}
            onDone={applyEraserImage}
          />
        ) : null}
      </Modal>
    </SafeAreaView>
  );
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
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveButton: {
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 24,
  },
  previewArea: {
    aspectRatio: 1,
    width: '100%',
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
  previewPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bubbleBg,
  },
  previewMascot: {
    fontSize: 56,
    marginBottom: 16,
  },
  previewPlaceholderText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  photoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  photoButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  photoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  editPanel: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  editPanelHeader: {
    gap: 4,
  },
  processingText: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  cropActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editButton: {
    flexGrow: 1,
    flexBasis: '45%',
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  },
  bottomSaveButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.primaryLight,
  },
  bottomSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.surface,
  },
});
