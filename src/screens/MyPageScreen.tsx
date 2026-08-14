import { ChevronLeft, ChevronRight, Palette, Tags } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors';
import { CategoryManager } from '../components/CategoryManager';
import { ColorPaletteManager } from '../components/ColorPaletteManager';
import { useCategoryOptions } from '../hooks/useCategoryOptions';
import { useColorPaletteOptions } from '../hooks/useColorPaletteOptions';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { renameClothingCategory } from '../storage/database';
import type { ClothingCategory } from '../types/clothing';

type SettingsPage = 'main' | 'categories' | 'colors';

type MyPageScreenProps = {
  clothesCount: number;
  outfitsCount: number;
  pendingCloudCount: number;
  isCloudConfigured: boolean;
  cloudEmail: string | null;
  cloudDisplayName: string | null;
  isCloudBusy: boolean;
  isBackupBusy: boolean;
  bottomInset: number;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onUpdateDisplayName: (displayName: string) => Promise<void>;
  onSyncPending: () => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: () => Promise<void>;
  onCategoriesChanged: () => Promise<void>;
};

export function MyPageScreen({
  clothesCount,
  outfitsCount,
  pendingCloudCount,
  isCloudConfigured,
  cloudEmail,
  cloudDisplayName,
  isCloudBusy,
  isBackupBusy,
  bottomInset,
  onSignIn,
  onSignUp,
  onSignOut,
  onUpdateDisplayName,
  onSyncPending,
  onExportBackup,
  onImportBackup,
  onCategoriesChanged,
}: MyPageScreenProps) {
  const [page, setPage] = useState<SettingsPage>('main');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(cloudDisplayName ?? '');
  const [isSavingName, setIsSavingName] = useState(false);
  const keyboardHeight = useKeyboardHeight();
  const {
    colorOptions,
    customColorOptions,
    setColorOptionOrder,
    setCustomColorOptions,
  } = useColorPaletteOptions();
  const { categoryOptions, setCategoryOptions } = useCategoryOptions();

  useEffect(() => {
    setDisplayName(cloudDisplayName ?? '');
  }, [cloudDisplayName]);

  useEffect(() => {
    if (page === 'main') {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setPage('main');
      return true;
    });

    return () => subscription.remove();
  }, [page]);

  const submitAuth = async (mode: 'signIn' | 'signUp') => {
    if (!email.trim() || !password) {
      Alert.alert('입력이 필요해북', '이메일과 비밀번호를 입력해 주세요.');
      return;
    }

    if (mode === 'signIn') {
      await onSignIn(email.trim(), password);
      return;
    }

    await onSignUp(email.trim(), password);
  };

  const saveDisplayName = async () => {
    const nextName = displayName.trim();

    if (!nextName) {
      Alert.alert('이름이 필요해북', '친구에게 표시할 이름을 입력해 주세요.');
      return;
    }

    if (nextName.length > 24) {
      Alert.alert('이름이 너무 길어북', '24자 이내로 입력해 주세요.');
      return;
    }

    setIsSavingName(true);

    try {
      await onUpdateDisplayName(nextName);
      Alert.alert('이름을 저장했어북', '친구 목록에 새 이름이 표시돼요.');
    } finally {
      setIsSavingName(false);
    }
  };

  const updateCategories = async (
    nextCategories: ClothingCategory[],
    rename?: { from: ClothingCategory; to: ClothingCategory },
  ) => {
    if (rename) {
      await renameClothingCategory(rename.from, rename.to);
    }

    try {
      await setCategoryOptions(nextCategories);
    } catch (error) {
      if (rename) {
        await renameClothingCategory(rename.to, rename.from);
      }

      throw error;
    }

    await onCategoriesChanged();
  };

  if (page !== 'main') {
    const isCategoryPage = page === 'categories';

    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.subpageHeader}>
            <Pressable
              onPress={() => setPage('main')}
              style={styles.backButton}
              accessibilityLabel="마이페이지로"
              hitSlop={8}
            >
              <ChevronLeft color={COLORS.textPrimary} size={24} strokeWidth={2.2} />
            </Pressable>
            <View style={styles.subpageTitleGroup}>
              <Text style={styles.title}>
                {isCategoryPage ? '카테고리 관리' : '색상 팔레트'}
              </Text>
              <Text style={styles.caption}>
                {isCategoryPage ? '이름과 표시 순서를 관리해요' : '색과 표시 순서를 관리해요'}
              </Text>
            </View>
          </View>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.subpageContent,
              { paddingBottom: bottomInset + 24 + keyboardHeight },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
            {isCategoryPage ? (
              <CategoryManager categories={categoryOptions} onChange={updateCategories} />
            ) : (
              <ColorPaletteManager
                colorOptions={colorOptions}
                customColorOptions={customColorOptions}
                onChange={setCustomColorOptions}
                onReorder={setColorOptionOrder}
              />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.container,
            { paddingBottom: bottomInset + 24 + keyboardHeight },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets
        >
          <View style={styles.header}>
            <Text style={styles.title}>마이페이지</Text>
            <Text style={styles.caption}>내 옷장과 계정 설정</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{clothesCount}</Text>
              <Text style={styles.statLabel}>등록한 옷</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{outfitsCount}</Text>
              <Text style={styles.statLabel}>저장한 코디</Text>
            </View>
          </View>

          <View style={styles.bubbleRow}>
            <Text style={styles.mascot}>🐢</Text>
            <View style={styles.speechBubble}>
              <Text style={styles.bubbleText}>
                {cloudEmail ? '클라우드 백업 준비됐어북!' : '지금은 오프라인 모드야북!'}
              </Text>
            </View>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.sectionTitle}>클라우드</Text>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>대기 {pendingCloudCount}</Text>
              </View>
            </View>

            {!isCloudConfigured ? (
              <Text style={styles.panelText}>
                `.env`에 Supabase URL과 publishable key를 넣으면 백업을 시작할 수 있어요.
              </Text>
            ) : cloudEmail ? (
              <View style={styles.stack}>
                <Text style={styles.panelText}>{cloudEmail}</Text>
                <View style={styles.nameEditor}>
                  <Text style={styles.fieldLabel}>친구에게 보일 이름</Text>
                  <View style={styles.nameInputRow}>
                    <TextInput
                      value={displayName}
                      onChangeText={setDisplayName}
                      maxLength={24}
                      placeholder="이름"
                      placeholderTextColor={COLORS.textSecondary}
                      style={[styles.input, styles.nameInput]}
                      returnKeyType="done"
                      onSubmitEditing={saveDisplayName}
                    />
                    <Pressable
                      onPress={saveDisplayName}
                      disabled={isSavingName}
                      style={[styles.compactButton, isSavingName && styles.disabledButton]}
                      hitSlop={8}
                    >
                      {isSavingName ? (
                        <ActivityIndicator color={COLORS.surface} />
                      ) : (
                        <Text style={styles.primaryButtonText}>저장</Text>
                      )}
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  onPress={onSyncPending}
                  disabled={isCloudBusy || pendingCloudCount === 0}
                  style={[
                    styles.primaryButton,
                    (isCloudBusy || pendingCloudCount === 0) && styles.disabledButton,
                  ]}
                  hitSlop={8}
                >
                  {isCloudBusy ? (
                    <ActivityIndicator color={COLORS.surface} />
                  ) : (
                    <Text style={styles.primaryButtonText}>대기 항목 동기화</Text>
                  )}
                </Pressable>
                <Pressable onPress={onSignOut} disabled={isCloudBusy} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>로그아웃</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.stack}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="이메일"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="비밀번호"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  style={styles.input}
                />
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => submitAuth('signIn')}
                    disabled={isCloudBusy}
                    style={[styles.primaryButton, isCloudBusy && styles.disabledButton]}
                    hitSlop={8}
                  >
                    <Text style={styles.primaryButtonText}>로그인</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => submitAuth('signUp')}
                    disabled={isCloudBusy}
                    style={styles.secondaryButton}
                    hitSlop={8}
                  >
                    <Text style={styles.secondaryButtonText}>가입</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>개인 설정</Text>
            <SettingsRow
              title="카테고리 관리"
              caption={`${categoryOptions.length}개 · 이름 및 순서`}
              Icon={Tags}
              onPress={() => setPage('categories')}
            />
            <SettingsRow
              title="색상 팔레트"
              caption={`${colorOptions.length}개 · 색상 및 순서`}
              Icon={Palette}
              onPress={() => setPage('colors')}
            />
          </View>

          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>백업</Text>
            <Text style={styles.panelText}>옷과 코디의 텍스트 데이터를 JSON 파일로 관리해요.</Text>
            <View style={styles.actions}>
              <Pressable
                onPress={onExportBackup}
                disabled={isBackupBusy}
                style={[styles.primaryButton, isBackupBusy && styles.disabledButton]}
                hitSlop={8}
              >
                <Text style={styles.primaryButtonText}>Export</Text>
              </Pressable>
              <Pressable
                onPress={onImportBackup}
                disabled={isBackupBusy}
                style={styles.secondaryButton}
                hitSlop={8}
              >
                <Text style={styles.secondaryButtonText}>Import</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type SettingsRowProps = {
  title: string;
  caption: string;
  Icon: typeof Tags;
  onPress: () => void;
};

