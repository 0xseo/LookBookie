import { Shirt } from 'lucide-react-native';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../constants/colors';

export type WornClothing = { key: string; imageUri?: string | null; name: string; brand: string; deleted?: boolean; onPress?: () => void; };
export function WornClothes({ clothes }: { clothes: WornClothing[]; }) {
  return <View style={styles.section}>
    <Text style={styles.title}>입은 옷 {clothes.length}개</Text>
    {clothes.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
      {clothes.map((item) => <Pressable key={item.key} style={styles.card} disabled={!item.onPress || item.deleted} onPress={item.onPress} hitSlop={8}>
        {item.imageUri ? <Image source={{ uri: item.imageUri }} style={styles.image} /> : <View style={styles.image}><Shirt size={24} color={COLORS.textSecondary} /></View>}
        <View style={styles.text}><Text style={styles.name} numberOfLines={1}>{item.deleted ? '삭제된 옷입니다' : item.name || '이름 없음'}</Text><Text style={styles.brand} numberOfLines={1}>{item.brand || (item.deleted ? '옷장에 없음' : '브랜드 없음')}</Text></View>
      </Pressable>)}
    </ScrollView> : <Text style={styles.brand}>연결된 옷이 없어북</Text>}
  </View>;
}
const styles = StyleSheet.create({
  section: { paddingVertical: 8, gap: 8 }, title: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary }, content: { gap: 8, paddingVertical: 4 },
  card: { width: 196, minHeight: 64, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 8, gap: 8 },
  image: { width: 48, height: 48, resizeMode: 'contain', alignItems: 'center', justifyContent: 'center' }, text: { flex: 1 }, name: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary }, brand: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
});
