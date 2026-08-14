import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import { COLORS } from '../../constants/colors';
import { readImageAsDataUrl, saveEditedDataUrlImage } from '../storage/imageStorage';

type ImageEraserScreenProps = {
  imageUri: string;
  onCancel: () => void;
  onDone: (editedImageUri: string) => void;
};

type EditorMessage =
  | { type: 'ready' }
  | { type: 'export'; dataUrl: string }
  | { type: 'error'; message: string };

export function ImageEraserScreen({ imageUri, onCancel, onDone }: ImageEraserScreenProps) {
  const webViewRef = useRef<WebView>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [brushSize, setBrushSize] = useState(32);
  const [isReady, setIsReady] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function loadImage() {
      try {
        setImageDataUrl(await readImageAsDataUrl(imageUri));
      } catch (error) {
        Alert.alert(
          '편집기를 열지 못했어북',
          error instanceof Error ? error.message : '이미지를 읽지 못했어요.',
        );
        onCancel();
      }
    }

    loadImage();
  }, [imageUri, onCancel]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(`window.setBrushSize(${brushSize}); true;`);
  }, [brushSize]);

  const editorHtml = useMemo(() => {
    if (!imageDataUrl) {
      return '';
    }

    return buildEditorHtml(imageDataUrl, brushSize);
  }, [brushSize, imageDataUrl]);

  const handleMessage = (rawMessage: string) => {
    const message = JSON.parse(rawMessage) as EditorMessage;

    if (message.type === 'ready') {
      setIsReady(true);
      return;
    }

    if (message.type === 'error') {
      setIsExporting(false);
      Alert.alert('편집 오류가 났어북', message.message);
      return;
    }

    if (message.type === 'export') {
      try {
        const editedImageUri = saveEditedDataUrlImage(message.dataUrl);
        onDone(editedImageUri);
      } catch (error) {
        Alert.alert(
          '편집 저장에 실패했어북',
          error instanceof Error ? error.message : '알 수 없는 오류가 발생했어요.',
        );
      } finally {
        setIsExporting(false);
      }
    }
  };

  const resetCanvas = () => {
    webViewRef.current?.injectJavaScript('window.resetCanvas(); true;');
  };

  const exportCanvas = () => {
    setIsExporting(true);
    webViewRef.current?.injectJavaScript('window.exportCanvas(); true;');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={onCancel} style={styles.headerButton} hitSlop={8}>
          <Text style={styles.headerButtonText}>취소</Text>
        </Pressable>
        <Text style={styles.title}>배경 지우기</Text>
        <Pressable
          onPress={exportCanvas}
          disabled={!isReady || isExporting}
          style={[styles.saveButton, (!isReady || isExporting) && styles.disabledButton]}
          hitSlop={8}
        >
          {isExporting ? (
            <ActivityIndicator color={COLORS.surface} />
          ) : (
            <Text style={styles.saveButtonText}>적용</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.editorArea}>
        {editorHtml ? (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: editorHtml }}
            javaScriptEnabled
            scrollEnabled={false}
            bounces={false}
            style={styles.webView}
            onMessage={(event) => handleMessage(event.nativeEvent.data)}
          />
        ) : (
          <ActivityIndicator color={COLORS.primary} />
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.brushPreviewRow}>
          <View style={styles.brushPreviewFrame}>
            <View
              style={[
                styles.brushPreviewCircle,
                {
                  width: brushSize,
                  height: brushSize,
                  borderRadius: brushSize / 2,
                },
              ]}
            />
          </View>
          <View style={styles.brushTextGroup}>
            <Text style={styles.controlLabel}>브러시 크기</Text>
            <Text style={styles.controlCaption}>{brushSize}px</Text>
          </View>
          <Pressable onPress={resetCanvas} style={styles.resetButton} hitSlop={8}>
            <Text style={styles.resetButtonText}>Reset</Text>
          </Pressable>
        </View>
        <Slider
          value={brushSize}
          minimumValue={8}
          maximumValue={96}
          step={1}
          onValueChange={setBrushSize}
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.accent}
        />
      </View>
    </SafeAreaView>
  );
}

