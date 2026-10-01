import { Image, StyleSheet, View } from 'react-native';
import { COLORS } from '../../constants/colors';

type PreviewSticker = { id?: string; localImagePath?: string; remoteImageUrl?: string | null; x: number; y: number; size: number; rotation: number; zIndex: number; };
export function getOutfitPreviewLayout(stickers: PreviewSticker[], canvasWidth: number | null, canvasHeight: number | null, previewSize: number) {
  const bounds = stickers.reduce((result, sticker) => {
    const radians = sticker.rotation * Math.PI / 180;
    const extent = sticker.size * (Math.abs(Math.cos(radians)) + Math.abs(Math.sin(radians))) / 2;
    const cx = sticker.x + sticker.size / 2, cy = sticker.y + sticker.size / 2;
    return { minX: Math.min(result.minX, cx - extent), minY: Math.min(result.minY, cy - extent), maxX: Math.max(result.maxX, cx + extent), maxY: Math.max(result.maxY, cy + extent) };
  }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  if (canvasWidth && canvasHeight && (stickers.length === 0 || (bounds.minX >= -1 && bounds.minY >= -1 && bounds.maxX <= canvasWidth + 1 && bounds.maxY <= canvasHeight + 1))) {
    const scale = Math.min(previewSize / canvasWidth, previewSize / canvasHeight);
    return { minX: 0, minY: 0, offsetX: (previewSize - canvasWidth * scale) / 2, offsetY: (previewSize - canvasHeight * scale) / 2, scale };
  }
  if (!stickers.length) return { minX: 0, minY: 0, offsetX: 0, offsetY: 0, scale: 1 };
  const width = Math.max(1, bounds.maxX - bounds.minX), height = Math.max(1, bounds.maxY - bounds.minY);
  const inset = Math.min(12, previewSize * 0.08);
  const scale = Math.min((previewSize - inset * 2) / width, (previewSize - inset * 2) / height);
  return { minX: bounds.minX, minY: bounds.minY, offsetX: (previewSize - width * scale) / 2, offsetY: (previewSize - height * scale) / 2, scale };
}
export function OutfitPreviewCanvas({ stickers, canvasWidth, canvasHeight, previewSize }: { stickers: PreviewSticker[]; canvasWidth: number | null; canvasHeight: number | null; previewSize: number; }) {
  const layout = getOutfitPreviewLayout(stickers, canvasWidth, canvasHeight, previewSize);
  return <View style={{ width: previewSize, height: previewSize, backgroundColor: COLORS.canvasBg, overflow: 'hidden' }}>
    {stickers.slice().sort((a, b) => a.zIndex - b.zIndex).map((sticker, index) => {
      const uri = sticker.localImagePath || sticker.remoteImageUrl;
      return uri ? <Image key={sticker.id ?? index} source={{ uri }} style={[styles.image, { left: layout.offsetX + (sticker.x - layout.minX) * layout.scale, top: layout.offsetY + (sticker.y - layout.minY) * layout.scale, width: sticker.size * layout.scale, height: sticker.size * layout.scale, transform: [{ rotate: `${sticker.rotation}deg` }], zIndex: sticker.zIndex }]} /> : null;
    })}
  </View>;
}
const styles = StyleSheet.create({ image: { position: 'absolute', resizeMode: 'contain' } });
