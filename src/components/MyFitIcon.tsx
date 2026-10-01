import { Ruler, Shirt } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { COLORS } from "../../constants/colors";

const RULER_OUTLINE_EXTRA_WIDTH = 5.5;

type MyFitIconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

export function MyFitIcon({
  color = COLORS.textPrimary,
  size = 24,
  strokeWidth = 3,
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
          },
        ]}
      >
        <View style={{ width: rulerSize, height: rulerSize }}>
          <Ruler
            color={COLORS.surface}
            fill={COLORS.surface}
            size={rulerSize}
            strokeWidth={strokeWidth + RULER_OUTLINE_EXTRA_WIDTH}
            style={StyleSheet.absoluteFill}
          />
          <Ruler color={color} size={rulerSize} strokeWidth={strokeWidth} />
        </View>
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
