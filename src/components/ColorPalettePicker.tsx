import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS } from '../../constants/colors';
import { loadCustomColorOptions, saveCustomColorOptions } from '../storage/colorPalette';
import { COLOR_OPTIONS, type ClothingColor, type ColorOption } from '../types/clothing';

type ColorPalettePickerProps = {
  selectedColor: ClothingColor;
  onSelectColor: (color: ClothingColor) => void;
};

export function ColorPalettePicker({ selectedColor, onSelectColor }: ColorPalettePickerProps) {
  const [customColorOptions, setCustomColorOptions] = useState<ColorOption[]>([]);
  const [customColorLabel, setCustomColorLabel] = useState('');
  const [customColorValue, setCustomColorValue] = useState('#');
  const [editingColorLabel, setEditingColorLabel] = useState<string | null>(null);
  const colorOptions = useMemo(
    () => mergeColorOptions([...COLOR_OPTIONS, ...customColorOptions]),
    [customColorOptions],
  );
  const normalizedCustomColorValue = customColorValue.toUpperCase();
  const canSaveCustomColor = /^#[0-9A-F]{6}$/.test(normalizedCustomColorValue);

  useEffect(() => {
    async function loadPalette() {
      setCustomColorOptions(await loadCustomColorOptions());
    }

    loadPalette();
  }, []);

  const saveCustomColor = async () => {
    const label = customColorLabel.trim() || normalizedCustomColorValue;
    const nextOption = {
      label,
      value: normalizedCustomColorValue,
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
      await saveCustomColorOptions(nextCustomOptions);
      setCustomColorOptions(nextCustomOptions);
      onSelectColor(label);
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

          await saveCustomColorOptions(nextCustomOptions);
          setCustomColorOptions(nextCustomOptions);

          if (selectedColor === option.label) {
            onSelectColor('블랙');
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
  };

  return (
    <View style={styles.container}>
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
                onPress={() => onSelectColor(option.label)}
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
                <Text
                  style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}
                >
                  {option.label}
                </Text>
              </Pressable>
              {custom ? (
                <View style={styles.colorTools}>
                  <Pressable onPress={() => editCustomColor(option)} style={styles.iconButton} hitSlop={8}>
                    <Text style={styles.iconButtonText}>✎</Text>
                  </Pressable>
                  <Pressable onPress={() => deleteCustomColor(option)} style={styles.iconButton} hitSlop={8}>
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
  container: {
    gap: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChipFrame: {
    minHeight: 44,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  colorSelectButton: {
    minHeight: 44,
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
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  colorTools: {
    minHeight: 44,
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
  },
  iconButton: {
    width: 36,
    minHeight: 44,
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
