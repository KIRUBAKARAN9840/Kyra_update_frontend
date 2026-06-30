import React, { useRef, useEffect, useCallback } from "react";
import { FlatList, ScrollView } from "react-native";
import { CARD_W, CARD_GAP } from "./constants";
import styles from "./homeStyles";

const SNAP_INTERVAL = CARD_W + CARD_GAP;
const AUTO_SCROLL_MS = 2500;
const CARDS_PER_SCROLL = 2;
// Repeat the list enough times so user can scroll far before we reset
const LOOP_COPIES = 100;

const AutoScrollCards = ({ children, itemCount }) => {
  const listRef = useRef(null);
  const indexRef = useRef(0);
  const timerRef = useRef(null);
  const touchActiveRef = useRef(false);

  const origItems = React.Children.toArray(children);

  // No scrolling needed for 2 or fewer cards
  if (itemCount <= 2) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        contentContainerStyle={styles.marqueeRow}
      >
        {children}
      </ScrollView>
    );
  }

  // Build a looped data array by repeating items
  const loopedItems = [];
  for (let c = 0; c < LOOP_COPIES; c++) {
    for (let i = 0; i < origItems.length; i++) {
      loopedItems.push({ element: origItems[i], loopKey: `${c}_${i}` });
    }
  }
  const totalLooped = loopedItems.length;
  // Start in the middle so user can also scroll backwards
  const middleStart = Math.floor(LOOP_COPIES / 2) * itemCount;

  const startAutoScroll = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (touchActiveRef.current) return;

      indexRef.current += CARDS_PER_SCROLL;
      // If we're getting near the end, silently jump back to middle
      if (indexRef.current >= totalLooped - itemCount) {
        const posInSet = indexRef.current % itemCount;
        indexRef.current = middleStart + posInSet;
        listRef.current?.scrollToOffset({
          offset: indexRef.current * SNAP_INTERVAL,
          animated: false,
        });
      }
      listRef.current?.scrollToOffset({
        offset: indexRef.current * SNAP_INTERVAL,
        animated: true,
      });
    }, AUTO_SCROLL_MS);
  }, [itemCount, totalLooped, middleStart]);

  useEffect(() => {
    // Start from the middle
    indexRef.current = middleStart;
    // Use setTimeout so FlatList has rendered before we scrollToOffset
    const t = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: middleStart * SNAP_INTERVAL,
        animated: false,
      });
    }, 50);
    startAutoScroll();
    return () => {
      clearTimeout(t);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startAutoScroll, middleStart]);

  const onScrollBeginDrag = useCallback(() => {
    touchActiveRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const onScrollEndDrag = useCallback(() => {
    touchActiveRef.current = false;
    startAutoScroll();
  }, [startAutoScroll]);

  const onMomentumScrollEnd = useCallback((e) => {
    const x = e.nativeEvent.contentOffset.x;
    indexRef.current = Math.round(x / SNAP_INTERVAL);
  }, []);

  const renderItem = useCallback(({ item }) => item.element, []);
  const keyExtractor = useCallback((item) => item.loopKey, []);
  const getItemLayout = useCallback(
    (_, index) => ({
      length: SNAP_INTERVAL,
      offset: SNAP_INTERVAL * index,
      index,
    }),
    [],
  );

  return (
    <FlatList
      ref={listRef}
      data={loopedItems}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={SNAP_INTERVAL}
      decelerationRate="fast"
      contentContainerStyle={styles.marqueeRow}
      onScrollBeginDrag={onScrollBeginDrag}
      onScrollEndDrag={onScrollEndDrag}
      onMomentumScrollEnd={onMomentumScrollEnd}
      removeClippedSubviews
      initialScrollIndex={middleStart}
    />
  );
};

export default React.memo(AutoScrollCards);
