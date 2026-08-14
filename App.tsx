import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, StatusBar, StyleSheet, View } from 'react-native';

import { COLORS } from './constants/colors';
import { AddItemScreen } from './src/screens/AddItemScreen';
import { WardrobeScreen } from './src/screens/WardrobeScreen';
import { initDatabase, listClothingItems } from './src/storage/database';
import type { CategoryFilter, ClothingItem } from './src/types/clothing';

export default function App() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('전체');
  const [isAddVisible, setIsAddVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadItems = useCallback(async (category: CategoryFilter) => {
    setIsLoading(true);

    try {
      const storedItems = await listClothingItems(category);
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

  useEffect(() => {
    async function bootstrap() {
      try {
        await initDatabase();
        await loadItems(selectedCategory);
      } catch (error) {
        Alert.alert(
          '초기화에 실패했어북',
          error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
        );
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [loadItems, selectedCategory]);

  const handleSelectCategory = (category: CategoryFilter) => {
    setSelectedCategory(category);
  };

  const handleSaved = async () => {
    setIsAddVisible(false);
    await loadItems(selectedCategory);
  };

  return (
    <View style={styles.app}>
      <StatusBar barStyle="dark-content" />
      <WardrobeScreen
        items={items}
        selectedCategory={selectedCategory}
        isLoading={isLoading}
        onSelectCategory={handleSelectCategory}
        onAddPress={() => setIsAddVisible(true)}
      />

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
