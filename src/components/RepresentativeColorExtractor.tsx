import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

import { findNearestColorOption } from '../services/colorSearch';
import { readImageAsDataUrl } from '../storage/imageStorage';
import type { ColorOption } from '../types/clothing';

type RepresentativeColorExtractorProps = {
  imageUri: string | null;
  colorOptions: ColorOption[];
  enabled: boolean;
  onExtracted: (option: ColorOption, sourceHex: string) => void;
  onError?: (message: string) => void;
};

type ExtractorMessage =
  | { type: 'color'; hex: string }
  | { type: 'error'; message: string };

export function RepresentativeColorExtractor({
  imageUri,
  colorOptions,
  enabled,
  onExtracted,
  onError,
}: RepresentativeColorExtractorProps) {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadImage() {
      if (!imageUri || !enabled) {
        setImageDataUrl(null);
        return;
      }

      try {
        const dataUrl = await readImageAsDataUrl(imageUri);

        if (!cancelled) {
          setImageDataUrl(dataUrl);
        }
      } catch (error) {
        if (!cancelled) {
          onError?.(error instanceof Error ? error.message : '이미지 색상을 읽지 못했어요.');
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [enabled, imageUri]);

  const extractorHtml = useMemo(
    () => (imageDataUrl ? buildExtractorHtml(imageDataUrl) : ''),
    [imageDataUrl],
  );

  const handleMessage = (rawMessage: string) => {
    const message = JSON.parse(rawMessage) as ExtractorMessage;

    if (message.type === 'error') {
      onError?.(message.message);
      return;
    }

    const nearestOption = findNearestColorOption(message.hex, colorOptions);
    onExtracted(nearestOption, message.hex);
  };

  if (!extractorHtml) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.hidden}>
      <WebView
        originWhitelist={['*']}
        source={{ html: extractorHtml }}
        javaScriptEnabled
        scrollEnabled={false}
        bounces={false}
        onMessage={(event) => handleMessage(event.nativeEvent.data)}
        style={styles.webView}
      />
    </View>
  );
}

function buildExtractorHtml(imageDataUrl: string) {
  return `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body, canvas { margin: 0; width: 1px; height: 1px; overflow: hidden; }
    </style>
  </head>
  <body>
    <canvas id="canvas"></canvas>
    <script>
      const imageDataUrl = ${JSON.stringify(imageDataUrl)};
      const post = (message) => {
        window.ReactNativeWebView.postMessage(JSON.stringify(message));
      };

      const image = new Image();
      image.onload = () => {
        try {
          const maxSide = 180;
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.getElementById('canvas');
          const context = canvas.getContext('2d', { willReadFrequently: true });
          const buckets = new Map();

          canvas.width = width;
          canvas.height = height;
          context.clearRect(0, 0, width, height);
          context.drawImage(image, 0, 0, width, height);

          const pixels = context.getImageData(0, 0, width, height).data;

          for (let index = 0; index < pixels.length; index += 4) {
            const alpha = pixels[index + 3];

            if (alpha < 40) {
              continue;
            }

            const r = pixels[index];
            const g = pixels[index + 1];
            const b = pixels[index + 2];
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const saturation = max === 0 ? 0 : (max - min) / max;
            const weight = (alpha / 255) * (0.6 + saturation);
            const key = [r, g, b].map((value) => Math.round(value / 24) * 24).join(',');
            const current = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 };

            current.weight += weight;
            current.r += r * weight;
            current.g += g * weight;
            current.b += b * weight;
            buckets.set(key, current);
          }

          let winner = null;

          buckets.forEach((bucket) => {
            if (!winner || bucket.weight > winner.weight) {
              winner = bucket;
            }
          });

          if (!winner || winner.weight === 0) {
            post({ type: 'error', message: '대표색을 찾지 못했어요.' });
            return;
          }

          const r = Math.round(winner.r / winner.weight);
          const g = Math.round(winner.g / winner.weight);
          const b = Math.round(winner.b / winner.weight);
          const hex = '#' + [r, g, b]
            .map((value) => value.toString(16).padStart(2, '0'))
            .join('')
            .toUpperCase();

          post({ type: 'color', hex });
        } catch (error) {
          post({ type: 'error', message: error.message ?? '대표색 추출에 실패했어요.' });
        }
      };
      image.onerror = () => post({ type: 'error', message: '이미지를 불러오지 못했어요.' });
      image.src = imageDataUrl;
    </script>
  </body>
</html>`;
}

const styles = StyleSheet.create({
  hidden: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  webView: {
    width: 1,
    height: 1,
  },
});
