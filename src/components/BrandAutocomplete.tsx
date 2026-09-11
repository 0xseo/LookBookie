import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS } from '../../constants/colors';

type BrandAutocompleteProps = {
  value: string;
  suggestions: string[];
  onChangeText: (value: string) => void;
};

export function BrandAutocomplete({
  value,
  suggestions,
  onChangeText,
}: BrandAutocompleteProps) {
  const [focused, setFocused] = useState(false);
  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();

    if (!focused || !query) {
      return [];
    }

    return suggestions
      .filter((brand) => brand.toLowerCase().includes(query) && brand !== value.trim())
      .slice(0, 5);
  }, [focused, suggestions, value]);

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 120)}
        placeholder="브랜드명을 입력해 주세요"
        placeholderTextColor={COLORS.textSecondary}
        style={styles.input}
        returnKeyType="done"
      />
      {matches.length > 0 ? (
        <View style={styles.dropdown}>
          {matches.map((brand) => (
            <Pressable
              key={brand}
              onPress={() => {
                onChangeText(brand);
                setFocused(false);
              }}
              style={styles.option}
              hitSlop={4}
            >
              <Text style={styles.optionText}>{brand}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdown: {
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  option: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  optionText: { fontSize: 14, color: COLORS.textPrimary },
});
