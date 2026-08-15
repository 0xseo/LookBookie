import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Turtle,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS } from "../../constants/colors";
import { AppAlert } from "../components/AppDialog";
import { useCategoryOptions } from "../hooks/useCategoryOptions";
import { useColorPaletteOptions } from "../hooks/useColorPaletteOptions";
import { useKeyboardHeight } from "../hooks/useKeyboardHeight";
import { getColorSearchTerms } from "../services/colorSearch";
import type {
  FriendOutfit,
  FriendOutfitSticker,
  FriendProfile,
  FriendRequest,
  FriendWardrobeItem,
} from "../types/friends";
import type { CategoryFilter, ColorOption } from "../types/clothing";

type FriendsScreenProps = {
  isCloudConfigured: boolean;
  isCloudSignedIn: boolean;
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
  onCloseFriend: () => void;
  onRefresh: () => Promise<void>;
  onOpenProfile: () => void;
};

type FriendViewMode = "wardrobe" | "outfits";

const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const SIDE_PADDING = 16;

export function FriendsScreen({
  isCloudConfigured,
  isCloudSignedIn,
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
  onCloseFriend,
  onRefresh,
  onOpenProfile,
}: FriendsScreenProps) {
  const { width } = useWindowDimensions();
  const [friendIdentifier, setFriendIdentifier] = useState("");
  const [friendListSearchQuery, setFriendListSearchQuery] = useState("");
  const [mode, setMode] = useState<FriendViewMode>("wardrobe");
  const [detailVisible, setDetailVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("전체");
  const { colorOptions } = useColorPaletteOptions();
  const { categoryOptions } = useCategoryOptions();
  const keyboardHeight = useKeyboardHeight();
  const categoryFilters: CategoryFilter[] = [
    "전체",
    ...Array.from(
      new Set([
        ...categoryOptions,
        ...friendWardrobeItems.map((item) => item.category),
      ])
    ),
  ];
  const tileSize = Math.floor(
    (width - SIDE_PADDING * 2 - GRID_GAP * (GRID_COLUMNS - 1)) / GRID_COLUMNS
  );
  const visibleWardrobeItems = useMemo(
    () =>
      friendWardrobeItems.filter((item) => {
        const categoryMatches =
          selectedCategory === "전체" || item.category === selectedCategory;

        return (
          categoryMatches &&
          friendWardrobeMatchesSearch(item, searchQuery, colorOptions)
        );
      }),
    [colorOptions, friendWardrobeItems, searchQuery, selectedCategory]
  );
  const visibleOutfits = useMemo(
    () =>
      friendOutfits.filter((outfit) =>
        friendOutfitMatchesSearch(outfit, searchQuery, colorOptions)
      ),
    [colorOptions, friendOutfits, searchQuery]
  );
  const visibleFriends = useMemo(() => {
    const normalizedQuery = friendListSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return friends;
    }

    const normalizedHandleQuery = normalizedQuery.replace(/^@/, "");

    return friends.filter((friend) => {
      const displayName = friend.displayName?.trim().toLowerCase() ?? "";
      const handle = friend.handle.toLowerCase();

      return (
        displayName.includes(normalizedQuery) ||
        handle.includes(normalizedHandleQuery)
      );
    });
  }, [friendListSearchQuery, friends]);

  const submitFriend = async () => {
    if (!friendIdentifier.trim()) {
      AppAlert.alert(
        "친구 정보가 필요해북",
        "추가할 친구의 룩부기 ID를 입력해 주세요."
      );
      return;
    }

    await onSendFriendRequest(friendIdentifier.trim());
    setFriendIdentifier("");
  };

  const openFriend = async (friend: FriendProfile) => {
    setMode("wardrobe");
    setSearchQuery("");
    setSelectedCategory("전체");
    await onSelectFriend(friend);
    setDetailVisible(true);
  };

  const refreshFriends = async () => {
    setIsRefreshing(true);

    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  const closeFriend = () => {
    setDetailVisible(false);
    onCloseFriend();
  };

  useEffect(() => {
    if (!detailVisible) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        closeFriend();
        return true;
      }
    );

    return () => subscription.remove();
  }, [detailVisible, onCloseFriend]);

  if (detailVisible && selectedFriend) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.detailHeader}>
            <Pressable
              onPress={closeFriend}
              style={styles.backButton}
              accessibilityLabel="친구 목록으로"
              hitSlop={8}
            >
              <ChevronLeft
                color={COLORS.textPrimary}
                size={24}
                strokeWidth={2.2}
              />
            </Pressable>
            <View style={styles.detailAvatar}>
              <Turtle color={COLORS.primary} size={22} strokeWidth={2.2} />
            </View>
            <View style={styles.detailTitleGroup}>
              <Text style={styles.detailTitle} numberOfLines={1}>
                {getFriendDisplayName(selectedFriend)}
              </Text>
              <Text style={styles.caption} numberOfLines={1}>
                {getFriendSecondaryText(selectedFriend)}
              </Text>
            </View>
            <Pressable
              onPress={refreshFriends}
              style={styles.mascotSlot}
              accessibilityLabel="친구 데이터 새로고침"
              hitSlop={8}
            >
              {isFriendBusy || isRefreshing ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <RefreshCw color={COLORS.primary} size={22} strokeWidth={2.2} />
              )}
            </Pressable>
          </View>

          <View style={styles.segmentedControl}>
            <ModeButton
              label="옷장"
              selected={mode === "wardrobe"}
              onPress={() => {
                setMode("wardrobe");
                setSearchQuery("");
              }}
            />
            <ModeButton
              label="코디북"
              selected={mode === "outfits"}
              onPress={() => {
                setMode("outfits");
                setSearchQuery("");
              }}
            />
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.detailContent,
              { paddingBottom: bottomInset + 24 + keyboardHeight },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
            refreshControl={
              <RefreshControl
                refreshing={isFriendBusy || isRefreshing}
                onRefresh={refreshFriends}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          >
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={
                mode === "wardrobe"
                  ? "이름, 브랜드, 계절, 색 검색"
                  : "코디 이름, 계절, 옷 정보 검색"
              }
              placeholderTextColor={COLORS.textSecondary}
              style={styles.searchInput}
              returnKeyType="search"
            />

            {mode === "wardrobe" ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filterScroll}
                  contentContainerStyle={styles.filterContent}
                >
                  {categoryFilters.map((category) => {
                    const selected = selectedCategory === category;

                    return (
                      <Pressable
                        key={category}
                        onPress={() => setSelectedCategory(category)}
                        style={[
                          styles.categoryChip,
                          selected && styles.categoryChipSelected,
                        ]}
                        hitSlop={8}
                      >
                        <Text
                          style={[
                            styles.categoryChipText,
                            selected && styles.categoryChipTextSelected,
                          ]}
                        >
                          {category}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {visibleWardrobeItems.length > 0 ? (
                  <View style={styles.grid}>
                    {visibleWardrobeItems.map((item) => (
                      <View
                        key={item.id}
                        style={[styles.wardrobeCard, { width: tileSize }]}
                      >
                        <View style={styles.imageFrame}>
                          <Image
                            source={{ uri: item.remoteImageUrl }}
                            style={styles.cardImage}
                          />
                        </View>
                        <View style={styles.cardLabelRow}>
                          <Text style={styles.cardLabel} numberOfLines={1}>
                            {item.brand || item.name || item.category}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <EmptyState
                    text={
                      searchQuery
                        ? "검색 결과가 없어북"
                        : "친구 옷장이 비어있어북"
                    }
                  />
                )}
              </>
            ) : visibleOutfits.length > 0 ? (
              <View style={styles.grid}>
                {visibleOutfits.map((outfit) => (
                  <View
                    key={outfit.id}
                    style={[styles.outfitCard, { width: tileSize }]}
                  >
                    <FriendOutfitPreview
                      stickers={outfit.stickers}
                      canvasWidth={outfit.canvasWidth}
                      canvasHeight={outfit.canvasHeight}
                      previewSize={tileSize}
                    />
                    <View style={styles.outfitLabelRow}>
                      <Text style={styles.outfitName} numberOfLines={1}>
                        {outfit.name}
                      </Text>
                      <Text style={styles.outfitMeta}>
                        {outfit.stickers.length}개
                      </Text>
                      {outfit.seasons.length > 0 ? (
                        <Text style={styles.outfitSeasons} numberOfLines={1}>
                          {outfit.seasons.join(" · ")}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <EmptyState
                text={
                  searchQuery
                    ? "검색 결과가 없어북"
                    : "친구 코디북이 비어있어북"
                }
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
          refreshControl={
            <RefreshControl
              refreshing={isFriendBusy || isRefreshing}
              onRefresh={refreshFriends}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.title}>친구</Text>
            <Text style={styles.caption}>
              친구를 눌러 옷장과 코디북을 살펴봐요
            </Text>
          </View>

          {!isCloudConfigured ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>클라우드 설정 필요</Text>
              <Text style={styles.panelText}>
                친구 기능은 Supabase 설정이 있어야 사용할 수 있어요.
              </Text>
            </View>
          ) : !isCloudSignedIn ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>로그인이 필요해북</Text>
              <Text style={styles.panelText}>
                친구 옷장은 로그인한 계정끼리 연결돼요.
              </Text>
              <Pressable
                onPress={onOpenProfile}
                style={styles.primaryButton}
                hitSlop={8}
              >
                <Text style={styles.primaryButtonText}>마이페이지로</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.panel}>
                <Text style={styles.sectionTitle}>친구 요청</Text>
                <View style={styles.friendInputRow}>
                  <TextInput
                    value={friendIdentifier}
                    onChangeText={setFriendIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="친구 룩부기 ID"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.input}
                  />
                  <Pressable
                    onPress={submitFriend}
                    disabled={isFriendBusy}
                    style={[
                      styles.addFriendButton,
                      isFriendBusy && styles.disabledButton,
                    ]}
                    hitSlop={8}
                  >
                    <Text style={styles.primaryButtonText}>요청</Text>
                  </Pressable>
                </View>
              </View>

              {incomingFriendRequests.length > 0 ? (
                <View style={styles.panel}>
                  <Text style={styles.sectionTitle}>받은 요청</Text>
                  {incomingFriendRequests.map((request) => (
                    <View key={request.friendshipId} style={styles.requestRow}>
                      <View style={styles.friendAvatar}>
                        <Turtle
                          color={COLORS.primary}
                          size={21}
                          strokeWidth={2.2}
                        />
                      </View>
                      <View style={styles.requestTextGroup}>
                        <Text style={styles.requestName}>
                          {getFriendDisplayName(request)}
                        </Text>
                        <Text style={styles.panelCaption}>
                          {getFriendSecondaryText(request)}
                        </Text>
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
              ) : null}

              {outgoingFriendRequests.length > 0 ? (
                <View style={styles.panel}>
                  <Text style={styles.sectionTitle}>보낸 요청</Text>
                  {outgoingFriendRequests.map((request) => (
                    <View key={request.friendshipId} style={styles.pendingRow}>
                      <View style={styles.friendAvatar}>
                        <Turtle
                          color={COLORS.primary}
                          size={21}
                          strokeWidth={2.2}
                        />
                      </View>
                      <Text style={styles.pendingName}>
                        {getFriendDisplayName(request)}
                      </Text>
                      <Text style={styles.pendingBadge}>대기</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.friendSection}>
                <Text style={styles.sectionTitle}>친구 목록</Text>
                <View style={styles.friendSearchRow}>
                  <Search
                    color={COLORS.textSecondary}
                    size={18}
                    strokeWidth={2}
                  />
                  <TextInput
                    value={friendListSearchQuery}
                    onChangeText={setFriendListSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="닉네임 또는 룩부기 ID 검색"
                    placeholderTextColor={COLORS.textSecondary}
                    style={styles.friendSearchInput}
                    returnKeyType="search"
                  />
                  {friendListSearchQuery ? (
                    <Pressable
                      onPress={() => setFriendListSearchQuery("")}
                      style={styles.clearSearchButton}
                      accessibilityLabel="친구 검색어 지우기"
                      hitSlop={8}
                    >
                      <X
                        color={COLORS.textSecondary}
                        size={18}
                        strokeWidth={2}
                      />
                    </Pressable>
                  ) : null}
                </View>
                {visibleFriends.length > 0 ? (
                  <View style={styles.friendList}>
                    {visibleFriends.map((friend) => (
                      <Pressable
                        key={friend.id}
                        onPress={() => openFriend(friend)}
                        style={styles.friendRow}
                        hitSlop={8}
                      >
                        <View style={styles.friendAvatar}>
                          <Turtle
                            color={COLORS.primary}
                            size={22}
                            strokeWidth={2.2}
                          />
                        </View>
                        <View style={styles.friendTextGroup}>
                          <Text style={styles.friendName}>
                            {getFriendDisplayName(friend)}
                          </Text>
                          <Text style={styles.panelCaption}>
                            {getFriendSecondaryText(friend)}
                          </Text>
                        </View>
                        <ChevronRight
                          color={COLORS.textSecondary}
                          size={20}
                          strokeWidth={2}
                        />
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.panelText}>
                    {friendListSearchQuery.trim()
                      ? "일치하는 친구가 없어북."
                      : "아직 추가한 친구가 없어북."}
                  </Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getFriendDisplayName(friend: FriendProfile) {
  return friend.displayName ?? friend.handle;
}

function getFriendSecondaryText(friend: FriendProfile) {
  return friend.handle;
}

function ModeButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.modeButton, selected && styles.modeButtonSelected]}
      hitSlop={8}
    >
      <Text
        style={[
          styles.modeButtonText,
          selected && styles.modeButtonTextSelected,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyMascot}>🐢</Text>
      <View style={styles.speechBubble}>
        <Text style={styles.emptyText}>{text}</Text>
      </View>
    </View>
  );
}

function FriendOutfitPreview({
  stickers,
  canvasWidth,
  canvasHeight,
  previewSize,
}: {
  stickers: FriendOutfitSticker[];
  canvasWidth: number | null;
  canvasHeight: number | null;
  previewSize: number;
}) {
  const layout = getFriendPreviewLayout(
    stickers,
    canvasWidth,
    canvasHeight,
    previewSize
  );

  return (
    <View
      style={[
        styles.outfitPreview,
        { width: previewSize, height: previewSize },
      ]}
    >
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

function friendWardrobeMatchesSearch(
  item: FriendWardrobeItem,
  query: string,
  colorOptions: readonly ColorOption[]
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    item.name,
    item.brand,
    item.category,
    item.color,
    item.colorValue,
    item.colorFamily,
    ...item.seasons,
    ...getColorSearchTerms(
      {
        color: item.color,
        colorValue:
          item.colorValue ??
          colorOptions.find((option) => option.label === item.color)?.value ??
          "#1A1D1E",
        colorFamily:
          item.colorFamily ??
          colorOptions.find((option) => option.label === item.color)?.family ??
          "black",
      },
      colorOptions
    ),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function friendOutfitMatchesSearch(
  outfit: FriendOutfit,
  query: string,
  colorOptions: readonly ColorOption[]
) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const stickerTerms = outfit.stickers.flatMap((sticker) => {
    const colorTerms =
      sticker.color && sticker.colorValue && sticker.colorFamily
        ? getColorSearchTerms(
            {
              color: sticker.color,
              colorValue: sticker.colorValue,
              colorFamily: sticker.colorFamily,
            },
            colorOptions
          )
        : [];

    return [sticker.name, sticker.brand, sticker.category, ...colorTerms];
  });

  return [outfit.name, ...outfit.seasons, ...stickerTerms]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

function getFriendPreviewLayout(
  stickers: FriendOutfitSticker[],
  canvasWidth: number | null,
  canvasHeight: number | null,
  previewSize: number
) {
  if (canvasWidth && canvasHeight) {
    const scale = Math.min(
      previewSize / canvasWidth,
      previewSize / canvasHeight
    );

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
    }
  );
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const inset = 12;
  const scale = Math.min(
    (previewSize - inset * 2) / contentWidth,
    (previewSize - inset * 2) / contentHeight
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
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 16, gap: 16 },
  header: { paddingTop: 8 },
  title: { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary },
  caption: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "400",
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
  sectionTitle: { fontSize: 16, fontWeight: "600", color: COLORS.textPrimary },
  panelText: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  panelCaption: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },
  friendInputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  addFriendButton: {
    minWidth: 72,
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  primaryButton: {
    minHeight: 48,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  primaryButtonText: { fontSize: 14, fontWeight: "700", color: COLORS.surface },
  disabledButton: { backgroundColor: COLORS.primaryLight },
  requestRow: {
    minHeight: 56,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requestTextGroup: { flex: 1 },
  requestName: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  requestAcceptButton: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
  },
  requestGhostButton: {
    minWidth: 56,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
  },
  requestGhostButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  pendingRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pendingName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  pendingBadge: {
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.secondary,
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.primary,
  },
  friendSection: { gap: 8 },
  friendSearchRow: {
    minHeight: 40,
    paddingLeft: 14,
    paddingRight: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  friendSearchInput: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 8,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  clearSearchButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  friendList: { gap: 8 },
  friendRow: {
    minHeight: 64,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  friendTextGroup: { flex: 1 },
  friendName: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  detailHeader: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  detailAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  detailTitleGroup: { flex: 1 },
  detailTitle: { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary },
  mascotSlot: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.secondary,
  },
  segmentedControl: {
    minHeight: 48,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: "row",
    gap: 4,
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modeButtonSelected: { backgroundColor: COLORS.secondary },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  modeButtonTextSelected: { color: COLORS.primary },
  detailContent: { paddingHorizontal: 16, gap: 8 },
  searchInput: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  filterScroll: { height: 48, flexGrow: 0 },
  filterContent: { paddingTop: 4, paddingBottom: 6, gap: 6 },
  categoryChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChipSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: COLORS.secondary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  categoryChipTextSelected: { color: COLORS.primary },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  wardrobeCard: {
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  imageFrame: {
    width: "100%",
    aspectRatio: 1,
    padding: 6,
    backgroundColor: COLORS.surface,
  },
  cardImage: { width: "100%", height: "100%", resizeMode: "contain" },
  cardLabelRow: {
    minHeight: 38,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: "center",
  },
  cardLabel: { fontSize: 12, fontWeight: "600", color: COLORS.textPrimary },
  outfitCard: {
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  outfitPreview: { backgroundColor: COLORS.canvasBg },
  outfitImage: { position: "absolute", resizeMode: "contain" },
  outfitLabelRow: {
    minHeight: 56,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    justifyContent: "center",
  },
  outfitName: { fontSize: 12, fontWeight: "700", color: COLORS.textPrimary },
  outfitMeta: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  outfitSeasons: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.primary,
  },
  emptyState: {
    minHeight: 260,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  emptyMascot: { fontSize: 56 },
  speechBubble: {
    maxWidth: 280,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bubbleBg,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "400",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
});
