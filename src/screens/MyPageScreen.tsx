import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors';

type MyPageScreenProps = {
  clothesCount: number;
  outfitsCount: number;
  bottomInset: number;
};

export function MyPageScreen({ clothesCount, outfitsCount, bottomInset }: MyPageScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.container, { paddingBottom: bottomInset + 24 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>마이페이지</Text>
          <Text style={styles.caption}>로컬 옷장 상태</Text>
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
            <Text style={styles.bubbleText}>지금은 오프라인 모드야북!</Text>
          </View>
        </View>

        <View style={styles.phasePanel}>
          <Text style={styles.sectionTitle}>Phase 상태</Text>
          <Text style={styles.phaseText}>Phase 1: 로컬 옷장 등록/조회 완료</Text>
          <Text style={styles.phaseText}>Phase 2: 코디북 캔버스 구축 중</Text>
          <Text style={styles.phaseText}>Phase 3: 클라우드 동기화 예정</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: COLORS.background,
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
  phasePanel: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  phaseText: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
});
