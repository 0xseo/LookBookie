import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors';
import { cropWardrobeImageToRect, type CropMode, type CropRect } from '../storage/imageStorage';

type ImageCropScreenProps = {
  imageUri: string;
  onCancel: () => void;
  onDone: (croppedImageUri: string) => void;
};

type ImageSize = {
  width: number;
  height: number;
};

const CROP_OPTIONS: Array<{ label: string; mode: CropMode }> = [
  { label: '원본', mode: 'original' },
  { label: '1:1', mode: 'square' },
  { label: '4:5', mode: 'portrait45' },
  { label: '3:4', mode: 'portrait34' },
];

export function ImageCropScreen({ imageUri, onCancel, onDone }: ImageCropScreenProps) {
  const { width, height } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragStart = useRef({ x: 0, y: 0 });
  const latestPan = useRef({ x: 0, y: 0 });
  const [selectedMode, setSelectedMode] = useState<CropMode>('original');
  const [imageSize, setImageSize] = useState<ImageSize | null>(null);
  const [zoom, setZoom] = useState(1);
  const [isCropping, setIsCropping] = useState(false);
  const selectedRatio = getCropRatio(selectedMode, imageSize);
  const cropFrame = useMemo(() => {
    const maxWidth = width - 32;
    const maxHeight = height - 248;
    let frameWidth = maxWidth;
    let frameHeight = frameWidth / selectedRatio;

    if (frameHeight > maxHeight) {
      frameHeight = maxHeight;
      frameWidth = frameHeight * selectedRatio;
    }

    return {
      width: Math.max(160, frameWidth),
      height: Math.max(160, frameHeight),
    };
  }, [height, selectedRatio, width]);
  const baseScale = imageSize
    ? Math.max(cropFrame.width / imageSize.width, cropFrame.height / imageSize.height)
    : 1;
  const displaySize = imageSize
    ? {
        width: imageSize.width * baseScale * zoom,
        height: imageSize.height * baseScale * zoom,
      }
    : { width: cropFrame.width, height: cropFrame.height };

  useEffect(() => {
    Image.getSize(
      imageUri,
      (imageWidth, imageHeight) => {
        setImageSize({ width: imageWidth, height: imageHeight });
        latestPan.current = { x: 0, y: 0 };
        pan.setValue({ x: 0, y: 0 });
      },
      () => {
        Alert.alert('이미지를 읽지 못했어북', '크롭할 이미지 정보를 불러오지 못했어요.');
      },
    );
  }, [imageUri, pan]);

  useEffect(() => {
    latestPan.current = constrainPan(latestPan.current, cropFrame, displaySize);
    pan.setValue(latestPan.current);
  }, [cropFrame.height, cropFrame.width, displaySize.height, displaySize.width, pan, selectedMode, zoom]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          dragStart.current = latestPan.current;
        },
        onPanResponderMove: (_, gesture) => {
          const nextPan = constrainPan(
            {
              x: dragStart.current.x + gesture.dx,
              y: dragStart.current.y + gesture.dy,
            },
            cropFrame,
            displaySize,
          );

          latestPan.current = nextPan;
          pan.setValue(nextPan);
        },
        onPanResponderRelease: (_, gesture) => {
          const nextPan = constrainPan(
            {
              x: dragStart.current.x + gesture.dx,
              y: dragStart.current.y + gesture.dy,
            },
            cropFrame,
            displaySize,
          );

          latestPan.current = nextPan;
          pan.setValue(nextPan);
        },
      }),
    [cropFrame, displaySize, pan],
  );

  const updateZoom = (nextZoom: number) => {
    setZoom(nextZoom);
  };

  const applyCrop = async () => {
    if (!imageSize) {
      return;
    }

    setIsCropping(true);

    try {
      const cropRect = getCropRect({
        imageSize,
        cropFrame,
        displaySize,
        pan: latestPan.current,
        baseScale,
        zoom,
      });
      const croppedImage = await cropWardrobeImageToRect(imageUri, cropRect);
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
          disabled={isCropping || !imageSize}
          style={[styles.saveButton, (isCropping || !imageSize) && styles.disabledButton]}
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
        {imageSize ? (
          <View
            style={[
              styles.cropFrame,
              {
                width: cropFrame.width,
                height: cropFrame.height,
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Animated.Image
              source={{ uri: imageUri }}
              style={[
                styles.cropPreview,
                {
                  width: displaySize.width,
                  height: displaySize.height,
                  left: (cropFrame.width - displaySize.width) / 2,
                  top: (cropFrame.height - displaySize.height) / 2,
                  transform: [{ translateX: pan.x }, { translateY: pan.y }],
                },
              ]}
            />
            <View pointerEvents="none" style={styles.cropGuide} />
          </View>
        ) : (
          <ActivityIndicator color={COLORS.primary} />
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.optionRow}>
          {CROP_OPTIONS.map((option) => {
            const selected = selectedMode === option.mode;

            return (
              <Pressable
                key={option.mode}
                onPress={() => {
                  setSelectedMode(option.mode);
                  latestPan.current = { x: 0, y: 0 };
                  pan.setValue({ x: 0, y: 0 });
                }}
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
        <View style={styles.zoomRow}>
          <Text style={styles.zoomLabel}>줌</Text>
          <Slider
            style={styles.zoomSlider}
            value={zoom}
            minimumValue={1}
            maximumValue={3}
            step={0.01}
            onValueChange={updateZoom}
            minimumTrackTintColor={COLORS.primary}
            maximumTrackTintColor={COLORS.border}
            thumbTintColor={COLORS.accent}
          />
          <Text style={styles.zoomValue}>{Math.round(zoom * 100)}%</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function getCropRatio(mode: CropMode, imageSize: ImageSize | null) {
  if (mode === 'square') {
    return 1;
  }

  if (mode === 'portrait45') {
    return 4 / 5;
  }

  if (mode === 'portrait34') {
    return 3 / 4;
  }

  return imageSize ? imageSize.width / imageSize.height : 1;
}

function constrainPan(
  pan: { x: number; y: number },
  cropFrame: ImageSize,
  displaySize: ImageSize,
) {
  const maxX = Math.max(0, (displaySize.width - cropFrame.width) / 2);
  const maxY = Math.max(0, (displaySize.height - cropFrame.height) / 2);

  return {
    x: clamp(pan.x, -maxX, maxX),
    y: clamp(pan.y, -maxY, maxY),
  };
}

function getCropRect({
  imageSize,
  cropFrame,
  displaySize,
  pan,
  baseScale,
  zoom,
}: {
  imageSize: ImageSize;
  cropFrame: ImageSize;
  displaySize: ImageSize;
  pan: { x: number; y: number };
  baseScale: number;
  zoom: number;
}): CropRect {
  const scale = baseScale * zoom;
  const imageLeft = (cropFrame.width - displaySize.width) / 2 + pan.x;
  const imageTop = (cropFrame.height - displaySize.height) / 2 + pan.y;

  return {
    originX: clamp(-imageLeft / scale, 0, imageSize.width - 1),
    originY: clamp(-imageTop / scale, 0, imageSize.height - 1),
    width: clamp(cropFrame.width / scale, 1, imageSize.width),
    height: clamp(cropFrame.height / scale, 1, imageSize.height),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
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
  cropFrame: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cropPreview: {
    position: 'absolute',
    resizeMode: 'cover',
  },
  cropGuide: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  controls: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 12,
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
  zoomRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  zoomLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  zoomSlider: {
    flex: 1,
  },
  zoomValue: {
    width: 48,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
});
