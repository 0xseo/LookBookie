import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS } from '../../constants/colors';
import type { FriendProfile, FriendWardrobeItem } from '../types/friends';

type MyPageScreenProps = {
  clothesCount: number;
  outfitsCount: number;
  pendingCloudCount: number;
  isCloudConfigured: boolean;
  cloudEmail: string | null;
  isCloudBusy: boolean;
  isBackupBusy: boolean;
  isFriendBusy: boolean;
  friends: FriendProfile[];
  selectedFriend: FriendProfile | null;
  friendWardrobeItems: FriendWardrobeItem[];
  bottomInset: number;
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  onSignOut: () => Promise<void>;
  onSyncPending: () => Promise<void>;
  onExportBackup: () => Promise<void>;
  onImportBackup: () => Promise<void>;
  onAddFriend: (email: string) => Promise<void>;
  onSelectFriend: (friend: FriendProfile) => Promise<void>;
};

export function MyPageScreen({
  clothesCount,
  outfitsCount,
  pendingCloudCount,
  isCloudConfigured,
  cloudEmail,
  isCloudBusy,
  isBackupBusy,
  isFriendBusy,
  friends,
  selectedFriend,
  friendWardrobeItems,
  bottomInset,
  onSignIn,
  onSignUp,
  onSignOut,
  onSyncPending,
  onExportBackup,
  onImportBackup,
  onAddFriend,
  onSelectFriend,
}: MyPageScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [friendEmail, setFriendEmail] = useState('');

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

  const submitFriend = async () => {
    if (!friendEmail.trim()) {
      Alert.alert('친구 이메일이 필요해북', '추가할 친구의 이메일을 입력해 주세요.');
      return;
    }

    await onAddFriend(friendEmail.trim());
    setFriendEmail('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.container, { paddingBottom: bottomInset + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>마이페이지</Text>
          <Text style={styles.caption}>오프라인 옷장과 클라우드 상태</Text>
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
            <View style={styles.cloudStack}>
              <Text style={styles.panelText}>{cloudEmail}</Text>
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
            <View style={styles.cloudStack}>
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
              <View style={styles.authActions}>
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
          <Text style={styles.sectionTitle}>Phase 상태</Text>
          <Text style={styles.phaseText}>Phase 1: 로컬 옷장 등록/조회 완료</Text>
          <Text style={styles.phaseText}>Phase 2: 코디북 캔버스 완료</Text>
          <Text style={styles.phaseText}>Phase 3: Supabase 백업/캐싱 완료</Text>
          <Text style={styles.phaseText}>Phase 4: 백업/친구 옷장 연결 중</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>백업</Text>
          <Text style={styles.panelText}>옷과 코디의 텍스트 데이터를 JSON 파일로 관리해요.</Text>
          <View style={styles.authActions}>
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

        {cloudEmail ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>친구 옷장</Text>
            <View style={styles.friendInputRow}>
              <TextInput
                value={friendEmail}
                onChangeText={setFriendEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="친구 이메일"
                placeholderTextColor={COLORS.textSecondary}
                style={[styles.input, styles.friendInput]}
              />
              <Pressable
                onPress={submitFriend}
                disabled={isFriendBusy}
                style={[styles.addFriendButton, isFriendBusy && styles.disabledButton]}
                hitSlop={8}
              >
                <Text style={styles.primaryButtonText}>추가</Text>
              </Pressable>
            </View>

            {friends.length > 0 ? (
              <View style={styles.friendList}>
                {friends.map((friend) => {
                  const selected = selectedFriend?.id === friend.id;

                  return (
                    <Pressable
                      key={friend.id}
                      onPress={() => onSelectFriend(friend)}
                      style={[styles.friendChip, selected && styles.friendChipSelected]}
                      hitSlop={8}
                    >
                      <Text style={[styles.friendChipText, selected && styles.friendChipTextSelected]}>
                        {friend.displayName ?? friend.email}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.panelText}>아직 추가한 친구가 없어북.</Text>
            )}

            {isFriendBusy ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : selectedFriend ? (
              <View style={styles.friendWardrobeGrid}>
                {friendWardrobeItems.length === 0 ? (
                  <Text style={styles.panelText}>친구 옷장이 아직 비어있어북.</Text>
                ) : (
                  friendWardrobeItems.map((item) => (
                    <View key={item.id} style={styles.friendWardrobeTile}>
                      <Image source={{ uri: item.remoteImageUrl }} style={styles.friendWardrobeImage} />
                      <Text style={styles.friendWardrobeText} numberOfLines={1}>
                        {item.brand || item.category}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 16,
    gap: 16,
  },
  header: {
    paddingTop: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  caption: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mascot: {
    fontSize: 44,
  },
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
  bubbleText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  panel: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  panelHeader: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  pendingBadge: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.secondary,
  },
  pendingBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  panelText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  cloudStack: {
    gap: 8,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textPrimary,
  },
  friendInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  friendInput: {
    flex: 1,
  },
  addFriendButton: {
    minWidth: 72,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  authActions: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
  },
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
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.primaryLight,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  friendList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  friendChip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  friendChipSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  friendChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  friendChipTextSelected: {
    color: COLORS.primary,
  },
  friendWardrobeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  friendWardrobeTile: {
    width: 96,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  friendWardrobeImage: {
    width: 96,
    height: 96,
    resizeMode: 'cover',
    backgroundColor: COLORS.surface,
  },
  friendWardrobeText: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
