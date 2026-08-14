import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, StatusBar, StyleSheet, View } from 'react-native';

import { BottomTabs, type AppTab } from './src/components/BottomTabs';
import { COLORS } from './constants/colors';
import { AddItemScreen } from './src/screens/AddItemScreen';
import { CodiBookScreen } from './src/screens/CodiBookScreen';
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
import type { CategoryFilter, ClothingItem } from './src/types/clothing';

const TAB_BAR_INSET = 96;

export default function App() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('전체');
  const [activeTab, setActiveTab] = useState<AppTab>('wardrobe');
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [outfitsCount, setOutfitsCount] = useState(0);
  const [cloudSession, setCloudSession] = useState<CloudSession | null>(null);
  const [pendingCloudCount, setPendingCloudCount] = useState(0);
  const [isCloudBusy, setIsCloudBusy] = useState(false);

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

  const handleSelectCategory = (category: CategoryFilter) => {
    setSelectedCategory(category);
  };

  const handleSaved = async () => {
    setIsAddVisible(false);
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
          bottomInset={TAB_BAR_INSET}
          onSelectCategory={handleSelectCategory}
          onAddPress={() => setIsAddVisible(true)}
        />
      ) : null}

      {activeTab === 'codiBook' ? (
        <CodiBookScreen
          items={items}
          isLoading={isLoading}
          bottomInset={TAB_BAR_INSET}
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
          bottomInset={TAB_BAR_INSET}
          onSignIn={handleCloudSignIn}
          onSignUp={handleCloudSignUp}
          onSignOut={handleCloudSignOut}
          onSyncPending={handleSyncPending}
        />
      ) : null}

      <BottomTabs activeTab={activeTab} onSelectTab={setActiveTab} />

      <Modal visible={isAddVisible} animationType="slide" presentationStyle="pageSheet">
        <AddItemScreen onCancel={() => setIsAddVisible(false)} onSaved={handleSaved} />
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
