import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors';
import {
  COLOR_OPTIONS,
  type ClothingColor,
  type ColorOption,
} from '../types/clothing';

type ColorPalettePickerProps = {
  selectedColor: ClothingColor;
  colorOptions: ColorOption[];
  onSelectColor: (color: ClothingColor, option: ColorOption) => void;
  suggestedColorOption?: ColorOption | null;
  extractedColorHex?: string | null;
  onApplySuggestedColor?: () => void;
};

export function ColorPalettePicker({
  selectedColor,
  colorOptions,
  onSelectColor,
  suggestedColorOption,
  extractedColorHex,
  onApplySuggestedColor,
}: ColorPalettePickerProps) {
  const [paletteExpanded, setPaletteExpanded] = useState(false);
  const defaultLabels = useMemo(
    () => new Set<string>(COLOR_OPTIONS.map((option) => option.label)),
    [],
  );
  const suggestionSelected = Boolean(
    suggestedColorOption && selectedColor === suggestedColorOption.label,
  );
  const paletteCollapsed = Boolean(suggestedColorOption) && !paletteExpanded;

  useEffect(() => {
    setPaletteExpanded(false);
  }, [suggestedColorOption?.label, extractedColorHex]);

  return (
    <View style={styles.container}>
      {suggestedColorOption ? (
        <View style={[styles.suggestionCard, suggestionSelected && styles.suggestionCardSelected]}>
          <View
            style={[
              styles.suggestionSwatch,
              { backgroundColor: suggestedColorOption.value },
            ]}
          />
          <View style={styles.suggestionTextGroup}>
            <Text style={styles.suggestionTitle}>자동 추천 {suggestedColorOption.label}</Text>
            {extractedColorHex ? (
              <Text style={styles.suggestionCaption}>{extractedColorHex}</Text>
            ) : null}
          </View>
          <Pressable
            onPress={onApplySuggestedColor}
            disabled={suggestionSelected}
            style={[
              styles.suggestionButton,
              suggestionSelected && styles.suggestionButtonSelected,
            ]}
            hitSlop={8}
          >
            <Text
              style={[
                styles.suggestionButtonText,
                suggestionSelected && styles.suggestionButtonTextSelected,
              ]}
            >
              {suggestionSelected ? '선택됨' : '선택'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {paletteCollapsed ? (
        <Pressable
          onPress={() => setPaletteExpanded(true)}
          style={styles.expandPaletteButton}
          hitSlop={8}
        >
          <Text style={styles.expandPaletteButtonText}>다른 색 고르기</Text>
        </Pressable>
      ) : (
        <View style={styles.paletteWrap}>
          {colorOptions.map((option) => {
            const selected = selectedColor === option.label;
            const isDefault = defaultLabels.has(option.label);

            return isDefault ? (
              <Pressable
                key={option.label}
                onPress={() => onSelectColor(option.label, option)}
                style={[styles.defaultColorButton, selected && styles.colorButtonSelected]}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                accessibilityState={{ selected }}
                hitSlop={8}
              >
                <View style={[styles.defaultSwatch, { backgroundColor: option.value }]} />
              </Pressable>
            ) : (
              <Pressable
                key={option.label}
                onPress={() => onSelectColor(option.label, option)}
                style={[styles.customColorButton, selected && styles.customColorButtonSelected]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                hitSlop={8}
              >
                <View style={[styles.customSwatch, { backgroundColor: option.value }]} />
                <Text style={[styles.customLabel, selected && styles.customLabelSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
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
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionCardSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  suggestionSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    fontSize: 11,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  suggestionButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  suggestionButtonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  suggestionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  suggestionButtonTextSelected: {
    color: COLORS.surface,
  },
  expandPaletteButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  expandPaletteButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paletteWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  defaultColorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonSelected: {
    borderColor: COLORS.primary,
  },
  defaultSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customColorButton: {
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
  },
  customColorButtonSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  customSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  customLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  customLabelSelected: {
    color: COLORS.primary,
  },
});
