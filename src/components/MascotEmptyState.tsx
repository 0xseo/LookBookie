import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/colors";
import {
  EMPTY_MASCOTS,
  MASCOT_FRAMES,
  type EmptyMascotScreen,
} from "../../constants/mascots";
import { MascotImage } from "./MascotImage";

const DEFAULT_MESSAGES: Record<EmptyMascotScreen, string> = {
  wardrobe: "옷장이 새 옷을 기다려북!\n내 옷들을 하나씩 모아봐북",
  myfit: "직접 입은 모습이 궁금해북!\n입어본 모습과 그날의 기억을 남겨봐북",
  codibook: "이 옷이랑 저 옷, 어울릴까?\n나만의 조합을 만들어봐북",
  friends: "같이 구경하면 더 재밌어북!\n친구의 옷장과 스타일을 만나봐북",
  mypage: "내 취향에 맞게 꾸며봐북!\n옷장과 계정 설정을 살펴봐북",
};

export function MascotEmptyState({
  screen,
  message = DEFAULT_MESSAGES[screen],
  children,
}: {
  screen: EmptyMascotScreen;
  message?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.container}>
      <MascotImage
        source={EMPTY_MASCOTS[screen]}
        frame={MASCOT_FRAMES[screen]}
        size={96}
      />
      <View style={styles.bubble}>
        <Text style={styles.message}>{message}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 16,
  },
  bubble: {
    maxWidth: 280,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: COLORS.bubbleBg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  message: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
});
