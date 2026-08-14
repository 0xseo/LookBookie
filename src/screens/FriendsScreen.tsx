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
import type {
  FriendOutfit,
  FriendOutfitSticker,
  FriendProfile,
  FriendRequest,
  FriendWardrobeItem,
} from '../types/friends';

type FriendsScreenProps = {
  isCloudConfigured: boolean;
  cloudEmail: string | null;
  isFriendBusy: boolean;
  friends: FriendProfile[];
  incomingFriendRequests: FriendRequest[];
  outgoingFriendRequests: FriendRequest[];
  selectedFriend: FriendProfile | null;
  friendWardrobeItems: FriendWardrobeItem[];
  friendOutfits: FriendOutfit[];
  bottomInset: number;
  onSendFriendRequest: (email: string) => Promise<void>;
  onAcceptFriendRequest: (request: FriendRequest) => Promise<void>;
  onDeclineFriendRequest: (request: FriendRequest) => Promise<void>;
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
  incomingFriendRequests,
  outgoingFriendRequests,
  selectedFriend,
  friendWardrobeItems,
  friendOutfits,
  bottomInset,
  onSendFriendRequest,
  onAcceptFriendRequest,
  onDeclineFriendRequest,
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

    await onSendFriendRequest(friendEmail.trim());
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
              <Text style={styles.sectionTitle}>친구 요청</Text>
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
                  <Text style={styles.primaryButtonText}>요청</Text>
                </Pressable>
              </View>
            </View>

            {incomingFriendRequests.length > 0 ? (
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>받은 요청</Text>
                <View style={styles.requestList}>
                  {incomingFriendRequests.map((request) => (
                    <View key={request.friendshipId} style={styles.requestRow}>
                      <View style={styles.requestTextGroup}>
                        <Text style={styles.requestName}>
                          {request.displayName ?? request.email}
                        </Text>
                        <Text style={styles.panelCaption}>{request.email}</Text>
                      </View>
                      <Pressable
                        onPress={() => onDeclineFriendRequest(request)}
                        disabled={isFriendBusy}
                        style={styles.requestGhostButton}
                        hitSlop={8}
                      >
                        <Text style={styles.requestGhostButtonText}>거절</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => onAcceptFriendRequest(request)}
                        disabled={isFriendBusy}
                        style={styles.requestAcceptButton}
                        hitSlop={8}
                      >
                        <Text style={styles.primaryButtonText}>수락</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {outgoingFriendRequests.length > 0 ? (
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>보낸 요청</Text>
                <View style={styles.friendList}>
                  {outgoingFriendRequests.map((request) => (
                    <View key={request.friendshipId} style={styles.pendingChip}>
                      <Text style={styles.pendingChipText}>
                        {request.displayName ?? request.email}
                      </Text>
                      <Text style={styles.pendingBadge}>대기</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

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
                          <FriendOutfitPreview
                            stickers={outfit.stickers}
                            canvasWidth={outfit.canvasWidth}
                            canvasHeight={outfit.canvasHeight}
                          />
                          <View style={styles.outfitLabel}>
                            <Text style={styles.outfitName}>{outfit.name}</Text>
                            {outfit.seasons.length > 0 ? (
                              <Text style={styles.outfitSeasons}>{outfit.seasons.join(' · ')}</Text>
                            ) : null}
                          </View>
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

type FriendOutfitPreviewProps = {
  stickers: FriendOutfitSticker[];
  canvasWidth: number | null;
  canvasHeight: number | null;
};

function FriendOutfitPreview({
  stickers,
  canvasWidth,
  canvasHeight,
}: FriendOutfitPreviewProps) {
  const previewSize = 148;
  const layout = getFriendPreviewLayout(stickers, canvasWidth, canvasHeight, previewSize);

  return (
    <View style={[styles.outfitPreview, { width: previewSize, alignSelf: 'center' }]}>
      {stickers
        .filter((sticker) => sticker.remoteImageUrl)
        .slice()
        .sort((first, second) => first.zIndex - second.zIndex)
        .map((sticker, index) => (
          <Image
            key={`${sticker.remoteImageUrl}-${index}`}
            source={{ uri: sticker.remoteImageUrl ?? undefined }}
            style={[
              styles.outfitImage,
              {
                left: layout.offsetX + (sticker.x - layout.minX) * layout.scale,
                top: layout.offsetY + (sticker.y - layout.minY) * layout.scale,
                width: sticker.size * layout.scale,
                height: sticker.size * layout.scale,
                transform: [{ rotate: `${sticker.rotation}deg` }],
                zIndex: sticker.zIndex,
              },
            ]}
          />
        ))}
    </View>
  );
}

function getFriendPreviewLayout(
  stickers: FriendOutfitSticker[],
  canvasWidth: number | null,
  canvasHeight: number | null,
  previewSize: number,
) {
  if (canvasWidth && canvasHeight) {
    const scale = Math.min(previewSize / canvasWidth, previewSize / canvasHeight);

    return {
      minX: 0,
      minY: 0,
      offsetX: (previewSize - canvasWidth * scale) / 2,
      offsetY: (previewSize - canvasHeight * scale) / 2,
      scale,
    };
  }

  if (stickers.length === 0) {
    return { minX: 0, minY: 0, offsetX: 0, offsetY: 0, scale: 1 };
  }

  const bounds = stickers.reduce(
    (current, sticker) => ({
      minX: Math.min(current.minX, sticker.x),
      minY: Math.min(current.minY, sticker.y),
      maxX: Math.max(current.maxX, sticker.x + sticker.size),
      maxY: Math.max(current.maxY, sticker.y + sticker.size),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: 0,
      maxY: 0,
    },
  );
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const inset = 12;
  const scale = Math.min(
    (previewSize - inset * 2) / contentWidth,
    (previewSize - inset * 2) / contentHeight,
  );

  return {
    minX: bounds.minX,
    minY: bounds.minY,
    offsetX: (previewSize - contentWidth * scale) / 2,
    offsetY: (previewSize - contentHeight * scale) / 2,
    scale,
  };
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
  requestList: {
    gap: 8,
  },
  requestRow: {
    minHeight: 56,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestTextGroup: {
    flex: 1,
  },
  requestName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  requestAcceptButton: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  requestGhostButton: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  requestGhostButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
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
  pendingChip: {
    minHeight: 44,
    paddingLeft: 16,
    paddingRight: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pendingBadge: {
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    fontSize: 11,
    fontWeight: '700',
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
  outfitLabel: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  outfitName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  outfitSeasons: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
