import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Modal, StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabs, type AppTab } from './src/components/BottomTabs';
import { COLORS } from './constants/colors';
import { AddItemScreen, type AddItemScreenHandle } from './src/screens/AddItemScreen';
import { ClothingDetailScreen } from './src/screens/ClothingDetailScreen';
import { CodiBookScreen } from './src/screens/CodiBookScreen';
import { FriendsScreen } from './src/screens/FriendsScreen';
import { MyPageScreen } from './src/screens/MyPageScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';
import {
  countCloudPendingClothingItems,
  countOutfits,
  initDatabase,
  listCloudPendingClothingItems,
  listClothingItems,
  updateClothingCloudState,
} from './src/storage/database';
import { isSupabaseConfigured } from './src/services/supabaseClient';
import type { CloudSession } from './src/services/supabaseClient';
import {
  getCurrentCloudSession,
  signInWithEmail,
  signOutCloud,
  signUpWithEmail,
  subscribeToCloudAuthChanges,
  syncClothingItemToCloud,
} from './src/services/wardrobeCloud';
import { exportLocalBackupFile, importLocalBackupFile } from './src/services/backupService';
import {
  addFriendByEmail,
  ensureCurrentProfile,
  listFriends,
  listFriendOutfits,
  listFriendWardrobe,
} from './src/services/friendsCloud';
import type { CategoryFilter, ClothingItem } from './src/types/clothing';
import type { FriendOutfit, FriendProfile, FriendWardrobeItem } from './src/types/friends';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('전체');
  const [activeTab, setActiveTab] = useState<AppTab>('wardrobe');
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [selectedWardrobeItem, setSelectedWardrobeItem] = useState<ClothingItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [outfitsCount, setOutfitsCount] = useState(0);
  const [cloudSession, setCloudSession] = useState<CloudSession | null>(null);
  const [pendingCloudCount, setPendingCloudCount] = useState(0);
  const [isCloudBusy, setIsCloudBusy] = useState(false);
  const [isBackupBusy, setIsBackupBusy] = useState(false);
  const [isFriendBusy, setIsFriendBusy] = useState(false);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [friendWardrobeItems, setFriendWardrobeItems] = useState<FriendWardrobeItem[]>([]);
  const [friendOutfits, setFriendOutfits] = useState<FriendOutfit[]>([]);
  const addItemScreenRef = useRef<AddItemScreenHandle>(null);
  const tabBottomOffset = Math.max(8, insets.bottom);
  const tabBarInset = 80 + tabBottomOffset;

  const visibleItems =
    selectedCategory === '전체'
      ? items
      : items.filter((item) => item.category === selectedCategory);

  const loadItems = useCallback(async () => {
    setIsLoading(true);

    try {
      const storedItems = await listClothingItems('전체');
      setItems(storedItems);
    } catch (error) {
      Alert.alert(
        '옷장을 불러오지 못했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
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
        '코디 수를 불러오지 못했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    }
  }, []);

  const loadCloudPendingCount = useCallback(async () => {
    try {
      const storedPendingCount = await countCloudPendingClothingItems();
      setPendingCloudCount(storedPendingCount);
    } catch (error) {
      Alert.alert(
        '동기화 상태를 불러오지 못했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    }
  }, []);

  const loadFriendList = useCallback(async () => {
    if (!isSupabaseConfigured || !cloudSession) {
      setFriends([]);
      return;
    }

    try {
      setFriends(await listFriends());
    } catch (error) {
      Alert.alert(
        '친구 목록을 불러오지 못했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    }
  }, [cloudSession]);

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
        await loadItems();
        await loadOutfitCount();
        await loadCloudPendingCount();
      } catch (error) {
        Alert.alert(
          '초기화에 실패했어북',
          error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
        );
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [loadCloudPendingCount, loadItems, loadOutfitCount]);

  useEffect(() => {
    async function loadSession() {
      try {
        setCloudSession(await getCurrentCloudSession());
      } catch (error) {
        Alert.alert(
          '클라우드 세션을 확인하지 못했어북',
          error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
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
      setFriends([]);
      setSelectedFriend(null);
      setFriendWardrobeItems([]);
      setFriendOutfits([]);
      return;
    }

    async function prepareCloudProfile() {
      try {
        await ensureCurrentProfile();
        await loadFriendList();
      } catch (error) {
        Alert.alert(
          '클라우드 프로필을 준비하지 못했어북',
          error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
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

  const handleOutfitSaved = async () => {
    await loadOutfitCount();
  };

  const handleCloudSignIn = async (email: string, password: string) => {
    setIsCloudBusy(true);

    try {
      await signInWithEmail(email, password);
      setCloudSession(await getCurrentCloudSession());
      await loadCloudPendingCount();
    } catch (error) {
      Alert.alert(
        '로그인에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
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
      Alert.alert('가입 요청을 보냈어북', '이메일 확인이 필요하면 받은 편지함을 확인해 주세요.');
    } catch (error) {
      Alert.alert(
        '가입에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
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
    } catch (error) {
      Alert.alert(
        '로그아웃에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleExportBackup = async () => {
    setIsBackupBusy(true);

    try {
      const result = await exportLocalBackupFile();
      Alert.alert(
        '백업을 만들었어북',
        result.shared ? '공유 시트로 백업 파일을 내보냈어요.' : result.uri,
      );
    } catch (error) {
      Alert.alert(
        '백업 내보내기에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
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

      await loadItems();
      await loadOutfitCount();
      await loadCloudPendingCount();
      Alert.alert(
        '백업을 가져왔어북',
        `옷 ${result.clothesCount}개와 코디 ${result.outfitsCount}개를 추가했어요.`,
      );
    } catch (error) {
      Alert.alert(
        '백업 가져오기에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handleAddFriend = async (email: string) => {
    setIsFriendBusy(true);

    try {
      const friend = await addFriendByEmail(email);
      await loadFriendList();
      await handleSelectFriend(friend);
    } catch (error) {
      Alert.alert(
        '친구 추가에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
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
        '친구 데이터를 불러오지 못했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsFriendBusy(false);
    }
  };

  const handleSyncPending = async () => {
    if (!isSupabaseConfigured) {
      Alert.alert('클라우드 설정이 필요해북', '.env에 Supabase URL과 publishable key를 넣어 주세요.');
      return;
    }

    if (!cloudSession) {
      Alert.alert('로그인이 필요해북', '마이페이지에서 Supabase 계정으로 로그인해 주세요.');
      return;
    }

    setIsCloudBusy(true);

    try {
      const pendingItems = await listCloudPendingClothingItems();
      let syncedCount = 0;

      for (const item of pendingItems) {
        const cloudState = await syncClothingItemToCloud({
          localImagePath: item.localImagePath,
          name: item.name,
          brand: item.brand,
          category: item.category,
          seasons: item.seasons,
          color: item.color,
        });

        if (cloudState.cloudSyncStatus === 'synced') {
          syncedCount += 1;
        }

        await updateClothingCloudState(item.id, cloudState);
      }

      await loadItems();
      await loadCloudPendingCount();
      Alert.alert('동기화 완료북', `${syncedCount}개의 옷을 클라우드에 올렸어요.`);
    } catch (error) {
      Alert.alert(
        '동기화에 실패했어북',
        error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
      );
    } finally {
      setIsCloudBusy(false);
    }
  };

  return (
    <View style={styles.app}>
      <StatusBar barStyle="dark-content" />
      {activeTab === 'wardrobe' ? (
        <WardrobeScreen
          items={visibleItems}
          selectedCategory={selectedCategory}
          isLoading={isLoading}
          bottomInset={tabBarInset}
          onSelectCategory={handleSelectCategory}
          onItemPress={setSelectedWardrobeItem}
          onAddPress={() => setIsAddVisible(true)}
        />
      ) : null}

      {activeTab === 'codiBook' ? (
        <CodiBookScreen
          items={items}
          isLoading={isLoading}
          bottomInset={tabBarInset}
          onOutfitSaved={handleOutfitSaved}
          onOpenWardrobe={() => setActiveTab('wardrobe')}
        />
      ) : null}

      {activeTab === 'profile' ? (
        <MyPageScreen
          clothesCount={items.length}
          outfitsCount={outfitsCount}
          pendingCloudCount={pendingCloudCount}
          isCloudConfigured={isSupabaseConfigured}
          cloudEmail={cloudSession?.user.email ?? null}
          isCloudBusy={isCloudBusy}
          isBackupBusy={isBackupBusy}
          bottomInset={tabBarInset}
          onSignIn={handleCloudSignIn}
          onSignUp={handleCloudSignUp}
          onSignOut={handleCloudSignOut}
          onSyncPending={handleSyncPending}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
        />
      ) : null}

      {activeTab === 'friends' ? (
        <FriendsScreen
          isCloudConfigured={isSupabaseConfigured}
          cloudEmail={cloudSession?.user.email ?? null}
          isFriendBusy={isFriendBusy}
          friends={friends}
          selectedFriend={selectedFriend}
          friendWardrobeItems={friendWardrobeItems}
          friendOutfits={friendOutfits}
          bottomInset={tabBarInset}
          onAddFriend={handleAddFriend}
          onSelectFriend={handleSelectFriend}
          onOpenProfile={() => setActiveTab('profile')}
        />
      ) : null}

      <BottomTabs
        activeTab={activeTab}
        bottomOffset={tabBottomOffset}
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
