import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS } from '../../constants/colors';
import type { FriendOutfit, FriendProfile, FriendWardrobeItem } from '../types/friends';

type FriendsScreenProps = {
  isCloudConfigured: boolean;
  cloudEmail: string | null;
  isFriendBusy: boolean;
  friends: FriendProfile[];
  selectedFriend: FriendProfile | null;
  friendWardrobeItems: FriendWardrobeItem[];
  friendOutfits: FriendOutfit[];
  bottomInset: number;
  onAddFriend: (email: string) => Promise<void>;
  onSelectFriend: (friend: FriendProfile) => Promise<void>;
  onOpenProfile: () => void;
};

type FriendViewMode = 'wardrobe' | 'outfits';

const GRID_GAP = 8;
const SIDE_PADDING = 16;

export function FriendsScreen({
  isCloudConfigured,
  cloudEmail,
  isFriendBusy,
  friends,
  selectedFriend,
  friendWardrobeItems,
  friendOutfits,
  bottomInset,
  onAddFriend,
  onSelectFriend,
  onOpenProfile,
}: FriendsScreenProps) {
  const { width } = useWindowDimensions();
  const [friendEmail, setFriendEmail] = useState('');
  const [mode, setMode] = useState<FriendViewMode>('wardrobe');
  const tileSize = Math.floor((width - SIDE_PADDING * 2 - GRID_GAP * 2) / 3);

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
          <Text style={styles.title}>친구</Text>
          <Text style={styles.caption}>친구 옷장과 코디북을 살펴봐요</Text>
        </View>

        {!isCloudConfigured ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>클라우드 설정 필요</Text>
            <Text style={styles.panelText}>
              친구 기능은 Supabase 설정이 있어야 사용할 수 있어요.
            </Text>
          </View>
        ) : !cloudEmail ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>로그인이 필요해북</Text>
            <Text style={styles.panelText}>친구 옷장은 로그인한 계정끼리 연결돼요.</Text>
            <Pressable onPress={onOpenProfile} style={styles.primaryButton} hitSlop={8}>
              <Text style={styles.primaryButtonText}>마이페이지로</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>친구 추가</Text>
              <View style={styles.friendInputRow}>
                <TextInput
                  value={friendEmail}
                  onChangeText={setFriendEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="친구 이메일"
                  placeholderTextColor={COLORS.textSecondary}
                  style={styles.input}
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
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>친구 목록</Text>
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
                        <Text
                          style={[styles.friendChipText, selected && styles.friendChipTextSelected]}
                        >
                          {friend.displayName ?? friend.email}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <Text style={styles.panelText}>아직 추가한 친구가 없어북.</Text>
              )}
            </View>

            {selectedFriend ? (
              <View style={styles.panel}>
                <View style={styles.panelHeader}>
                  <View>
                    <Text style={styles.sectionTitle}>
                      {selectedFriend.displayName ?? selectedFriend.email}
                    </Text>
                    <Text style={styles.panelCaption}>{selectedFriend.email}</Text>
                  </View>
                  {isFriendBusy ? <ActivityIndicator color={COLORS.primary} /> : null}
                </View>

                <View style={styles.segmentedControl}>
                  <ModeButton
                    label="옷장"
                    selected={mode === 'wardrobe'}
                    onPress={() => setMode('wardrobe')}
                  />
                  <ModeButton
                    label="코디북"
                    selected={mode === 'outfits'}
                    onPress={() => setMode('outfits')}
                  />
                </View>

                {mode === 'wardrobe' ? (
                  <View style={styles.grid}>
                    {friendWardrobeItems.length === 0 ? (
                      <Text style={styles.panelText}>친구 옷장이 아직 비어있어북.</Text>
                    ) : (
                      friendWardrobeItems.map((item) => (
                        <View key={item.id} style={[styles.wardrobeTile, { width: tileSize }]}>
                          <View style={styles.wardrobeImageFrame}>
                            <Image
                              source={{ uri: item.remoteImageUrl }}
                              style={styles.wardrobeImage}
                            />
                          </View>
                          <Text style={styles.tileText} numberOfLines={1}>
                            {item.brand || item.name || item.category}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                ) : (
                  <View style={styles.outfitList}>
                    {friendOutfits.length === 0 ? (
                      <Text style={styles.panelText}>친구 코디북이 아직 비어있어북.</Text>
                    ) : (
                      friendOutfits.map((outfit) => (
                        <View key={outfit.id} style={styles.outfitCard}>
                          <View style={styles.outfitPreview}>
                            {outfit.stickers
                              .filter((sticker) => sticker.remoteImageUrl)
                              .slice(0, 5)
                              .map((sticker, index) => (
                                <Image
                                  key={`${outfit.id}-${index}`}
                                  source={{ uri: sticker.remoteImageUrl ?? undefined }}
                                  style={[
                                    styles.outfitImage,
                                    {
                                      left: 16 + index * 24,
                                      top: 18 + index * 10,
                                      transform: [{ rotate: `${sticker.rotation * 0.2}deg` }],
                                    },
                                  ]}
                                />
                              ))}
                          </View>
                          <Text style={styles.outfitName}>{outfit.name}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type ModeButtonProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

function ModeButton({ label, selected, onPress }: ModeButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeButton, selected && styles.modeButtonSelected]}
      hitSlop={8}
    >
      <Text style={[styles.modeButtonText, selected && styles.modeButtonTextSelected]}>{label}</Text>
    </Pressable>
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
  panelText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  panelCaption: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  friendInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
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
  addFriendButton: {
    minWidth: 72,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryButton: {
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
  disabledButton: {
    backgroundColor: COLORS.primaryLight,
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
  segmentedControl: {
    minHeight: 48,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    gap: 4,
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonSelected: {
    backgroundColor: COLORS.secondary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  modeButtonTextSelected: {
    color: COLORS.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wardrobeTile: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  wardrobeImageFrame: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: COLORS.surface,
  },
  wardrobeImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  tileText: {
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  outfitList: {
    gap: 8,
  },
  outfitCard: {
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  outfitPreview: {
    height: 148,
    backgroundColor: COLORS.canvasBg,
  },
  outfitImage: {
    position: 'absolute',
    width: 88,
    height: 88,
    resizeMode: 'contain',
  },
  outfitName: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
