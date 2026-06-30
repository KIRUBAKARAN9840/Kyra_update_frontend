import React, { useCallback, useEffect, useRef } from "react";
import { ScrollView } from "react-native";
import {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  runOnJS,
  Easing as REasing,
} from "react-native-reanimated";
import ReAnimated from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { CARD_W, CARD_GAP, MARQUEE_SPEED } from "./constants";
import styles from "./homeStyles";

const MarqueeScroll = ({ children, itemCount }) => {
  const needsScroll = itemCount > 2;
  const setWidth = (CARD_W + CARD_GAP) * itemCount;
  const offset = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const resumeRef = useRef(null);

  const fullDur = (setWidth / MARQUEE_SPEED) * 1000;

  const startLoop = useCallback(() => {
    const cur = ((offset.value % setWidth) + setWidth) % setWidth;
    offset.value = cur;
    const remaining = setWidth - cur;
    const dur = (remaining / MARQUEE_SPEED) * 1000;
    offset.value = withSequence(
      withTiming(setWidth, { duration: dur, easing: REasing.linear }),
      withTiming(0, { duration: 0 }),
      withRepeat(
        withSequence(
          withTiming(setWidth, { duration: fullDur, easing: REasing.linear }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
        false,
      ),
    );
  }, [setWidth, fullDur]);

  const clearResume = useCallback(() => {
    if (resumeRef.current) clearTimeout(resumeRef.current);
  }, []);

  const scheduleResume = useCallback(() => {
    clearResume();
    resumeRef.current = setTimeout(() => startLoop(), 2000);
  }, [startLoop, clearResume]);

  const animStyle = useAnimatedStyle(() => {
    const v = ((offset.value % setWidth) + setWidth) % setWidth;
    return { transform: [{ translateX: -v }] };
  });

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      "worklet";
      cancelAnimation(offset);
      dragStart.value = offset.value;
      runOnJS(clearResume)();
    })
    .onUpdate((e) => {
      "worklet";
      offset.value = dragStart.value - e.translationX;
    })
    .onEnd(() => {
      "worklet";
      runOnJS(scheduleResume)();
    });

  useEffect(() => {
    if (!needsScroll) return;
    offset.value = 0;
    offset.value = withRepeat(
      withSequence(
        withTiming(setWidth, { duration: fullDur, easing: REasing.linear }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(offset);
      if (resumeRef.current) clearTimeout(resumeRef.current);
    };
  }, [needsScroll, setWidth, fullDur]);

  if (!needsScroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.marqueeRow}
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <GestureDetector gesture={pan}>
      <ReAnimated.View style={styles.marqueeContainer}>
        <ReAnimated.View style={[styles.marqueeRow, animStyle]}>
          {children}
          {React.Children.map(children, (child) =>
            React.cloneElement(child, { key: `dup_${child.key}` }),
          )}
        </ReAnimated.View>
      </ReAnimated.View>
    </GestureDetector>
  );
};

export default MarqueeScroll;
