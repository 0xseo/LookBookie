import { ArrowDownAZ, CalendarArrowDown, CalendarArrowUp, Check, Grid2X2, RotateCcw, Search, SlidersHorizontal } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useColorPaletteOptions } from '../hooks/useColorPaletteOptions';
import { EMPTY_FILTERS, isValidDate, type CollectionFilters, type CollectionSort } from '../services/collectionControls';
import { SEASONS } from '../types/clothing';
import { AppAlert } from './AppDialog';
import { AppToast } from './AppToast';

const SORTS = [
  { value: 'createdDesc', label: '최신순', Icon: CalendarArrowDown },
  { value: 'createdAsc', label: '오래된순', Icon: CalendarArrowUp },
  { value: 'nameAsc', label: '이름순', Icon: ArrowDownAZ },
] as const;

const ACTION_SIZE = 40;
const ACTION_GAP = 8;
const ACTION_EDGE = 4;

export function CollectionToolbar({ query, onQueryChange, placeholder, sort, onSortChange, filters, onFiltersChange, title, dates = false, bottomInset = 0, isActive = true, gridColumns, onCycleGridColumns }: {
  query: string; onQueryChange: (value: string) => void; placeholder: string;
  sort: CollectionSort; onSortChange: (value: CollectionSort) => void;
  filters: CollectionFilters; onFiltersChange: (value: CollectionFilters) => void;
  title: string; dates?: boolean; bottomInset?: number; isActive?: boolean;
  gridColumns?: number; onCycleGridColumns?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [toast, setToast] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  const actionsReveal = useRef(new Animated.Value(1)).current;
  const { colorOptions } = useColorPaletteOptions();
  const hasGridControl = gridColumns !== undefined && Boolean(onCycleGridColumns);
  const actionCount = hasGridControl ? 3 : 2;
  const actionsWidth = actionCount * ACTION_SIZE + (actionCount - 1) * ACTION_GAP + ACTION_EDGE;
  const hideActions = isActive && searchFocused && keyboardVisible && !visible;

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  useEffect(() => {
    const animation = Animated.timing(actionsReveal, { toValue: hideActions ? 0 : 1, duration: 180, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [hideActions, actionsReveal]);
  const count = filters.seasons.length + filters.colors.length + Number(Boolean(filters.dateFrom || filters.dateTo));
  const selectedSort = SORTS.find((option) => option.value === sort) ?? SORTS[0];
  const SortIcon = selectedSort.Icon;
  const apply = () => {
    if ((draft.dateFrom && !isValidDate(draft.dateFrom)) || (draft.dateTo && !isValidDate(draft.dateTo)) || (draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo)) {
      AppAlert.alert('날짜를 확인해북', 'YYYY-MM-DD 형식으로 시작일과 종료일을 확인해 주세요.');
      return;
    }
    onFiltersChange(draft);
    setVisible(false);
  };
  return <>
    <View style={styles.toolbar}>
      <View style={styles.search}>
        <Search color={COLORS.textSecondary} size={18} style={styles.searchIcon} />
        <TextInput value={query} onChangeText={onQueryChange} onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)} onSubmitEditing={() => Keyboard.dismiss()} placeholder={placeholder} placeholderTextColor={COLORS.textSecondary} style={styles.input} returnKeyType="search" />
      </View>
      <Animated.View
        style={[styles.actionsViewport, {
          width: actionsReveal.interpolate({ inputRange: [0, 1], outputRange: [0, actionsWidth] }),
          marginLeft: actionsReveal.interpolate({ inputRange: [0, 1], outputRange: [0, ACTION_GAP] }),
        }]}
        pointerEvents={hideActions ? 'none' : 'auto'}
        accessibilityElementsHidden={hideActions}
        importantForAccessibility={hideActions ? 'no-hide-descendants' : 'auto'}
      >
        <Animated.View style={[styles.actionsRow, {
          width: actionsWidth,
          opacity: actionsReveal,
          transform: [{ translateX: actionsReveal.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
        }]}>
      {gridColumns !== undefined && onCycleGridColumns ? <Pressable style={styles.button} hitSlop={8} accessibilityLabel={`한 줄 ${gridColumns}개, 눌러서 사진 크기 변경`} onPress={onCycleGridColumns}>
        <View style={styles.gridIcon}>
          <Grid2X2 size={22} color={COLORS.primary} />
          <Text style={styles.gridCount} allowFontScaling={false}>{gridColumns}</Text>
        </View>
      </Pressable> : null}
      <Pressable style={styles.button} hitSlop={8} accessibilityLabel={`${selectedSort.label} 정렬, 눌러서 변경`} onPress={() => {
        const next = SORTS[(SORTS.findIndex((option) => option.value === sort) + 1) % SORTS.length];
        onSortChange(next.value); setToast(`${next.label}으로 정렬합니다.`);
      }}><SortIcon size={18} color={COLORS.primary} /></Pressable>
      <Pressable style={[styles.button, count > 0 && styles.active]} hitSlop={8} accessibilityLabel={`${title} 필터`} onPress={() => { setDraft(filters); setVisible(true); }}>
        <SlidersHorizontal size={18} color={COLORS.primary} />
        {count > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{count}</Text></View> : null}
      </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
    <Modal visible={isActive && visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
      <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
        <Pressable style={styles.modal} onPress={(event) => event.stopPropagation()}>
          <View style={styles.heading}><Text style={styles.title}>{title} 필터</Text><Pressable style={styles.reset} onPress={() => setDraft(EMPTY_FILTERS)}><RotateCcw size={16} color={COLORS.textSecondary} /><Text style={styles.label}>초기화</Text></Pressable></View>
          <ScrollView contentContainerStyle={styles.fields} keyboardShouldPersistTaps="handled">
            {dates ? <><Text style={styles.label}>입은 날짜</Text><View style={styles.dateRow}><TextInput value={draft.dateFrom} onChangeText={(dateFrom) => setDraft({ ...draft, dateFrom })} placeholder="시작 YYYY-MM-DD" style={styles.dateInput} maxLength={10} /><TextInput value={draft.dateTo} onChangeText={(dateTo) => setDraft({ ...draft, dateTo })} placeholder="종료 YYYY-MM-DD" style={styles.dateInput} maxLength={10} /></View></> : null}
            <Text style={styles.label}>계절</Text><View style={styles.chips}>{SEASONS.map((season) => <Pressable key={season} style={[styles.chip, draft.seasons.includes(season) && styles.active]} onPress={() => setDraft({ ...draft, seasons: draft.seasons.includes(season) ? draft.seasons.filter((value) => value !== season) : [...draft.seasons, season] })}><Text style={styles.label}>{season}</Text></Pressable>)}</View>
            <Text style={styles.label}>색상</Text><View style={styles.chips}>{colorOptions.map((option) => <Pressable key={option.label} accessibilityLabel={option.label} style={[styles.color, draft.colors.includes(option.label) && styles.selectedColor]} onPress={() => setDraft({ ...draft, colors: draft.colors.includes(option.label) ? draft.colors.filter((value) => value !== option.label) : [...draft.colors, option.label] })}><View style={[styles.swatch, { backgroundColor: option.value }]}>{draft.colors.includes(option.label) ? <Check size={16} color={COLORS.primary} /> : null}</View></Pressable>)}</View>
          </ScrollView>
          <Pressable style={styles.apply} onPress={apply}><Text style={styles.applyText}>필터 적용</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
    <AppToast message={toast} bottom={bottomInset + 82} onHidden={() => setToast(null)} />
  </>;
}
const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 4 },
  search: { flex: 1, minWidth: 0, justifyContent: 'center' }, searchIcon: { position: 'absolute', left: 12, zIndex: 1 },
  actionsViewport: { height: ACTION_SIZE + 8, justifyContent: 'center', overflow: 'hidden' },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: ACTION_GAP, paddingRight: ACTION_EDGE },
  input: { minHeight: 40, paddingLeft: 38, paddingRight: 12, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, color: COLORS.textPrimary, fontSize: 14 },
  button: { width: ACTION_SIZE, height: ACTION_SIZE, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center' },
  gridIcon: { width: 22, height: 22 }, gridCount: { position: 'absolute', right: -2, bottom: -2, width: 14, height: 14, borderRadius: 4, backgroundColor: COLORS.surface, fontSize: 11, lineHeight: 14, includeFontPadding: false, textAlign: 'center', fontWeight: '700', color: COLORS.primary },
  active: { borderColor: COLORS.primaryLight, backgroundColor: COLORS.secondary }, badge: { position: 'absolute', right: -4, top: -4, minWidth: 16, height: 16, paddingHorizontal: 4, borderRadius: 8, backgroundColor: COLORS.primary, alignItems: 'center' }, badgeText: { color: COLORS.surface, fontSize: 11, fontWeight: '700' },
  overlay: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: COLORS.overlay },
  modal: { width: '100%', maxWidth: 440, maxHeight: '82%', alignSelf: 'center', padding: 16, gap: 16, borderRadius: 16, backgroundColor: COLORS.surface },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontSize: 18, color: COLORS.textPrimary, fontWeight: '700' }, reset: { flexDirection: 'row', gap: 4, alignItems: 'center', minHeight: 40 },
  fields: { gap: 12 }, label: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { minHeight: 40, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center' }, color: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: COLORS.transparent, alignItems: 'center', justifyContent: 'center' }, selectedColor: { borderColor: COLORS.primary }, swatch: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  dateRow: { flexDirection: 'row', gap: 8 }, dateInput: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 8, color: COLORS.textPrimary, fontSize: 12 }, apply: { minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 12 }, applyText: { color: COLORS.surface, fontWeight: '700' },
});
