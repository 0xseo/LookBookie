import { Ruler, Shirt } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { COLORS } from "../../constants/colors";

type MyFitIconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
  backdropColor?: string;
};

export function MyFitIcon({
  color = COLORS.textPrimary,
  size = 24,
  strokeWidth = 2,
  backdropColor = COLORS.surface,
}: MyFitIconProps) {
  const rulerSize = Math.max(11, Math.round(size * 0.58));
  const badgeSize = rulerSize + 3;

  return (
    <View style={{ width: size + 3, height: size + 3 }} pointerEvents="none">
      <Shirt color={color} size={size} strokeWidth={strokeWidth} />
      <View
        style={[
          styles.rulerBadge,
          {
            width: badgeSize,
            height: badgeSize,
            borderRadius: Math.max(3, Math.round(badgeSize * 0.28)),
            backgroundColor: backdropColor,
          },
        ]}
      >
        <Ruler
          color={color}
          size={rulerSize}
          strokeWidth={strokeWidth}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rulerBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
