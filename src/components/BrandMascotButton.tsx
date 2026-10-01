import { Pressable, StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";
import { HEADER_MASCOTS, MASCOT_FRAMES, type MascotScreen } from "../../constants/mascots";
import { MascotImage } from "./MascotImage";

const BUTTON_SIZE = 60;
// Increase the inset to shrink the photo while keeping the button size.
const IMAGE_INSET = 6;
const IMAGE_SIZE = BUTTON_SIZE - IMAGE_INSET * 2;

export function BrandMascotButton({
  onPress,
  label = "룩부기 새로고침",
  screen = "wardrobe",
}: {
  onPress: () => void;
  label?: string;
  screen?: MascotScreen;
}) {
  return (
    <Pressable
      style={styles.button}
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
    >
      <MascotImage source={HEADER_MASCOTS[screen]} frame={MASCOT_FRAMES[screen]} size={IMAGE_SIZE} />
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
