import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS } from '../../constants/colors';
import {
  COLOR_FAMILY_OPTIONS,
  getColorFamilyLabel,
  inferColorFamilyFromHex,
  mergeColorOptions,
  normalizeHex,
} from '../services/colorSearch';
import {
  COLOR_OPTIONS,
  type ClothingColor,
  type ColorFamily,
  type ColorOption,
} from '../types/clothing';

type ColorPalettePickerProps = {
  selectedColor: ClothingColor;
  customColorOptions: ColorOption[];
  onCustomColorOptionsChange: (options: ColorOption[]) => Promise<void>;
  onSelectColor: (color: ClothingColor, option: ColorOption) => void;
  suggestedColorOption?: ColorOption | null;
  extractedColorHex?: string | null;
  onApplySuggestedColor?: () => void;
};

export function ColorPalettePicker({
  selectedColor,
  customColorOptions,
  onCustomColorOptionsChange,
  onSelectColor,
  suggestedColorOption,
  extractedColorHex,
  onApplySuggestedColor,
}: ColorPalettePickerProps) {
  const [customColorLabel, setCustomColorLabel] = useState('');
  const [customColorValue, setCustomColorValue] = useState('#');
  const [customColorFamily, setCustomColorFamily] = useState<ColorFamily>('black');
  const [editingColorLabel, setEditingColorLabel] = useState<string | null>(null);
  const colorOptions = mergeColorOptions([...COLOR_OPTIONS, ...customColorOptions]);
  const normalizedCustomColorValue = customColorValue.toUpperCase();
  const normalizedHex = normalizeHex(normalizedCustomColorValue);
  const canSaveCustomColor = Boolean(normalizedHex);

  const saveCustomColor = async () => {
    const label = customColorLabel.trim() || normalizedCustomColorValue;
    const nextOption: ColorOption = {
      label,
      value: normalizedHex ?? normalizedCustomColorValue,
      family: customColorFamily,
    };

    if (!canSaveCustomColor) {
      Alert.alert('색상값을 확인해북', '#RRGGBB 형식으로 입력해 주세요.');
      return;
    }

    if (!editingColorLabel && colorOptions.some((option) => option.label === label)) {
      Alert.alert('이미 있는 색상이어북', '다른 이름으로 추가해 주세요.');
      return;
    }

    if (
      editingColorLabel &&
      colorOptions.some((option) => option.label === label && option.label !== editingColorLabel)
    ) {
      Alert.alert('이미 있는 색상이어북', '다른 이름으로 수정해 주세요.');
      return;
    }

    const nextCustomOptions = editingColorLabel
      ? customColorOptions.map((option) =>
          option.label === editingColorLabel ? nextOption : option,
        )
      : [...customColorOptions, nextOption];

    try {
      await onCustomColorOptionsChange(nextCustomOptions);
      onSelectColor(label, nextOption);
      resetForm();
    } catch (error) {
      Alert.alert(
        '색상 저장에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    }
  };

  const editCustomColor = (option: ColorOption) => {
    setEditingColorLabel(option.label);
    setCustomColorLabel(option.label);
    setCustomColorValue(option.value);
    setCustomColorFamily(option.family);
  };

  const deleteCustomColor = (option: ColorOption) => {
    Alert.alert('색상을 지울까북?', `${option.label} 색상 태그를 팔레트에서 삭제해요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          const nextCustomOptions = customColorOptions.filter(
            (customOption) => customOption.label !== option.label,
          );

          await onCustomColorOptionsChange(nextCustomOptions);

          if (selectedColor === option.label) {
            onSelectColor(COLOR_OPTIONS[0].label, COLOR_OPTIONS[0]);
          }

          if (editingColorLabel === option.label) {
            resetForm();
          }
        },
      },
    ]);
  };

  const resetForm = () => {
    setEditingColorLabel(null);
    setCustomColorLabel('');
    setCustomColorValue('#');
    setCustomColorFamily('black');
  };

  const updateHexInput = (value: string) => {
    const nextValue = formatHexInput(value);
    const nextHex = normalizeHex(nextValue);

    setCustomColorValue(nextValue);

    if (!editingColorLabel && nextHex) {
      setCustomColorFamily(inferColorFamilyFromHex(nextHex, customColorLabel));
    }
  };

  return (
    <View style={styles.container}>
      {suggestedColorOption ? (
        <View style={styles.suggestionCard}>
          <View
            style={[
              styles.colorSwatch,
              {
                backgroundColor: suggestedColorOption.value,
                borderColor:
                  suggestedColorOption.value === '#FFFFFF' ? COLORS.border : suggestedColorOption.value,
              },
            ]}
          />
          <View style={styles.suggestionTextGroup}>
            <Text style={styles.suggestionTitle}>자동 추천 {suggestedColorOption.label}</Text>
            <Text style={styles.suggestionCaption}>
              {getColorFamilyLabel(suggestedColorOption.family)} 계열
              {extractedColorHex ? ` · ${extractedColorHex}` : ''}
            </Text>
          </View>
          <Pressable onPress={onApplySuggestedColor} style={styles.suggestionButton} hitSlop={8}>
            <Text style={styles.suggestionButtonText}>적용</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.chipWrap}>
        {colorOptions.map((option) => {
          const selected = selectedColor === option.label;
          const custom = customColorOptions.some(
            (customOption) => customOption.label === option.label,
          );

          return (
            <View
              key={`${option.label}-${option.value}`}
              style={[styles.colorChipFrame, selected && styles.choiceChipSelected]}
            >
              <Pressable
                onPress={() => onSelectColor(option.label, option)}
                style={styles.colorSelectButton}
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
                <View>
                  <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.familyText}>{getColorFamilyLabel(option.family)}</Text>
                </View>
              </Pressable>
              {custom ? (
                <View style={styles.colorTools}>
                  <Pressable
                    onPress={() => editCustomColor(option)}
                    style={styles.iconButton}
                    hitSlop={8}
                  >
                    <Text style={styles.iconButtonText}>✎</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => deleteCustomColor(option)}
                    style={styles.iconButton}
                    hitSlop={8}
                  >
                    <Text style={styles.iconButtonText}>×</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.customColorPanel}>
        <Text style={styles.smallLabel}>{editingColorLabel ? '색 수정' : '내 색 추가'}</Text>
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
                  backgroundColor: canSaveCustomColor
                    ? normalizedCustomColorValue
                    : COLORS.surface,
                },
              ]}
            />
            <TextInput
              value={customColorValue}
              onChangeText={updateHexInput}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="#AABBCC"
              placeholderTextColor={COLORS.textSecondary}
              style={styles.hexTextInput}
              returnKeyType="done"
            />
          </View>
        </View>

        <View style={styles.familyPicker}>
          <Text style={styles.smallCaption}>검색 그룹</Text>
          <View style={styles.familyChipWrap}>
            {COLOR_FAMILY_OPTIONS.map((option) => {
              const selected = customColorFamily === option.family;

              return (
                <Pressable
                  key={option.family}
                  onPress={() => setCustomColorFamily(option.family)}
                  style={[styles.familyChip, selected && styles.familyChipSelected]}
                  hitSlop={8}
                >
                  <Text style={[styles.familyChipText, selected && styles.familyChipTextSelected]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.customColorActions}>
          {editingColorLabel ? (
            <Pressable onPress={resetForm} style={styles.secondaryButton} hitSlop={8}>
              <Text style={styles.secondaryButtonText}>취소</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={saveCustomColor}
            disabled={!canSaveCustomColor}
            style={[styles.addColorButton, !canSaveCustomColor && styles.mutedButton]}
            hitSlop={8}
          >
            <Text style={styles.addColorButtonText}>
              {editingColorLabel ? '수정 저장' : '팔레트에 추가'}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function formatHexInput(value: string) {
  const hexDigits = value.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6).toUpperCase();

  return hexDigits ? `#${hexDigits}` : '#';
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  suggestionCard: {
    minHeight: 56,
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionTextGroup: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  suggestionCaption: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  suggestionButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  suggestionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.surface,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChipFrame: {
    minHeight: 48,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  colorSelectButton: {
    minHeight: 48,
    paddingLeft: 8,
    paddingRight: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  familyText: {
    marginTop: 1,
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  colorTools: {
    minHeight: 48,
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  iconButton: {
    width: 36,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
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
  smallLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  smallCaption: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  customColorInputs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  familyPicker: {
    gap: 6,
  },
  familyChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  familyChip: {
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  familyChipSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  familyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  familyChipTextSelected: {
    color: COLORS.primary,
  },
  customColorActions: {
    flexDirection: 'row',
    gap: 8,
  },
  addColorButton: {
    flex: 1,
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
  secondaryButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  mutedButton: {
    opacity: 0.45,
  },
});
