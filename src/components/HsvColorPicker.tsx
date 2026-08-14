import Slider from '@react-native-community/slider';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../../constants/colors';
import { normalizeHex } from '../services/colorSearch';

type HsvColorPickerProps = {
  value: string;
  onChange: (hex: string) => void;
};

const TRACK_STEPS = 12;

export function HsvColorPicker({ value, onChange }: HsvColorPickerProps) {
  const hsv = useMemo(() => hexToHsv(normalizeHex(value) ?? '#3A5A40'), [value]);
  const hueColors = useMemo(
    () => Array.from({ length: TRACK_STEPS }, (_, index) => hsvToHex(index * 30, 1, 1)),
    [],
  );
  const saturationColors = useMemo(
    () =>
      Array.from({ length: TRACK_STEPS }, (_, index) =>
        hsvToHex(hsv.h, index / (TRACK_STEPS - 1), hsv.v),
      ),
    [hsv.h, hsv.v],
  );
  const brightnessColors = useMemo(
    () =>
      Array.from({ length: TRACK_STEPS }, (_, index) =>
        hsvToHex(hsv.h, hsv.s, index / (TRACK_STEPS - 1)),
      ),
    [hsv.h, hsv.s],
  );

  return (
    <View style={styles.container}>
      <View style={styles.previewRow}>
        <View style={[styles.preview, { backgroundColor: value }]} />
        <Text style={styles.hexValue}>{normalizeHex(value) ?? value}</Text>
      </View>
      <ColorSlider
        label="색상"
        value={hsv.h}
        maximumValue={360}
        colors={hueColors}
        onChange={(nextHue) => onChange(hsvToHex(nextHue, hsv.s, hsv.v))}
      />
      <ColorSlider
        label="채도"
        value={hsv.s}
        maximumValue={1}
        colors={saturationColors}
        onChange={(nextSaturation) => onChange(hsvToHex(hsv.h, nextSaturation, hsv.v))}
      />
      <ColorSlider
        label="밝기"
        value={hsv.v}
        maximumValue={1}
        colors={brightnessColors}
        onChange={(nextBrightness) => onChange(hsvToHex(hsv.h, hsv.s, nextBrightness))}
      />
    </View>
  );
}

type ColorSliderProps = {
  label: string;
  value: number;
  maximumValue: number;
  colors: string[];
  onChange: (value: number) => void;
};

function ColorSlider({ label, value, maximumValue, colors, onChange }: ColorSliderProps) {
  return (
    <View style={styles.sliderGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.sliderTrackFrame}>
        <View pointerEvents="none" style={styles.colorTrack}>
          {colors.map((color, index) => (
            <View key={`${label}-${index}`} style={[styles.trackSegment, { backgroundColor: color }]} />
          ))}
        </View>
        <Slider
          value={value}
          minimumValue={0}
          maximumValue={maximumValue}
          step={maximumValue === 360 ? 1 : 0.01}
          onValueChange={onChange}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor={COLORS.surface}
          style={styles.slider}
        />
      </View>
    </View>
  );
}

function hexToHsv(hex: string) {
  const intValue = Number.parseInt(hex.slice(1), 16);
  const r = ((intValue >> 16) & 255) / 255;
  const g = ((intValue >> 8) & 255) / 255;
  const b = (intValue & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let h = 0;

  if (delta > 0) {
    if (max === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (max === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }

  return {
    h: h < 0 ? h + 360 : h,
    s: max === 0 ? 0 : delta / max,
    v: max,
  };
}

function hsvToHex(h: number, s: number, v: number) {
  const normalizedHue = ((h % 360) + 360) % 360;
  const chroma = v * s;
  const hueSegment = normalizedHue / 60;
  const x = chroma * (1 - Math.abs((hueSegment % 2) - 1));
  const m = v - chroma;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hueSegment < 1) {
    r = chroma;
    g = x;
  } else if (hueSegment < 2) {
    r = x;
    g = chroma;
  } else if (hueSegment < 3) {
    g = chroma;
    b = x;
  } else if (hueSegment < 4) {
    g = x;
    b = chroma;
  } else if (hueSegment < 5) {
    r = x;
    b = chroma;
  } else {
    r = chroma;
    b = x;
  }

  return `#${[r, g, b]
    .map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0'))
    .join('')}`.toUpperCase();
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  previewRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  preview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  hexValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sliderGroup: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  sliderTrackFrame: {
    height: 44,
    justifyContent: 'center',
  },
  colorTrack: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  trackSegment: {
    flex: 1,
  },
  slider: {
    width: '100%',
    height: 44,
  },
});