function SettingsRow({ title, caption, Icon, onPress }: SettingsRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.settingsRow} hitSlop={8}>
      <View style={styles.settingsIcon}>
        <Icon color={COLORS.primary} size={20} strokeWidth={2.2} />
      </View>
      <View style={styles.settingsTextGroup}>
        <Text style={styles.settingsTitle}>{title}</Text>
        <Text style={styles.settingsCaption}>{caption}</Text>
      </View>
      <ChevronRight color={COLORS.textSecondary} size={20} strokeWidth={2} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16, gap: 16 },
  header: { paddingTop: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary },
  caption: { marginTop: 4, fontSize: 12, color: COLORS.textSecondary },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  statLabel: { marginTop: 4, fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  bubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mascot: { fontSize: 44 },
  speechBubble: {
    flex: 1,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bubbleBg,
  },
  bubbleText: { fontSize: 14, color: COLORS.textPrimary },
  panel: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  panelHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  pendingBadge: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
  },
  pendingBadgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  panelText: { fontSize: 14, lineHeight: 20, color: COLORS.textSecondary },
  stack: { gap: 8 },
  nameEditor: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  nameInputRow: { flexDirection: 'row', gap: 8 },
  nameInput: { flex: 1 },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  actions: { flexDirection: 'row', gap: 8 },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  compactButton: {
    minWidth: 72,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.surface },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  disabledButton: { backgroundColor: COLORS.primaryLight },
  settingsRow: {
    minHeight: 64,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
  },
  settingsTextGroup: { flex: 1 },
  settingsTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  settingsCaption: { marginTop: 2, fontSize: 12, color: COLORS.textSecondary },
  subpageHeader: {
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  subpageTitleGroup: { flex: 1 },
  subpageContent: { paddingHorizontal: 16, paddingTop: 8 },
});
