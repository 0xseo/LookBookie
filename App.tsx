import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Modal, StatusBar, StyleSheet, View } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { BottomTabs, type AppTab } from "./src/components/BottomTabs";
import { COLORS } from "./constants/colors";
import {
  AddItemScreen,
  type AddItemScreenHandle,
} from "./src/screens/AddItemScreen";
import { ClothingDetailScreen } from "./src/screens/ClothingDetailScreen";
import { CodiBookScreen } from "./src/screens/CodiBookScreen";
import { FriendsScreen } from "./src/screens/FriendsScreen";
import { MyPageScreen } from "./src/screens/MyPageScreen";
import { WardrobeScreen } from "./src/screens/WardrobeScreen";
import {
  countCloudPendingClothingItems,
  countOutfits,
  initDatabase,
  listCloudPendingClothingItems,
  listClothingItems,
  updateClothingCloudState,
} from "./src/storage/database";
import { isSupabaseConfigured } from "./src/services/supabaseClient";
import type { CloudSession } from "./src/services/supabaseClient";
import {
  getExistingClothingRemoteRecordIds,
  getCurrentCloudSession,
  signInWithEmail,
  signOutCloud,
  signUpWithEmail,
  subscribeToCloudAuthChanges,
  syncClothingItemUpdateToCloud,
} from "./src/services/wardrobeCloud";
import {
  exportLocalBackupFile,
  importLocalBackupFile,
} from "./src/services/backupService";
import {
  acceptFriendRequest,
  declineFriendRequest,
  ensureCurrentProfile,
  listIncomingFriendRequests,
  listFriends,
  listFriendOutfits,
  listFriendWardrobe,
  listOutgoingFriendRequests,
  sendFriendRequestByEmail,
  updateCurrentProfileDisplayName,
} from "./src/services/friendsCloud";
import type { CategoryFilter, ClothingItem } from "./src/types/clothing";
import type {
  FriendOutfit,
  FriendProfile,
  FriendRequest,
  FriendWardrobeItem,
} from "./src/types/friends";

const SPLASH_SCREEN_DURATION_MS = 2_000;

void SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    const hideSplashTimeout = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, SPLASH_SCREEN_DURATION_MS);

    return () => clearTimeout(hideSplashTimeout);
  }, []);

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("전체");
  const [activeTab, setActiveTab] = useState<AppTab>("wardrobe");
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [selectedWardrobeItem, setSelectedWardrobeItem] =
    useState<ClothingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDatabaseReady, setIsDatabaseReady] = useState(false);
  const [outfitsCount, setOutfitsCount] = useState(0);
  const [cloudSession, setCloudSession] = useState<CloudSession | null>(null);
  const [pendingCloudCount, setPendingCloudCount] = useState(0);
  const [isCloudBusy, setIsCloudBusy] = useState(false);
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [isFriendBusy, setIsFriendBusy] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<FriendProfile | null>(null);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState<
    FriendRequest[]
  >([]);
  const [outgoingFriendRequests, setOutgoingFriendRequests] = useState<
    FriendRequest[]
  >([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(
    null
  );
  const [friendWardrobeItems, setFriendWardrobeItems] = useState<
    FriendWardrobeItem[]
  >([]);
  const [friendOutfits, setFriendOutfits] = useState<FriendOutfit[]>([]);
  const addItemScreenRef = useRef<AddItemScreenHandle>(null);
  const tabBarInset = 64 + Math.max(8, insets.bottom);

  const visibleItems =
    selectedCategory === "전체"
      ? items
      : items.filter((item) => item.category === selectedCategory);

  const loadItems = useCallback(async () => {
    setIsLoading(true);

    try {
      const storedItems = await listClothingItems("전체");
      setItems(storedItems);
    } catch (error) {
      Alert.alert(
        "옷장을 불러오지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadOutfitCount = useCallback(async () => {
    try {
      const storedOutfitCount = await countOutfits();
      setOutfitsCount(storedOutfitCount);
    } catch (error) {
      Alert.alert(
        "코디 수를 불러오지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    }
  }, []);

  const loadCloudPendingCount = useCallback(async () => {
    try {
      const storedPendingCount = await countCloudPendingClothingItems();
      setPendingCloudCount(storedPendingCount);
    } catch (error) {
      Alert.alert(
        "동기화 상태를 불러오지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    }
  }, []);

  const loadFriendList = useCallback(async () => {
    if (!isSupabaseConfigured || !cloudSession) {
      setFriends([]);
      setIncomingFriendRequests([]);
      setOutgoingFriendRequests([]);
      return;
    }

    try {
      const [acceptedFriends, incomingRequests, outgoingRequests] =
        await Promise.all([
          listFriends(),
          listIncomingFriendRequests(),
          listOutgoingFriendRequests(),
        ]);

      setFriends(acceptedFriends);
      setIncomingFriendRequests(incomingRequests);
      setOutgoingFriendRequests(outgoingRequests);
    } catch (error) {
      Alert.alert(
        "친구 목록을 불러오지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    }
  }, [cloudSession]);

  const reconcileCloudStatuses = useCallback(async () => {
    if (!cloudSession || !isDatabaseReady) {
      return false;
    }

    const storedItems = await listClothingItems("전체");
    const cloudReferenceItems = storedItems.filter(
      (item) =>
        item.cloudSyncStatus === "synced" ||
        (item.cloudSyncStatus === "pending" &&
          Boolean(item.remoteRecordId) &&
          item.syncedAt === null &&
          item.cloudError === null)
    );
    const remoteRecordIds = cloudReferenceItems.flatMap((item) =>
      item.remoteRecordId ? [item.remoteRecordId] : []
    );
    const existingRemoteRecordIds = new Set(
      await getExistingClothingRemoteRecordIds(remoteRecordIds)
    );
    const missingItems = cloudReferenceItems.filter(
      (item) =>
        !item.remoteRecordId || !existingRemoteRecordIds.has(item.remoteRecordId)
    );
    const verifiedRestoredItems = cloudReferenceItems.filter(
      (item) =>
        item.cloudSyncStatus === "pending" &&
        item.remoteRecordId !== null &&
        existingRemoteRecordIds.has(item.remoteRecordId)
    );

    await Promise.all(
      [
        ...missingItems.map((item) =>
          updateClothingCloudState(item.id, {
            remoteImageUrl: item.remoteImageUrl,
            remoteRecordId: null,
            storagePath: null,
            cloudSyncStatus: "pending",
            cloudError: "클라우드에서 해당 옷을 찾지 못했어요.",
            syncedAt: null,
          })
        ),
        ...verifiedRestoredItems.map((item) =>
          updateClothingCloudState(item.id, {
            remoteImageUrl: item.remoteImageUrl,
            remoteRecordId: item.remoteRecordId,
            storagePath: item.storagePath,
            cloudSyncStatus: "synced",
            cloudError: null,
            syncedAt: new Date().toISOString(),
          })
        ),
      ]
    );

    return missingItems.length > 0 || verifiedRestoredItems.length > 0;
  }, [cloudSession, isDatabaseReady]);

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
        setIsDatabaseReady(true);
        await loadItems();
        await loadOutfitCount();
        await loadCloudPendingCount();
      } catch (error) {
        Alert.alert(
          "초기화에 실패했어북",
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했어요."
        );
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [loadCloudPendingCount, loadItems, loadOutfitCount]);

  useEffect(() => {
    if (!cloudSession || !isDatabaseReady) {
      return;
    }

    async function reconcileStoredCloudStatuses() {
      try {
        const didChange = await reconcileCloudStatuses();

        if (didChange) {
          await loadItems();
          await loadCloudPendingCount();
        }
      } catch {
        // Keep the last local status while offline or when cloud verification is unavailable.
      }
    }

    reconcileStoredCloudStatuses();
  }, [
    cloudSession,
    isDatabaseReady,
    loadCloudPendingCount,
    loadItems,
    reconcileCloudStatuses,
  ]);

  useEffect(() => {
    async function loadSession() {
      try {
        setCloudSession(await getCurrentCloudSession());
      } catch (error) {
        Alert.alert(
          "클라우드 세션을 확인하지 못했어북",
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했어요."
        );
      }
    }

    loadSession();

    return subscribeToCloudAuthChanges((_, session) => {
      setCloudSession(session);
    });
  }, []);

  useEffect(() => {
    if (!cloudSession) {
      setCurrentProfile(null);
      setFriends([]);
      setIncomingFriendRequests([]);
      setOutgoingFriendRequests([]);
      setSelectedFriend(null);
      setFriendWardrobeItems([]);
      setFriendOutfits([]);
      return;
    }

    async function prepareCloudProfile() {
      try {
        setCurrentProfile(await ensureCurrentProfile());
        await loadFriendList();
      } catch (error) {
        Alert.alert(
          "클라우드 프로필을 준비하지 못했어북",
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했어요."
        );
      }
    }

    prepareCloudProfile();
  }, [cloudSession, loadFriendList]);

  const handleSelectCategory = (category: CategoryFilter) => {
    setSelectedCategory(category);
  };

  const handleSaved = async () => {
    setIsAddVisible(false);
    await loadItems();
    await loadCloudPendingCount();
  };

  const handleItemUpdated = async () => {
    setSelectedWardrobeItem(null);
    await loadItems();
    await loadCloudPendingCount();
  };

  const handleItemDeleted = async () => {
    setSelectedWardrobeItem(null);
    await loadItems();
    await loadCloudPendingCount();
  };

  const handleOutfitSaved = async () => {
    await loadOutfitCount();
  };

  const handleCategoriesChanged = async () => {
    setSelectedCategory("전체");
    await loadItems();
    await loadCloudPendingCount();
  };

  const handleWardrobeRefresh = async () => {
    try {
      await reconcileCloudStatuses();
    } catch {
      // A manual refresh still reloads the offline wardrobe when cloud access fails.
    }

    await loadItems();
    await loadCloudPendingCount();
  };

  const handleCloudSignIn = async (email: string, password: string) => {
    setIsCloudBusy(true);

    try {
      await signInWithEmail(email, password);
      setCloudSession(await getCurrentCloudSession());
      await loadCloudPendingCount();
    } catch (error) {
      Alert.alert(
        "로그인에 실패했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleCloudSignUp = async (email: string, password: string) => {
    setIsCloudBusy(true);

    try {
      await signUpWithEmail(email, password);
      setCloudSession(await getCurrentCloudSession());
      Alert.alert(
        "가입 요청을 보냈어북",
        "이메일 확인이 필요하면 받은 편지함을 확인해 주세요."
      );
    } catch (error) {
      Alert.alert(
        "가입에 실패했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleCloudSignOut = async () => {
    setIsCloudBusy(true);

    try {
      await signOutCloud();
      setCloudSession(null);
      setCurrentProfile(null);
    } catch (error) {
      Alert.alert(
        "로그아웃에 실패했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleUpdateDisplayName = async (displayName: string) => {
    setIsCloudBusy(true);

    try {
      const updatedProfile = await updateCurrentProfileDisplayName(displayName);
      setCurrentProfile(updatedProfile);
    } catch (error) {
      Alert.alert(
        "이름을 저장하지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
      throw error;
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleExportBackup = async () => {
    setIsBackupBusy(true);

    try {
      const result = await exportLocalBackupFile();
      Alert.alert(
        "백업을 만들었어북",
        result.shared ? "공유 시트로 백업 파일을 내보냈어요." : result.uri
      );
    } catch (error) {
      Alert.alert(
        "백업 내보내기에 실패했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handleImportBackup = async () => {
    setIsBackupBusy(true);

    try {
      const result = await importLocalBackupFile();

      if (!result) {
        return;
      }

      try {
        await reconcileCloudStatuses();
      } catch {
        // The local backup remains usable while offline; cloud state stays pending.
      }

      await loadItems();
      await loadOutfitCount();
      await loadCloudPendingCount();
      Alert.alert(
        "백업을 가져왔어북",
        `옷 ${result.clothesCount}개와 코디 ${result.outfitsCount}개를 추가했어요.`
      );
    } catch (error) {
      Alert.alert(
        "백업 가져오기에 실패했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handleSendFriendRequest = async (email: string) => {
    setIsFriendBusy(true);

    try {
      await sendFriendRequestByEmail(email);
      await loadFriendList();
      Alert.alert(
        "친구 요청을 보냈어북",
        "상대가 수락하면 친구 옷장을 볼 수 있어요."
      );
    } catch (error) {
      Alert.alert(
        "친구 요청에 실패했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsFriendBusy(false);
    }
  };

  const handleAcceptFriendRequest = async (request: FriendRequest) => {
    setIsFriendBusy(true);

    try {
      await acceptFriendRequest(request.friendshipId);
      await loadFriendList();
    } catch (error) {
      Alert.alert(
        "친구 요청 수락에 실패했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsFriendBusy(false);
    }
  };

  const handleDeclineFriendRequest = async (request: FriendRequest) => {
    setIsFriendBusy(true);

    try {
      await declineFriendRequest(request.friendshipId);
      await loadFriendList();
    } catch (error) {
      Alert.alert(
        "친구 요청 처리에 실패했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsFriendBusy(false);
    }
  };

  const handleSelectFriend = async (friend: FriendProfile) => {
    setIsFriendBusy(true);
    setSelectedFriend(friend);

    try {
      const [wardrobeItems, outfits] = await Promise.all([
        listFriendWardrobe(friend.id),
        listFriendOutfits(friend.id),
      ]);

      setFriendWardrobeItems(wardrobeItems);
      setFriendOutfits(outfits);
    } catch (error) {
      Alert.alert(
        "친구 데이터를 불러오지 못했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsFriendBusy(false);
    }
  };

  const handleFriendsRefresh = async () => {
    await loadFriendList();

    if (selectedFriend) {
      await handleSelectFriend(selectedFriend);
    }
  };

  const handleCloseFriend = () => {
    setSelectedFriend(null);
    setFriendWardrobeItems([]);
    setFriendOutfits([]);
  };

  const handleSyncPending = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert(
        "클라우드 설정이 필요해북",
        ".env에 Supabase URL과 publishable key를 넣어 주세요."
      );
      return;
    }

    if (!cloudSession) {
      Alert.alert(
        "로그인이 필요해북",
        "마이페이지에서 Supabase 계정으로 로그인해 주세요."
      );
      return;
    }

    setIsCloudBusy(true);

    try {
      const pendingItems = await listCloudPendingClothingItems();
      let syncedCount = 0;

      for (const item of pendingItems) {
        const cloudState = await syncClothingItemUpdateToCloud(item, false);

        if (cloudState.cloudSyncStatus === "synced") {
          syncedCount += 1;
        }

        await updateClothingCloudState(item.id, cloudState);
      }

      await loadItems();
      await loadCloudPendingCount();
      Alert.alert(
        "동기화 완료북",
        `${syncedCount}개의 옷을 클라우드에 올렸어요.`
      );
    } catch (error) {
      Alert.alert(
        "동기화에 실패했어북",
        error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요."
      );
    } finally {
      setIsCloudBusy(false);
    }
  };

  return (
    <View style={styles.app}>
      <StatusBar barStyle="dark-content" />
      {activeTab === "wardrobe" ? (
        <WardrobeScreen
          items={visibleItems}
          selectedCategory={selectedCategory}
          isLoading={isLoading}
          bottomInset={tabBarInset}
          onSelectCategory={handleSelectCategory}
          onItemPress={setSelectedWardrobeItem}
          onAddPress={() => setIsAddVisible(true)}
          onRefresh={handleWardrobeRefresh}
        />
      ) : null}

      {activeTab === "codiBook" ? (
        <CodiBookScreen
          items={items}
          isLoading={isLoading}
          bottomInset={tabBarInset}
          onOutfitSaved={handleOutfitSaved}
          onOpenWardrobe={() => setActiveTab("wardrobe")}
        />
      ) : null}

      {activeTab === "profile" ? (
        <MyPageScreen
          clothesCount={items.length}
          outfitsCount={outfitsCount}
          pendingCloudCount={pendingCloudCount}
          isCloudConfigured={isSupabaseConfigured}
          cloudEmail={cloudSession?.user.email ?? null}
          cloudDisplayName={currentProfile?.displayName ?? null}
          isCloudBusy={isCloudBusy}
          isBackupBusy={isBackupBusy}
          bottomInset={tabBarInset}
          onSignIn={handleCloudSignIn}
          onSignUp={handleCloudSignUp}
          onSignOut={handleCloudSignOut}
          onUpdateDisplayName={handleUpdateDisplayName}
          onSyncPending={handleSyncPending}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onCategoriesChanged={handleCategoriesChanged}
        />
      ) : null}

      {activeTab === "friends" ? (
        <FriendsScreen
          isCloudConfigured={isSupabaseConfigured}
          cloudEmail={cloudSession?.user.email ?? null}
          isFriendBusy={isFriendBusy}
          friends={friends}
          incomingFriendRequests={incomingFriendRequests}
          outgoingFriendRequests={outgoingFriendRequests}
          selectedFriend={selectedFriend}
          friendWardrobeItems={friendWardrobeItems}
          friendOutfits={friendOutfits}
          bottomInset={tabBarInset}
          onSendFriendRequest={handleSendFriendRequest}
          onAcceptFriendRequest={handleAcceptFriendRequest}
          onDeclineFriendRequest={handleDeclineFriendRequest}
          onSelectFriend={handleSelectFriend}
          onCloseFriend={handleCloseFriend}
          onRefresh={handleFriendsRefresh}
          onOpenProfile={() => setActiveTab("profile")}
        />
      ) : null}

      <BottomTabs
        activeTab={activeTab}
        bottomInset={insets.bottom}
        onSelectTab={setActiveTab}
      />

      <Modal
        visible={isAddVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => addItemScreenRef.current?.requestCancel()}
      >
        <AddItemScreen
          ref={addItemScreenRef}
          onCancel={() => setIsAddVisible(false)}
          onSaved={handleSaved}
        />
      </Modal>

      <Modal
        visible={Boolean(selectedWardrobeItem)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedWardrobeItem(null)}
      >
        {selectedWardrobeItem ? (
          <ClothingDetailScreen
            item={selectedWardrobeItem}
            onClose={() => setSelectedWardrobeItem(null)}
            onSaved={handleItemUpdated}
            onDeleted={handleItemDeleted}
          />
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