function buildEditorHtml(imageDataUrl: string, brushSize: number) {
  return `
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      overflow: hidden;
      touch-action: none;
      background-color: #F8F9FA;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #stage {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background-image:
        linear-gradient(45deg, #E9ECEF 25%, transparent 25%),
        linear-gradient(-45deg, #E9ECEF 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #E9ECEF 75%),
        linear-gradient(-45deg, transparent 75%, #E9ECEF 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0;
    }
    canvas {
      max-width: calc(100vw - 24px);
      max-height: calc(100vh - 24px);
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(26, 29, 30, 0.12);
      background: transparent;
      touch-action: none;
    }
    #brush {
      position: fixed;
      left: 0;
      top: 0;
      border: 2px solid #D4A373;
      background: rgba(212, 163, 115, 0.2);
      border-radius: 999px;
      pointer-events: none;
      transform: translate(-9999px, -9999px);
      z-index: 10;
    }
  </style>
</head>
<body>
  <div id="stage">
    <canvas id="canvas"></canvas>
    <div id="brush"></div>
  </div>
  <script>
    const imageDataUrl = ${JSON.stringify(imageDataUrl)};
    const canvas = document.getElementById('canvas');
    const brush = document.getElementById('brush');
    const ctx = canvas.getContext('2d');
    const image = new Image();
    let brushSize = ${brushSize};
    let drawing = false;
    let lastPoint = null;

    function post(message) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }

    function setPreviewSize() {
      const rect = canvas.getBoundingClientRect();
      const visualSize = Math.max(8, brushSize * (rect.width / canvas.width));
      brush.style.width = visualSize + 'px';
      brush.style.height = visualSize + 'px';
      brush.style.marginLeft = -(visualSize / 2) + 'px';
      brush.style.marginTop = -(visualSize / 2) + 'px';
    }

    function pointFromEvent(event) {
      const touch = event.touches ? event.touches[0] : event;
      const rect = canvas.getBoundingClientRect();
      return {
        x: (touch.clientX - rect.left) * (canvas.width / rect.width),
        y: (touch.clientY - rect.top) * (canvas.height / rect.height),
        clientX: touch.clientX,
        clientY: touch.clientY
      };
    }

    function moveBrush(point) {
      setPreviewSize();
      brush.style.transform = 'translate(' + point.clientX + 'px, ' + point.clientY + 'px)';
    }

    function eraseTo(point) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      ctx.beginPath();
      if (lastPoint) {
        ctx.moveTo(lastPoint.x, lastPoint.y);
      } else {
        ctx.moveTo(point.x, point.y);
      }
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(point.x, point.y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      lastPoint = point;
    }

    function start(event) {
      event.preventDefault();
      drawing = true;
      const point = pointFromEvent(event);
      moveBrush(point);
      eraseTo(point);
    }

    function move(event) {
      event.preventDefault();
      const point = pointFromEvent(event);
      moveBrush(point);
      if (drawing) {
        eraseTo(point);
      }
    }

    function end(event) {
      event.preventDefault();
      drawing = false;
      lastPoint = null;
    }

    window.setBrushSize = function(nextSize) {
      brushSize = nextSize;
      setPreviewSize();
    };

    window.resetCanvas = function() {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };

    window.exportCanvas = function() {
      try {
        post({ type: 'export', dataUrl: canvas.toDataURL('image/png') });
      } catch (error) {
        post({ type: 'error', message: error.message || 'export failed' });
      }
    };

    image.onload = function() {
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.style.aspectRatio = canvas.width + ' / ' + canvas.height;
      window.resetCanvas();
      setPreviewSize();
      post({ type: 'ready' });
    };

    image.onerror = function() {
      post({ type: 'error', message: '이미지를 캔버스에 올리지 못했어요.' });
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', end, { passive: false });
    canvas.addEventListener('touchcancel', end, { passive: false });
    image.src = imageDataUrl;
  </script>
</body>
</html>
`;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerButton: {
    minWidth: 60,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  saveButton: {
    minWidth: 64,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.surface,
  },
  disabledButton: {
    backgroundColor: COLORS.primaryLight,
  },
  editorArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  webView: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  controls: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    gap: 8,
  },
  brushPreviewRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  brushPreviewFrame: {
    width: 72,
    height: 72,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bubbleBg,
  },
  brushPreviewCircle: {
    borderWidth: 2,
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(212, 163, 115, 0.24)',
  },
  brushTextGroup: {
    flex: 1,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  controlCaption: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },
  resetButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
});
