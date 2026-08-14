import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors';
import { cropWardrobeImage, type CropMode } from '../storage/imageStorage';

type ImageCropScreenProps = {
  imageUri: string;
  onCancel: () => void;
  onDone: (croppedImageUri: string) => void;
};

const CROP_OPTIONS: Array<{ label: string; mode: CropMode }> = [
  { label: '원본', mode: 'original' },
  { label: '1:1', mode: 'square' },
  { label: '4:5', mode: 'portrait45' },
  { label: '3:4', mode: 'portrait34' },
];

export function ImageCropScreen({ imageUri, onCancel, onDone }: ImageCropScreenProps) {
  const { width, height } = useWindowDimensions();
  const [selectedMode, setSelectedMode] = useState<CropMode>('original');
  const [isCropping, setIsCropping] = useState(false);
  const selectedRatio = selectedMode === 'original' ? null : getCropRatio(selectedMode);
  const cropFrameWidth = selectedRatio
    ? Math.min(width - 32, Math.max(160, (height - 220) * selectedRatio))
    : width - 32;

  const applyCrop = async () => {
    setIsCropping(true);

    try {
      const croppedImage = await cropWardrobeImage(imageUri, selectedMode);
      onDone(croppedImage.uri);
    } catch (error) {
      Alert.alert(
        '이미지 자르기에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsCropping(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.headerButton} hitSlop={8}>
          <Text style={styles.headerButtonText}>취소</Text>
        </Pressable>
        <Text style={styles.title}>이미지 자르기</Text>
        <Pressable
          onPress={applyCrop}
          disabled={isCropping}
          style={[styles.saveButton, isCropping && styles.disabledButton]}
          hitSlop={8}
        >
          {isCropping ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <Text style={styles.saveButtonText}>다음</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.previewStage}>
        {selectedMode === 'original' ? (
          <Image source={{ uri: imageUri }} style={styles.originalPreview} />
        ) : (
          <View style={[styles.cropFrame, { width: cropFrameWidth, aspectRatio: selectedRatio ?? 1 }]}>
            <Image source={{ uri: imageUri }} style={styles.cropPreview} />
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.optionRow}>
          {CROP_OPTIONS.map((option) => {
            const selected = selectedMode === option.mode;

            return (
              <Pressable
                key={option.mode}
                onPress={() => setSelectedMode(option.mode)}
                style={[styles.optionButton, selected && styles.optionButtonSelected]}
                hitSlop={8}
              >
                <Text style={[styles.optionButtonText, selected && styles.optionButtonTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

function getCropRatio(mode: CropMode) {
  if (mode === 'square') {
    return 1;
  }

  if (mode === 'portrait45') {
    return 4 / 5;
  }

  return 3 / 4;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  previewStage: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  originalPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  cropFrame: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cropPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  controls: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  optionButtonSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  optionButtonTextSelected: {
    color: COLORS.primary,
  },
});
