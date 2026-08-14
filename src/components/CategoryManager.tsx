import { Pencil, Plus } from 'lucide-react-native';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS } from '../../constants/colors';
import type { ClothingCategory } from '../types/clothing';
import { ReorderHandle } from './ReorderHandle';

type CategoryRename = {
  from: ClothingCategory;
  to: ClothingCategory;
};

type CategoryManagerProps = {
  categories: ClothingCategory[];
  onChange: (categories: ClothingCategory[], rename?: CategoryRename) => Promise<void>;
};

const ROW_HEIGHT = 52;

export function CategoryManager({ categories, onChange }: CategoryManagerProps) {
  const [orderedCategories, setOrderedCategories] = useState(categories);
  const [editingCategory, setEditingCategory] = useState<ClothingCategory | null>(null);
  const [draftName, setDraftName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const orderRef = useRef(categories);
  const editorVisible = isAdding || Boolean(editingCategory);

  useEffect(() => {
    if (!editorVisible) {
      orderRef.current = categories;
      setOrderedCategories(categories);
    }
  }, [categories, editorVisible]);

  const beginAdd = () => {
    setEditingCategory(null);
    setDraftName('');
    setIsAdding(true);
  };

  const beginEdit = (category: ClothingCategory) => {
    setEditingCategory(category);
    setDraftName(category);
    setIsAdding(false);
  };

  const closeEditor = () => {
    setEditingCategory(null);
    setIsAdding(false);
    setDraftName('');
  };

  const saveCategory = async () => {
    const nextName = draftName.trim() as ClothingCategory;

    if (!nextName) {
      Alert.alert('카테고리 이름이 필요해북', '이름을 입력해 주세요.');
      return;
    }

    if (
      orderedCategories.some(
        (category) => category === nextName && category !== editingCategory,
      )
    ) {
      Alert.alert('이미 있는 카테고리이어북', '다른 이름을 사용해 주세요.');
      return;
    }

    const nextCategories = editingCategory
      ? orderedCategories.map((category) =>
          category === editingCategory ? nextName : category,
        )
      : [...orderedCategories, nextName];

    setIsSaving(true);

    try {
      await onChange(
        nextCategories,
        editingCategory && editingCategory !== nextName
          ? { from: editingCategory, to: nextName }
          : undefined,
      );
      orderRef.current = nextCategories;
      setOrderedCategories(nextCategories);
      closeEditor();
    } catch (error) {
      Alert.alert(
        '카테고리 저장에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const moveCategory = (category: ClothingCategory, targetIndex: number) => {
    setOrderedCategories((current) => {
      const currentIndex = current.indexOf(category);

      if (currentIndex < 0 || currentIndex === targetIndex) {
        return current;
      }

      const next = [...current];
      next.splice(currentIndex, 1);
      next.splice(targetIndex, 0, category);
      orderRef.current = next;
      return next;
    });
  };

  const persistOrder = async () => {
    try {
      await onChange(orderRef.current);
    } catch (error) {
      setOrderedCategories(categories);
      orderRef.current = categories;
      Alert.alert(
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
        placeholder="카테고리 이름"
        placeholderTextColor={COLORS.textSecondary}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={saveCategory}
      />
      <View style={styles.actions}>
        <Pressable onPress={closeEditor} style={styles.secondaryButton} hitSlop={8}>
          <Text style={styles.secondaryButtonText}>취소</Text>
        </Pressable>
        <Pressable
          onPress={saveCategory}
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
      <View style={styles.categoryList}>
        {orderedCategories.map((category, index) => (
          <Fragment key={category}>
            <View style={styles.categoryRow}>
              <Pressable
                onPress={() => beginEdit(category)}
                style={styles.categoryEditButton}
                hitSlop={8}
              >
                <Text style={styles.categoryName}>{category}</Text>
                <Pencil color={COLORS.textSecondary} size={18} strokeWidth={2} />
              </Pressable>
              <ReorderHandle
                index={index}
                itemCount={orderedCategories.length}
                rowHeight={ROW_HEIGHT}
                disabled={editorVisible}
                onMove={(targetIndex) => moveCategory(category, targetIndex)}
                onDrop={persistOrder}
              />
            </View>
            {editingCategory === category ? renderEditor('카테고리 수정') : null}
          </Fragment>
        ))}
      </View>

      <Pressable onPress={beginAdd} style={styles.addButton} hitSlop={8}>
        <Plus color={COLORS.primary} size={18} strokeWidth={2.4} />
        <Text style={styles.addButtonText}>새 카테고리 추가</Text>
      </Pressable>
      {isAdding ? renderEditor('새 카테고리') : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  categoryList: { gap: 4 },
  categoryRow: {
    minHeight: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryEditButton: {
    flex: 1,
    minHeight: 48,
    paddingLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
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
