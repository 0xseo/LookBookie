import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react-native';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { COLORS } from '../../constants/colors';
import {
  COLOR_FAMILY_OPTIONS,
  getColorFamilyLabel,
  inferColorFamilyFromHex,
} from '../services/colorSearch';
import { COLOR_OPTIONS, type ColorFamily, type ColorOption } from '../types/clothing';
import { AppAlert } from './AppDialog';
import { HsvColorPicker } from './HsvColorPicker';
import { ReorderHandle } from './ReorderHandle';

type ColorPaletteManagerProps = {
  colorOptions: ColorOption[];
  customColorOptions: ColorOption[];
  onChange: (options: ColorOption[]) => Promise<void>;
  onReorder: (labels: string[]) => Promise<void>;
};

const DEFAULT_PICKER_COLOR = '#3A5A40';
const ROW_HEIGHT = 60;

export function ColorPaletteManager({
  colorOptions,
  customColorOptions,
  onChange,
  onReorder,
}: ColorPaletteManagerProps) {
  const [orderedOptions, setOrderedOptions] = useState(colorOptions);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState('');
  const [draftValue, setDraftValue] = useState(DEFAULT_PICKER_COLOR);
  const [draftFamily, setDraftFamily] = useState<ColorFamily>('green');
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const orderRef = useRef(colorOptions);
  const defaultByLabel = useMemo(
    () => new Map<string, ColorOption>(COLOR_OPTIONS.map((option) => [option.label, option])),
    [],
  );
  const editingDefault = editingLabel ? defaultByLabel.get(editingLabel) : undefined;
  const editorVisible = isAdding || Boolean(editingLabel);

  useEffect(() => {
    if (!editorVisible) {
      orderRef.current = colorOptions;
      setOrderedOptions(colorOptions);
    }
  }, [colorOptions, editorVisible]);

  const beginAdd = () => {
    setEditingLabel(null);
    setDraftLabel('');
    setDraftValue(DEFAULT_PICKER_COLOR);
    setDraftFamily('green');
    setIsAdding(true);
  };

  const beginEdit = (option: ColorOption) => {
    setEditingLabel(option.label);
    setDraftLabel(option.label);
    setDraftValue(option.value);
    setDraftFamily(option.family);
    setIsAdding(false);
  };

  const closeEditor = () => {
    setEditingLabel(null);
    setIsAdding(false);
  };

  const updatePickerColor = (value: string) => {
    setDraftValue(value);
    setDraftFamily(inferColorFamilyFromHex(value, draftLabel));
  };

  const saveColor = async () => {
    const label = editingDefault ? editingDefault.label : draftLabel.trim();

    if (!label) {
      AppAlert.alert('색 이름이 필요해북', '새 색의 이름을 입력해 주세요.');
      return;
    }

    if (
      orderedOptions.some((option) => option.label === label && option.label !== editingLabel)
    ) {
      AppAlert.alert('이미 있는 색상이어북', '다른 이름을 사용해 주세요.');
      return;
    }

    const nextOption: ColorOption = {
      label,
      value: draftValue,
      family: draftFamily,
      aliases: editingDefault?.aliases,
    };
    const nextCustomOptions = [
      ...customColorOptions.filter((option) => option.label !== editingLabel),
      nextOption,
    ];
    const nextOrderedOptions = editingLabel
      ? orderedOptions.map((option) => (option.label === editingLabel ? nextOption : option))
      : [...orderedOptions, nextOption];

    setIsSaving(true);

    try {
      await onChange(nextCustomOptions);
      await onReorder(nextOrderedOptions.map((option) => option.label));
      orderRef.current = nextOrderedOptions;
      setOrderedOptions(nextOrderedOptions);
      closeEditor();
    } catch (error) {
      AppAlert.alert(
        '팔레트 저장에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const removeOrResetColor = () => {
    if (!editingLabel) {
      return;
    }

    const isDefault = defaultByLabel.has(editingLabel);

    AppAlert.alert(
      isDefault ? '기본색으로 되돌릴까북?' : '이 색을 삭제할까북?',
      isDefault ? '처음 설정된 색으로 되돌려요.' : '팔레트에서 삭제해요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: isDefault ? '되돌리기' : '삭제',
          style: isDefault ? 'default' : 'destructive',
          onPress: async () => {
            const nextCustomOptions = customColorOptions.filter(
              (option) => option.label !== editingLabel,
            );
            const nextOrderedOptions = isDefault
              ? orderedOptions.map((option) =>
                  option.label === editingLabel
                    ? (defaultByLabel.get(editingLabel) ?? option)
                    : option,
                )
              : orderedOptions.filter((option) => option.label !== editingLabel);

            await onChange(nextCustomOptions);
            await onReorder(nextOrderedOptions.map((option) => option.label));
            orderRef.current = nextOrderedOptions;
            setOrderedOptions(nextOrderedOptions);
            closeEditor();
          },
        },
      ],
    );
  };

  const moveColor = (label: string, targetIndex: number) => {
    setOrderedOptions((current) => {
      const currentIndex = current.findIndex((option) => option.label === label);

      if (currentIndex < 0 || currentIndex === targetIndex) {
        return current;
      }

      const next = [...current];
      const [moved] = next.splice(currentIndex, 1);

      if (!moved) {
        return current;
      }

      next.splice(targetIndex, 0, moved);
      orderRef.current = next;
      return next;
    });
  };

  const persistOrder = async () => {
    try {
      await onReorder(orderRef.current.map((option) => option.label));
    } catch (error) {
      setOrderedOptions(colorOptions);
      orderRef.current = colorOptions;
      AppAlert.alert(
        '순서를 저장하지 못했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    }
  };

  const renderEditor = (title: string) => (
    <View style={styles.editor}>
      <Text style={styles.editorTitle}>{title}</Text>
      {editingDefault ? (
        <Text style={styles.fixedName}>{editingDefault.label}</Text>
      ) : (
        <TextInput
          value={draftLabel}
          onChangeText={setDraftLabel}
          placeholder="색 이름"
          placeholderTextColor={COLORS.textSecondary}
          style={styles.input}
          returnKeyType="done"
        />
      )}

      <HsvColorPicker value={draftValue} onChange={updatePickerColor} />

      <View style={styles.familyWrap}>
        {COLOR_FAMILY_OPTIONS.map((option) => {
          const selected = draftFamily === option.family;

          return (
            <Pressable
              key={option.family}
              onPress={() => setDraftFamily(option.family)}
              style={[styles.familyChip, selected && styles.familyChipSelected]}
              hitSlop={8}
            >
              <Text style={[styles.familyText, selected && styles.familyTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.editorActions}>
        {editingLabel ? (
          <Pressable onPress={removeOrResetColor} style={styles.iconAction} hitSlop={8}>
            {editingDefault ? (
              <RotateCcw color={COLORS.textSecondary} size={20} strokeWidth={2} />
            ) : (
              <Trash2 color={COLORS.danger} size={20} strokeWidth={2} />
            )}
          </Pressable>
        ) : null}
        <Pressable onPress={closeEditor} style={styles.secondaryButton} hitSlop={8}>
          <Text style={styles.secondaryButtonText}>취소</Text>
        </Pressable>
        <Pressable
          onPress={saveColor}
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
      <View style={styles.paletteList}>
        {orderedOptions.map((option, index) => {
          const overridden = customColorOptions.some((saved) => saved.label === option.label);

          return (
            <Fragment key={option.label}>
              <View style={styles.paletteRow}>
                <Pressable
                  onPress={() => beginEdit(option)}
                  style={styles.paletteEditButton}
                  hitSlop={8}
                >
                  <View style={[styles.swatch, { backgroundColor: option.value }]} />
                  <View style={styles.paletteTextGroup}>
                    <Text style={styles.paletteName}>{option.label}</Text>
                    <Text style={styles.paletteMeta}>
                      {getColorFamilyLabel(option.family)} · {option.value}
                      {overridden && defaultByLabel.has(option.label) ? ' · 수정됨' : ''}
                    </Text>
                  </View>
                  <Pencil color={COLORS.textSecondary} size={18} strokeWidth={2} />
                </Pressable>
                <ReorderHandle
                  index={index}
                  itemCount={orderedOptions.length}
                  rowHeight={ROW_HEIGHT}
                  disabled={editorVisible}
                  onMove={(targetIndex) => moveColor(option.label, targetIndex)}
                  onDrop={persistOrder}
                />
              </View>
              {editingLabel === option.label
                ? renderEditor(`${editingLabel} 수정`)
                : null}
            </Fragment>
          );
        })}
      </View>

      <Pressable onPress={beginAdd} style={styles.addButton} hitSlop={8}>
        <Plus color={COLORS.primary} size={18} strokeWidth={2.4} />
        <Text style={styles.addButtonText}>새 색 추가</Text>
      </Pressable>
      {isAdding ? renderEditor('새 색 추가') : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  paletteList: { gap: 4 },
  paletteRow: {
    minHeight: ROW_HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paletteEditButton: {
    flex: 1,
    minHeight: 56,
    paddingLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paletteTextGroup: { flex: 1 },
  paletteName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  paletteMeta: { marginTop: 2, fontSize: 11, color: COLORS.textSecondary },
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
  fixedName: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlignVertical: 'center',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
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
  familyWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
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
  familyChipSelected: { borderColor: COLORS.primaryLight, backgroundColor: COLORS.secondary },
  familyText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  familyTextSelected: { color: COLORS.primary },
  editorActions: { flexDirection: 'row', gap: 8 },
  iconAction: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
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
