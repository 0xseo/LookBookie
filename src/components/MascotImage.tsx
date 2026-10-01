import { Image, StyleSheet, View, type ImageSourcePropType } from "react-native";
import type { MascotFrame } from "../../constants/mascots";

export function MascotImage({
  source,
  size,
  frame,
}: {
  source: ImageSourcePropType;
  size: number;
  frame: MascotFrame;
}) {
  const asset = Image.resolveAssetSource(source);
  const displaySize = size * (frame.displayScale ?? 1);
  const matchesFrame = asset?.width === frame.imageWidth
    && asset?.height === frame.imageHeight
    && frame.width > 0 && frame.height > 0;
  const scale = displaySize / Math.max(frame.width, frame.height);
  const imageStyle = matchesFrame ? {
    position: "absolute" as const,
    width: frame.imageWidth * scale,
    height: frame.imageHeight * scale,
    left: (displaySize - frame.width * scale) / 2 - frame.x * scale,
    top: (displaySize - frame.height * scale) / 2 - frame.y * scale,
  } : { width: displaySize, height: displaySize };

  return (
    <View style={[styles.frame, { width: displaySize, height: displaySize }]}>
      <Image source={source} style={imageStyle} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: "hidden" },
});
