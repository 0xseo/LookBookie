import { Pencil, Plus } from 'lucide-react-native';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS } from '../../constants/colors';
import { AppAlert } from './AppDialog';
import { ReorderHandle } from './ReorderHandle';

type FitSizeManagerProps = {
  options: string[];
  onChange: (
    options: string[],
    rename?: { from: string; to: string },
  ) => Promise<void>;
};

const ROW_HEIGHT = 52;

export function FitSizeManager({ options, onChange }: FitSizeManagerProps) {
  const [orderedOptions, setOrderedOptions] = useState(options);
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const orderRef = useRef(options);
  const editorVisible = isAdding || Boolean(editingOption);

  useEffect(() => {
    if (!editorVisible) {
      orderRef.current = options;
      setOrderedOptions(options);
    }
  }, [editorVisible, options]);

  const closeEditor = () => {
    setEditingOption(null);
    setIsAdding(false);
    setDraftName('');
  };

  const saveOption = async () => {
    const nextName = draftName.trim();

    if (!nextName) {
      AppAlert.alert('이름이 필요해북', '핏/사이즈 이름을 입력해 주세요.');
      return;
    }

    if (orderedOptions.some((option) => option === nextName && option !== editingOption)) {
      AppAlert.alert('이미 있는 옵션이어북', '다른 이름을 사용해 주세요.');
      return;
    }

    const nextOptions = editingOption
      ? orderedOptions.map((option) => (option === editingOption ? nextName : option))
      : [...orderedOptions, nextName];

    setIsSaving(true);
    try {
      await onChange(
        nextOptions,
        editingOption && editingOption !== nextName
          ? { from: editingOption, to: nextName }
          : undefined,
      );
      orderRef.current = nextOptions;
      setOrderedOptions(nextOptions);
      closeEditor();
    } catch (error) {
      AppAlert.alert(
        '핏/사이즈를 저장하지 못했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const moveOption = (option: string, targetIndex: number) => {
    setOrderedOptions((current) => {
      const currentIndex = current.indexOf(option);
      if (currentIndex < 0 || currentIndex === targetIndex) return current;

      const next = [...current];
      next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, option);
      orderRef.current = next;
      return next;
    });
  };

  const persistOrder = async () => {
    try {
      await onChange(orderRef.current);
    } catch (error) {
      setOrderedOptions(options);
      orderRef.current = options;
      AppAlert.alert(
        '순서를 저장하지 못했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    }
  };

  const renderEditor = (title: string) => (
    <View style={styles.editor}>
      <Text style={styles.editorTitle}>{title}</Text>
      <TextInput
        value={draftName}
        onChangeText={setDraftName}
        placeholder="예: 세미오버핏"
        placeholderTextColor={COLORS.textSecondary}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={saveOption}
      />
      <View style={styles.actions}>
        <Pressable onPress={closeEditor} style={styles.secondaryButton} hitSlop={8}>
          <Text style={styles.secondaryButtonText}>취소</Text>
        </Pressable>
        <Pressable
          onPress={saveOption}
          disabled={isSaving}
          style={[styles.saveButton, isSaving && styles.disabledButton]}
          hitSlop={8}
        >
          <Text style={styles.saveButtonText}>저장</Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.optionList}>
        {orderedOptions.map((option, index) => (
          <Fragment key={option}>
            <View style={styles.optionRow}>
              <Pressable
                onPress={() => {
                  setEditingOption(option);
                  setDraftName(option);
                  setIsAdding(false);
                }}
                style={styles.optionEditButton}
                hitSlop={8}
              >
                <Text style={styles.optionName}>{option}</Text>
                <Pencil color={COLORS.textSecondary} size={18} strokeWidth={2} />
              </Pressable>
              <ReorderHandle
                index={index}
                itemCount={orderedOptions.length}
                rowHeight={ROW_HEIGHT}
                disabled={editorVisible}
                onMove={(targetIndex) => moveOption(option, targetIndex)}
                onDrop={persistOrder}
              />
            </View>
            {editingOption === option ? renderEditor('핏/사이즈 수정') : null}
          </Fragment>
        ))}
      </View>
      <Pressable
        onPress={() => {
          setEditingOption(null);
          setDraftName('');
          setIsAdding(true);
        }}
        style={styles.addButton}
        hitSlop={8}
      >
        <Plus color={COLORS.primary} size={18} strokeWidth={2.4} />
        <Text style={styles.addButtonText}>새 핏/사이즈 추가</Text>
      </Pressable>
      {isAdding ? renderEditor('새 핏/사이즈') : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  optionList: { gap: 4 },
  optionRow: {
    minHeight: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  optionEditButton: {
    flex: 1,
    minHeight: 48,
    paddingLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionName: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  addButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
  },
  addButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  editor: {
    marginVertical: 4,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 12,
  },
  editorTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
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
  actions: { flexDirection: 'row', gap: 8 },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  saveButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  saveButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.surface },
  disabledButton: { backgroundColor: COLORS.primaryLight },
});
