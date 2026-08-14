import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors';
import { ColorPalettePicker } from '../components/ColorPalettePicker';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { RepresentativeColorExtractor } from '../components/RepresentativeColorExtractor';
import { ImageCropScreen } from './ImageCropScreen';
import { ImageEraserScreen } from './ImageEraserScreen';
import { processWardrobeImage, saveWardrobeImage } from '../storage/imageStorage';
import { insertClothingItem } from '../storage/database';
import { syncClothingItemToCloud } from '../services/wardrobeCloud';
import { useColorPaletteOptions } from '../hooks/useColorPaletteOptions';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import {
  COLOR_OPTIONS,
  SEASONS,
  type ClothingCategory,
  type ClothingColor,
  type ColorFamily,
  type ColorOption,
  type Season,
} from '../types/clothing';

type AddItemScreenProps = {
  onCancel: () => void;
  onSaved: () => void;
};

export type AddItemScreenHandle = {
  requestCancel: () => void;
};

export const AddItemScreen = forwardRef<AddItemScreenHandle, AddItemScreenProps>(
  function AddItemScreen({ onCancel, onSaved }, ref) {
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);
    const [eraserSourceUri, setEraserSourceUri] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [brand, setBrand] = useState('');
    const [category, setCategory] = useState<ClothingCategory>('상의');
    const [seasons, setSeasons] = useState<Season[]>([]);
    const [color, setColor] = useState<ClothingColor>('블랙');
    const [colorValue, setColorValue] = useState<string>(COLOR_OPTIONS[0].value);
    const [colorFamily, setColorFamily] = useState<ColorFamily>(COLOR_OPTIONS[0].family);
    const [suggestedColorOption, setSuggestedColorOption] = useState<ColorOption | null>(null);
    const [extractedColorHex, setExtractedColorHex] = useState<string | null>(null);
    const [colorTouched, setColorTouched] = useState(false);
    const [processingMessage, setProcessingMessage] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isCropVisible, setIsCropVisible] = useState(false);
    const [isEraserVisible, setIsEraserVisible] = useState(false);
    const [isCancelConfirmVisible, setIsCancelConfirmVisible] = useState(false);
    const { colorOptions } = useColorPaletteOptions();
    const { categoryOptions } = useCategoryOptions();
    const keyboardHeight = useKeyboardHeight();

    const hasDraft =
      Boolean(imageUri || cropSourceUri || eraserSourceUri || brand.trim()) ||
      name.trim().length > 0 ||
      seasons.length > 0 ||
      category !== categoryOptions[0] ||
      color !== '블랙';

    useEffect(() => {
      if (!categoryOptions.includes(category) && categoryOptions[0]) {
        setCategory(categoryOptions[0]);
      }
    }, [category, categoryOptions]);

    const selectColorOption = (nextColor: ClothingColor, option: ColorOption) => {
      setColor(nextColor);
      setColorValue(option.value);
      setColorFamily(option.family);
      setColorTouched(true);
    };

    const requestCancel = useCallback(() => {
      if (isSaving) {
        return;
      }

      if (!hasDraft) {
        onCancel();
        return;
      }

      setIsCancelConfirmVisible(true);
    }, [hasDraft, isSaving, onCancel]);

    useImperativeHandle(ref, () => ({ requestCancel }), [requestCancel]);

    useEffect(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (isCancelConfirmVisible) {
          setIsCancelConfirmVisible(false);
          return true;
        }

        requestCancel();
        return true;
      });

      return () => subscription.remove();
    }, [isCancelConfirmVisible, requestCancel]);

    const startImagePipeline = (uri: string) => {
      setCropSourceUri(uri);
      setIsCropVisible(true);
      setProcessingMessage(null);
    };

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
        startImagePipeline(result.assets[0].uri);
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
        startImagePipeline(result.assets[0].uri);
      }
    };

    const openImageEditor = () => {
      if (!imageUri) {
        Alert.alert('사진이 필요해북', '수정할 옷 사진을 먼저 선택해 주세요.');
        return;
      }

      startImagePipeline(imageUri);
    };

    const handleCropCancel = () => {
      setIsCropVisible(false);
      setCropSourceUri(null);
    };

    const handleCropDone = (croppedImageUri: string) => {
      setIsCropVisible(false);
      setCropSourceUri(null);
      setEraserSourceUri(croppedImageUri);
      setIsEraserVisible(true);
    };

    const handleEraserCancel = () => {
      if (!imageUri && eraserSourceUri) {
        setImageUri(eraserSourceUri);
      }

      setIsEraserVisible(false);
      setEraserSourceUri(null);
      setProcessingMessage(null);
    };

    const handleEraserDone = (editedImageUri: string) => {
      setImageUri(editedImageUri);
      setIsEraserVisible(false);
      setEraserSourceUri(null);
      setSuggestedColorOption(null);
      setExtractedColorHex(null);
      setProcessingMessage('이미지 수정이 완료됐어북. 대표색을 살펴보고 있어북...');
    };

    const handleColorExtracted = (option: ColorOption, sourceHex: string) => {
      setSuggestedColorOption(option);
      setExtractedColorHex(sourceHex);
      setProcessingMessage(`대표색을 ${option.label}로 추천했어북`);

      if (!colorTouched) {
        setColor(option.label);
        setColorValue(option.value);
        setColorFamily(option.family);
      }
    };

    const applySuggestedColor = () => {
      if (!suggestedColorOption) {
        return;
      }

      selectColorOption(suggestedColorOption.label, suggestedColorOption);
    };

    const toggleSeason = (season: Season) => {
      setSeasons((current) =>
        current.includes(season)
          ? current.filter((currentSeason) => currentSeason !== season)
          : [...current, season],
      );
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
          name: name.trim(),
          brand: brand.trim(),
          category,
          seasons,
          color,
          colorValue,
          colorFamily,
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <Pressable onPress={requestCancel} style={styles.headerButton} hitSlop={8}>
              <Text style={styles.headerButtonText}>취소</Text>
            </Pressable>
            <Text style={styles.title}>옷 등록</Text>
            <Pressable
              onPress={saveItem}
              style={[styles.headerButton, styles.saveButton, isSaving && styles.disabledButton]}
              disabled={isSaving}
              hitSlop={8}
            >
              <Text style={styles.saveButtonText}>{isSaving ? '저장 중' : '저장'}</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 32 + keyboardHeight },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
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
                <Text style={styles.photoButtonText}>{imageUri ? '이미지 변경' : '갤러리'}</Text>
              </Pressable>
              <Pressable onPress={takePhoto} style={styles.photoButton} hitSlop={8}>
                <Text style={styles.photoButtonText}>{imageUri ? '다시 촬영' : '카메라'}</Text>
              </Pressable>
            </View>

            {imageUri ? (
              <Pressable onPress={openImageEditor} style={styles.editImageButton} hitSlop={8}>
                <Text style={styles.editImageButtonText}>이미지 수정</Text>
              </Pressable>
            ) : null}

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
                {categoryOptions.map((option) => (
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
              <ColorPalettePicker
                selectedColor={color}
                colorOptions={colorOptions}
                onSelectColor={selectColorOption}
                suggestedColorOption={suggestedColorOption}
                extractedColorHex={extractedColorHex}
                onApplySuggestedColor={applySuggestedColor}
              />
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

        <ConfirmDialog
          visible={isCancelConfirmVisible}
          title="등록을 취소할까북?"
          message="입력 중인 옷 정보와 이미지 수정 내용은 저장되지 않아요."
          cancelLabel="계속 입력"
          confirmLabel="등록 취소"
          destructive
          onCancel={() => setIsCancelConfirmVisible(false)}
          onConfirm={() => {
            setIsCancelConfirmVisible(false);
            onCancel();
          }}
        />

        <Modal
          visible={isCropVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={handleCropCancel}
        >
          {cropSourceUri ? (
            <ImageCropScreen
              imageUri={cropSourceUri}
              onCancel={handleCropCancel}
              onDone={handleCropDone}
            />
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

        <RepresentativeColorExtractor
          imageUri={imageUri}
          colorOptions={colorOptions}
          enabled={Boolean(imageUri)}
          onExtracted={handleColorExtracted}
          onError={() => setProcessingMessage(null)}
        />
      </SafeAreaView>
    );
  },
);

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
    gap: 16,
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
  mutedButton: {
    opacity: 0.45,
  },
  bottomSaveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.surface,
  },
});
