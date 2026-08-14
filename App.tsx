import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, StatusBar, StyleSheet, View } from 'react-native';

import { BottomTabs, type AppTab } from './src/components/BottomTabs';
import { COLORS } from './constants/colors';
import { AddItemScreen } from './src/screens/AddItemScreen';
import { CodiBookScreen } from './src/screens/CodiBookScreen';
import { MyPageScreen } from './src/screens/MyPageScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { countOutfits, initDatabase, listClothingItems } from './src/storage/database';
import type { CategoryFilter, ClothingItem } from './src/types/clothing';

const TAB_BAR_INSET = 96;

export default function App() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('전체');
  const [activeTab, setActiveTab] = useState<AppTab>('wardrobe');
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [outfitsCount, setOutfitsCount] = useState(0);

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

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
        await loadItems();
        await loadOutfitCount();
      } catch (error) {
        Alert.alert(
          '초기화에 실패했어북',
          error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
        );
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [loadItems, loadOutfitCount]);

  const handleSelectCategory = (category: CategoryFilter) => {
    setSelectedCategory(category);
  };

  const handleSaved = async () => {
    setIsAddVisible(false);
    await loadItems();
  };

  const handleOutfitSaved = async () => {
    await loadOutfitCount();
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
          bottomInset={TAB_BAR_INSET}
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
