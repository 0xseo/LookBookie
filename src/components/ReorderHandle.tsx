import { GripVertical } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';

import { COLORS } from '../../constants/colors';

type ReorderHandleProps = {
  index: number;
  itemCount: number;
  rowHeight: number;
  disabled?: boolean;
  onMove: (targetIndex: number) => void;
  onDrop: () => void | Promise<void>;
};

const LONG_PRESS_DELAY = 320;

export function ReorderHandle({
  index,
  itemCount,
  rowHeight,
  disabled = false,
  onMove,
  onDrop,
}: ReorderHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggingRef = useRef(false);
  const startIndexRef = useRef(index);
  const indexRef = useRef(index);
  const itemCountRef = useRef(itemCount);
  const rowHeightRef = useRef(rowHeight);
  const disabledRef = useRef(disabled);
  const onMoveRef = useRef(onMove);
  const onDropRef = useRef(onDrop);

  indexRef.current = index;
  itemCountRef.current = itemCount;
  rowHeightRef.current = rowHeight;
  disabledRef.current = disabled;
  onMoveRef.current = onMove;
  onDropRef.current = onDrop;

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const finishDrag = () => {
    clearTimer();
    translateY.setValue(0);

    if (!isDraggingRef.current) {
      return;
    }

    isDraggingRef.current = false;
    setIsDragging(false);
    void onDropRef.current();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderGrant: () => {
          startIndexRef.current = indexRef.current;
          timerRef.current = setTimeout(() => {
            isDraggingRef.current = true;
            setIsDragging(true);
          }, LONG_PRESS_DELAY);
        },
        onPanResponderMove: (_, gestureState) => {
          if (!isDraggingRef.current) {
            return;
          }

          const targetIndex = clamp(
            Math.round(startIndexRef.current + gestureState.dy / rowHeightRef.current),
            0,
            itemCountRef.current - 1,
          );
          translateY.setValue(
            gestureState.dy - (targetIndex - startIndexRef.current) * rowHeightRef.current,
          );
          onMoveRef.current(targetIndex);
        },
        onPanResponderRelease: finishDrag,
        onPanResponderTerminate: finishDrag,
        onPanResponderTerminationRequest: () => false,
      }),
    [translateY],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="길게 눌러 순서 변경"
      style={[
        styles.handle,
        isDragging && styles.handleDragging,
        { transform: [{ translateY }, { scale: isDragging ? 1.06 : 1 }] },
      ]}
    >
      <GripVertical
        color={isDragging ? COLORS.primary : COLORS.textSecondary}
        size={20}
        strokeWidth={2.2}
      />
    </Animated.View>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  handle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    zIndex: 2,
  },
  handleDragging: {
    backgroundColor: COLORS.secondary,
  },
});
