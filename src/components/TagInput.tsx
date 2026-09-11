import { Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS } from '../../constants/colors';
import { AppAlert } from './AppDialog';

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

export function TagInput({ tags, onChange, placeholder = '태그 입력' }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const nextTag = draft.trim().replace(/^#/, '');

    if (!nextTag) {
      return;
    }

    if (nextTag.length > 20) {
      AppAlert.alert('태그가 너무 길어북', '태그는 20자 이내로 입력해 주세요.');
      return;
    }

    if (tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      setDraft('');
      return;
    }

    if (tags.length >= 12) {
      AppAlert.alert('태그가 가득 찼어북', '태그는 최대 12개까지 추가할 수 있어요.');
      return;
    }

    onChange([...tags, nextTag]);
    setDraft('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={addTag}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          returnKeyType="done"
          maxLength={21}
        />
        <Pressable
          onPress={addTag}
          style={styles.addButton}
          accessibilityLabel="태그 추가"
          hitSlop={8}
        >
          <Plus color={COLORS.surface} size={20} strokeWidth={2.6} />
        </Pressable>
      </View>
      {tags.length > 0 ? (
        <View style={styles.tagWrap}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>#{tag}</Text>
              <Pressable
                onPress={() => onChange(tags.filter((value) => value !== tag))}
                accessibilityLabel={`${tag} 태그 삭제`}
                hitSlop={8}
              >
                <X color={COLORS.textSecondary} size={15} strokeWidth={2.4} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  inputRow: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagChip: {
    minHeight: 34,
    paddingLeft: 12,
    paddingRight: 8,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tagText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
});
